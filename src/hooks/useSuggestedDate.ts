import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SuggestedDate {
    id: string;
    space_id: string;
    suggested_activity_id: string;
    expires_at: string;
    created_at: string;
    vibe_data: any;
}

interface UseSuggestedDateReturn {
    /** The active suggested date for today, if one exists */
    suggestedDate: SuggestedDate | null;
    /** User calls this to generate and insert a new suggested date */
    createSuggestion: (activityId: string, vibeData: any, spaceId: string) => Promise<SuggestedDate | null>;
    /** Re-fetch explicitly if needed */
    fetchSuggestion: (spaceId: string) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSuggestedDate(): UseSuggestedDateReturn {
    const { user } = useAuth();
    const [suggestedDate, setSuggestedDate] = useState<SuggestedDate | null>(null);

    // ── Initial fetch & Realtime ──────────────────────────────────────────────────

    const fetchSuggestion = useCallback(async (spaceId: string) => {
        if (!user || !spaceId) return;

        // Current time in ISO format for comparison
        const now = new Date().toISOString();

        const { data: suggestion, error } = await supabase
            .from('suggested_dates')
            .select('*')
            .eq('space_id', spaceId)
            .gt('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[useSuggestedDate] fetchSuggestion error:', error.message);
            return;
        }

        setSuggestedDate(suggestion);
    }, [user?.id]);

    useEffect(() => {
        if (!user) return;

        let channelRef: ReturnType<typeof supabase.channel> | null = null;
        let activeSpaceId: string | null = null;

        const init = async () => {
            // 1. Get our space_id from the profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('space_id')
                .eq('id', user.id)
                .single();

            const spaceId = profile?.space_id ?? null;
            activeSpaceId = spaceId;

            if (!spaceId) return; // No space linked yet

            // 2. One-time fetch for any valid suggestion
            await fetchSuggestion(spaceId);

            // 3. Subscribe to Realtime changes for this space's suggested_dates
            channelRef = supabase
                .channel(`suggested_dates:space:${spaceId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'suggested_dates',
                        filter: `space_id=eq.${spaceId}`,
                    },
                    (payload) => {
                        // Re-fetch on any change so we respect the expires_at logic easily
                        fetchSuggestion(spaceId);
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            channelRef?.unsubscribe();
        };
    }, [user?.id, fetchSuggestion]);

    // ── API helpers ──────────────────────────────────────────────────────────────

    /**
     * Creates a new suggested_dates row for the space.
     * Expires at 23:59:59 of the current day.
     */
    const createSuggestion = useCallback(async (
        activityId: string,
        vibeData: any,
        spaceId: string
    ): Promise<SuggestedDate | null> => {
        if (!user || !spaceId) return null;

        // Calculate midnight (end of today)
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: created, error } = await supabase
            .from('suggested_dates')
            .insert({
                space_id: spaceId,
                suggested_activity_id: activityId,
                vibe_data: vibeData,
                expires_at: endOfDay.toISOString(),
            })
            .select('*')
            .single();

        if (error) {
            console.warn('[useSuggestedDate] createSuggestion error:', error.message);
            return null;
        }

        // Immediately set state without waiting for Realtime sync, for faster UI response
        setSuggestedDate(created);

        return created;
    }, [user?.id]);

    return {
        suggestedDate,
        createSuggestion,
        fetchSuggestion,
    };
}
