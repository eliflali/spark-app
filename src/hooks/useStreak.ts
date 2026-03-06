import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { AppState, AppStateStatus } from 'react-native';

export function useStreak() {
    const { user } = useAuth();
    const [streak, setStreak] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchStreak = useCallback(async () => {
        if (!user) {
            setStreak(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_current_streak');

            if (error) {
                console.error('Error fetching streak:', error);
            } else if (data !== null) {
                setStreak(data as number);
            }
        } catch (err) {
            console.error('Unexpected error fetching streak:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Initial fetch when user logs in
    useEffect(() => {
        fetchStreak();
    }, [fetchStreak]);

    // Refetch when app comes to foreground (in case a day changes or widget updates)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                fetchStreak();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [fetchStreak]);

    return {
        streak,
        isLoading,
        refetch: fetchStreak,
    };
}
