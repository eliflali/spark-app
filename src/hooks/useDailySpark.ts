import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailySpark {
    id: string;
    question_text: string;
    category: string;
    release_date: string;
}

export interface SparkAnswer {
    user_id: string;
    answer_text: string;
    created_at: string;
}

/**
 * pending  – neither partner has answered yet (or no spark today)
 * waiting  – current user answered, partner hasn't yet
 * revealed – both partners answered; both answers are shown
 */
export type SparkState = 'pending' | 'waiting' | 'revealed';

export interface UseDailySparkReturn {
    spark: DailySpark | null;
    myAnswer: SparkAnswer | null;
    partnerAnswer: SparkAnswer | null;
    sparkState: SparkState;
    loading: boolean;
    submitting: boolean;
    submitAnswer: (text: string) => Promise<void>;
    partnerId: string | null;
    error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in the device's local timezone. */
function localDateString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDailySpark(): UseDailySparkReturn {
    const { user } = useAuth();

    const [spark, setSpark] = useState<DailySpark | null>(null);
    const [myAnswer, setMyAnswer] = useState<SparkAnswer | null>(null);
    const [partnerAnswer, setPartnerAnswer] = useState<SparkAnswer | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [spaceId, setSpaceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Keep spark id in a ref so the Realtime callback always sees the latest value
    const sparkIdRef = useRef<string | null>(null);
    // Keep spaceId in ref for use inside Realtime callbacks
    const spaceIdRef = useRef<string | null>(null);

    // ── Load profile + partner info ────────────────────────────────────────────
    const loadProfile = useCallback(async (): Promise<{ spaceId: string | null; partnerId: string | null }> => {
        if (!user) return { spaceId: null, partnerId: null };
        const { data, error: e } = await supabase
            .from('profiles')
            .select('partner_id, space_id')
            .eq('id', user.id)
            .single();
        if (e) {
            console.error('[useDailySpark] loadProfile error:', e.message);
            return { spaceId: null, partnerId: null };
        }
        const sid = data?.space_id ?? null;
        const pid = data?.partner_id ?? null;
        setPartnerId(pid);
        setSpaceId(sid);
        spaceIdRef.current = sid;
        return { spaceId: sid, partnerId: pid };
    }, [user]);

    // ── Fetch today's spark ────────────────────────────────────────────────────
    const loadSpark = useCallback(async (): Promise<string | null> => {
        const today = localDateString();
        const { data, error: e } = await supabase
            .from('daily_sparks')
            .select('id, question_text, category, release_date')
            .eq('release_date', today)
            .maybeSingle();
        if (e) {
            console.error('[useDailySpark] loadSpark error:', e.message);
            return null;
        }
        if (data) {
            setSpark(data as DailySpark);
            sparkIdRef.current = data.id;
            return data.id;
        }
        console.warn('[useDailySpark] No spark found for today:', today);
        return null;
    }, []);

    // ── Load answers via direct query (fallback when RPC isn't set up) ─────────
    const loadAnswers = useCallback(async (sid: string | null = sparkIdRef.current) => {
        if (!sid || !user) return;

        // Try the privacy RPC first
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_spark_answers', {
            p_spark_id: sid,
        });

        if (!rpcError) {
            const rows = (rpcData ?? []) as SparkAnswer[];
            setMyAnswer(rows.find((r) => r.user_id === user.id) ?? null);
            setPartnerAnswer(rows.find((r) => r.user_id !== user.id) ?? null);
            return;
        }

        // RPC not found or failed — fall back to direct select
        console.warn('[useDailySpark] get_spark_answers RPC error, using direct query:', rpcError.message);
        const { data: directData, error: directError } = await supabase
            .from('daily_answers')
            .select('user_id, answer_text, created_at')
            .eq('spark_id', sid)
            .eq('user_id', user.id); // only own answer - privacy safe without RPC

        if (directError) {
            console.error('[useDailySpark] loadAnswers direct error:', directError.message);
            return;
        }
        const rows = (directData ?? []) as SparkAnswer[];
        setMyAnswer(rows.find((r) => r.user_id === user.id) ?? null);
        // Partner answer stays hidden until RPC is available
    }, [user]);

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { spaceId: sid } = await loadProfile();
                const sparkId = await loadSpark();
                if (sparkId) {
                    await loadAnswers(sparkId);
                }
                if (!cancelled) {
                    if (!sparkId) {
                        setError('No Daily Spark found for today. Check back tomorrow!');
                    }
                }
            } catch (e: any) {
                console.error('[useDailySpark] init error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    // ── Realtime subscription ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !spaceId) return;

        const channel = supabase
            .channel(`daily_answers:couple_id=eq.${spaceId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'daily_answers',
                    filter: `couple_id=eq.${spaceId}`,
                },
                (_payload) => {
                    loadAnswers();
                }
            )
            .subscribe((status) => {
                console.log('[useDailySpark] Realtime status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, spaceId, loadAnswers]);

    // ── Submit answer ──────────────────────────────────────────────────────────
    const submitAnswer = useCallback(
        async (text: string) => {
            if (!user) {
                console.warn('[useDailySpark] submitAnswer: no user');
                return;
            }
            if (!spark) {
                console.warn('[useDailySpark] submitAnswer: no spark loaded');
                return;
            }
            if (submitting) return;

            // Use ref as fallback if state hasn't updated yet
            const sid = spaceId ?? spaceIdRef.current;

            setSubmitting(true);
            setError(null);
            try {
                const payload: Record<string, string> = {
                    spark_id: spark.id,
                    user_id: user.id,
                    answer_text: text.trim(),
                };

                // Only add couple_id if we have it (RLS may enforce it server-side anyway)
                if (sid) payload.couple_id = sid;

                console.log('[useDailySpark] inserting answer:', JSON.stringify(payload));

                const { error: insertError } = await supabase
                    .from('daily_answers')
                    .insert(payload);

                if (insertError) {
                    console.error('[useDailySpark] submitAnswer insert error:', insertError.message, insertError.details, insertError.hint);
                    setError(`Failed to save: ${insertError.message}`);
                    return;
                }

                console.log('[useDailySpark] answer saved successfully!');
                // Re-fetch answers — now the RPC will return partner answer if they've answered
                await loadAnswers(spark.id);
            } catch (e: any) {
                console.error('[useDailySpark] submitAnswer exception:', e);
                setError('Unexpected error saving your answer.');
            } finally {
                setSubmitting(false);
            }
        },
        [user, spark, spaceId, submitting, loadAnswers]
    );

    // ── Derive state ──────────────────────────────────────────────────────────
    let sparkState: SparkState = 'pending';
    if (myAnswer && partnerAnswer) {
        sparkState = 'revealed';
    } else if (myAnswer && !partnerAnswer) {
        sparkState = 'waiting';
    }

    return {
        spark,
        myAnswer,
        partnerAnswer,
        sparkState,
        loading,
        submitting,
        submitAnswer,
        partnerId,
        error,
    };
}
