import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { RevenueCatProvider } from '@/src/context/RevenueCatContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/src/lib/supabase';
import { ONBOARDING_KEY } from '@/src/lib/constants';

import '../global.css';

function RouteGuard() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  // null = not yet fetched, false = no partner, true = has partner
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);

  // Load onboarding flag once
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((val) => {
      setHasOnboarded(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  // Check partner status whenever session changes
  useEffect(() => {
    if (!session?.user?.id) {
      setHasPartner(null);
      return;
    }
    supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setHasPartner(data?.partner_id != null);
      });
  }, [session]);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inRootGroup = segments[0] === '(root)';
    const isInvitePartner = (segments as string[])[1] === 'invite-partner';
    const isPaywall = (segments as string[])[1] === 'paywall';

    if (session && !inRootGroup && !isInvitePartner && !isPaywall) {
      // Signed in and not in app area yet.
      // If we haven't fetched partner status yet, wait before routing.
      if (hasPartner === null) return;

      if (!hasPartner) {
        // User is logged in but has no partner → show invite screen
        router.replace('/(auth)/invite-partner');
      } else {
        // User is fully set up → go home
        router.replace('/(root)/home');
      }
    } else if (!session && !inAuthGroup) {
      router.replace(hasOnboarded ? '/(auth)/login' : '/(auth)/onboarding');
    }
  }, [session, loading, segments, onboardingChecked, hasOnboarded, hasPartner]);

  return <Slot />;
}


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RevenueCatProvider>
            <RouteGuard />
          </RevenueCatProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
