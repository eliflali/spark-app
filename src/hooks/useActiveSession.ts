import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveSession {
    id: string;
    template_id: string;
    space_id: string;
    initiator_id: string;
    partner_id: string | null;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    current_step: number;
    last_interaction_at: string;
}

interface UseActiveSessionReturn {
    /** A pending invite where the current user is the *receiver* (partner_id = me) */
    incomingSession: ActiveSession | null;
    /** The active session the current user is participating in (either role) */
    myActiveSession: ActiveSession | null;
    /** User A calls this to create a pending invitation */
    startSession: (templateId: string, spaceId: string) => Promise<string | null>;
    /** User B calls this to accept the invite → status becomes 'active' */
    acceptSession: (sessionId: string) => Promise<void>;
    /** Either user calls this to cancel */
    cancelSession: (sessionId: string) => Promise<void>;
    /** Update current step and last_interaction_at */
    advanceStep: (sessionId: string, step: number) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useActiveSession(): UseActiveSessionReturn {
    const { user } = useAuth();
    const [incomingSession, setIncomingSession] = useState<ActiveSession | null>(null);
    const [myActiveSession, setMyActiveSession] = useState<ActiveSession | null>(null);

    // Track the user's space_id so we can scope the Realtime subscription
    const spaceIdRef = useRef<string | null>(null);

    // ── Initial fetch ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!user) return;

        let channelRef: ReturnType<typeof supabase.channel> | null = null;

        const init = async () => {
            // 1. Get our space_id from the profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('space_id')
                .eq('id', user.id)
                .single();

            const spaceId = profile?.space_id ?? null;
            spaceIdRef.current = spaceId;

            if (!spaceId) return; // No partner linked yet

            // 2. One-time fetch for any existing live sessions
            await fetchLiveSessions(spaceId);

            // 3. Subscribe to Realtime changes for this space's date_sessions
            channelRef = supabase
                .channel(`date_sessions:space:${spaceId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'date_sessions',
                        filter: `space_id=eq.${spaceId}`,
                    },
                    () => {
                        // Re-fetch on any change to get fresh data
                        fetchLiveSessions(spaceId);
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            channelRef?.unsubscribe();
        };
    }, [user?.id]);

    // ── Live session fetcher ─────────────────────────────────────────────────────

    const fetchLiveSessions = useCallback(async (spaceId: string) => {
        if (!user) return;

        const { data: sessions, error } = await supabase
            .from('date_sessions')
            .select('*')
            .eq('space_id', spaceId)
            .in('status', ['pending', 'active'])
            .order('last_interaction_at', { ascending: false });

        if (error) {
            console.warn('[useActiveSession] fetchLiveSessions error:', error.message);
            return;
        }

        const pending = sessions?.find(
            (s) => s.status === 'pending' && s.partner_id === user.id
        ) ?? null;

        const active = sessions?.find(
            (s) =>
                s.status === 'active' &&
                (s.initiator_id === user.id || s.partner_id === user.id)
        ) ?? null;

        setIncomingSession(pending);
        setMyActiveSession(active);
    }, [user?.id]);

    // ── API helpers ──────────────────────────────────────────────────────────────

    /**
     * User A: creates a pending date_session row.
     * If there is already a pending/active session for this template in the space,
     * we return the existing session ID rather than creating a duplicate.
     */
    const startSession = useCallback(async (
        templateId: string,
        spaceId: string
    ): Promise<string | null> => {
        if (!user) return null;

        // Get partner_id from the shared space
        const { data: partners } = await supabase
            .from('profiles')
            .select('id')
            .eq('space_id', spaceId)
            .neq('id', user.id)
            .maybeSingle();

        const partnerId = partners?.id ?? null;

        // Check for existing live session for this template
        const { data: existing } = await supabase
            .from('date_sessions')
            .select('id, status')
            .eq('space_id', spaceId)
            .eq('template_id', templateId)
            .in('status', ['pending', 'active'])
            .maybeSingle();

        if (existing) return existing.id;

        // Create new pending session
        const { data: created, error } = await supabase
            .from('date_sessions')
            .insert({
                space_id: spaceId,
                template_id: templateId,
                initiator_id: user.id,
                partner_id: partnerId,
                status: 'pending',
                current_step: 0,
                last_interaction_at: new Date().toISOString(),
                is_completed: false,
            })
            .select('id')
            .single();

        if (error) {
            console.warn('[useActiveSession] startSession error:', error.message);
            return null;
        }

        return created?.id ?? null;
    }, [user?.id]);

    /**
     * User B: accept the invite → status becomes 'active'
     */
    const acceptSession = useCallback(async (sessionId: string): Promise<void> => {
        const { error } = await supabase
            .from('date_sessions')
            .update({
                status: 'active',
                last_interaction_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

        if (error) {
            console.warn('[useActiveSession] acceptSession error:', error.message);
        }
    }, []);

    /**
     * Either user: cancel the session.
     */
    const cancelSession = useCallback(async (sessionId: string): Promise<void> => {
        const { error } = await supabase
            .from('date_sessions')
            .update({
                status: 'cancelled',
                last_interaction_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

        if (error) {
            console.warn('[useActiveSession] cancelSession error:', error.message);
        }
    }, []);

    /**
     * Either user: advance the current_step counter (used for Deep Dive sync).
     */
    const advanceStep = useCallback(async (
        sessionId: string,
        step: number
    ): Promise<void> => {
        const { error } = await supabase
            .from('date_sessions')
            .update({
                current_step: step,
                last_interaction_at: new Date().toISOString(),
            })
            .eq('id', sessionId);

        if (error) {
            console.warn('[useActiveSession] advanceStep error:', error.message);
        }
    }, []);

    return {
        incomingSession,
        myActiveSession,
        startSession,
        acceptSession,
        cancelSession,
        advanceStep,
    };
}
