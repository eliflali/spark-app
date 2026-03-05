import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// Import Guided Dates to map template_id -> title
import GUIDED_DATES from '@/assets/guided-dates/guided-dates.json';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MemoryType = 'spark' | 'photo' | 'date';

export interface Memory {
    id: string; // mapped from memory_id
    type: MemoryType;
    date: Date;
    title: string;
    preview: string;
    emoji: string;
    color: string;
}

interface UseMemoriesReturn {
    memories: Memory[];
    isLoading: boolean;
    refetch: () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMemories(): UseMemoriesReturn {
    const { user } = useAuth();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const spaceIdRef = useRef<string | null>(null);

    // ── Mapping Helper ────────────────────────────────────────────────────────────

    const processMemories = useCallback((rawRecords: any[]): Memory[] => {
        return rawRecords.map(r => {
            let title = r.title;

            // If it's a date session, the "title" from RPC is actually the template_id (e.g., "1")
            // We need to look it up in guided-dates.json
            if (r.memory_type === 'date') {
                let template: any = null;
                for (const category of GUIDED_DATES.guided_dates) {
                    const found = category.activities.find((a: any) => a.id === r.title);
                    if (found) {
                        template = found;
                        break;
                    }
                }

                if (template) {
                    title = template.title;
                } else {
                    title = 'Guided Date'; // Fallback
                }
            }

            return {
                id: r.memory_id,
                type: r.memory_type as MemoryType,
                date: new Date(r.created_at),
                title,
                preview: r.preview,
                emoji: r.emoji,
                color: r.color
            };
        });
    }, []);

    // ── Fetching ──────────────────────────────────────────────────────────────────

    const fetchMemories = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase.rpc('get_couple_memories', { p_limit: 50 });

            if (error) {
                console.warn('[useMemories] fetch error:', error.message);
                return;
            }

            if (data) {
                setMemories(processMemories(data));
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, processMemories]);

    // ── Initial fetch & Realtime Subscribe ────────────────────────────────────────

    useEffect(() => {
        if (!user) return;

        let sparksChannel: ReturnType<typeof supabase.channel> | null = null;
        let sessionsChannel: ReturnType<typeof supabase.channel> | null = null;
        let surprisesChannel: ReturnType<typeof supabase.channel> | null = null;

        const init = async () => {
            // 1. Get our space_id from the profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('space_id')
                .eq('id', user.id)
                .single();

            const spaceId = profile?.space_id ?? null;
            spaceIdRef.current = spaceId;

            if (!spaceId) {
                setIsLoading(false);
                return;
            } // No partner linked yet

            // 2. Fetch initial data
            await fetchMemories();

            // 3. Subscribe to Realtime changes for all 3 tables for this space

            sparksChannel = supabase
                .channel(`memories:sparks:${spaceId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'daily_answers', filter: `couple_id=eq.${spaceId}` },
                    () => fetchMemories()
                )
                .subscribe();

            sessionsChannel = supabase
                .channel(`memories:sessions:${spaceId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'date_sessions', filter: `space_id=eq.${spaceId}` },
                    () => fetchMemories()
                )
                .subscribe();

            surprisesChannel = supabase
                .channel(`memories:surprises:${spaceId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'widget_surprises', filter: `couple_id=eq.${spaceId}` },
                    () => fetchMemories()
                )
                .subscribe();
        };

        init();

        return () => {
            sparksChannel?.unsubscribe();
            sessionsChannel?.unsubscribe();
            surprisesChannel?.unsubscribe();
        };
    }, [user?.id, fetchMemories]);

    return {
        memories,
        isLoading,
        refetch: fetchMemories
    };
}
