import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { RevenueCatProvider } from '@/src/context/RevenueCatContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/src/lib/supabase';
import { ONBOARDING_KEY } from '@/src/lib/constants';
import messaging from '@react-native-firebase/messaging';
import { useScheduledNotifications } from '@/src/hooks/useScheduledNotifications';

import '../global.css';

// ── FCM Token Registration ────────────────────────────────────────────────────
// Requests notification permission (iOS) and saves the device's FCM token
// to profiles.fcm_token so the Edge Function can send push notifications.

async function registerFcmToken(userId: string) {
  try {
    // iOS: request notification permission
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const allowed =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!allowed) {
        console.warn('[FCM] Notification permission denied');
        return;
      }
    }

    const token = await messaging().getToken();
    if (!token) {
      console.warn('[FCM] getToken returned empty');
      return;
    }

    await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', userId);

    console.log('[FCM] Token registered for user', userId, '→', token.slice(0, 20) + '...');
  } catch (err) {
    // Firebase messaging not available in Expo Go — silently skip
    console.warn('[FCM] Could not register token:', err);
  }
}

// ── Route Guard ───────────────────────────────────────────────────────────────

function RouteGuard() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  // null = not yet fetched, false = no partner, true = has partner
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);

  // Schedule local daily notifications once user is signed in
  useScheduledNotifications();

  // Load onboarding flag once
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((val) => {
      setHasOnboarded(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  // ── Register FCM token whenever a session is established ────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        await registerFcmToken(session.user.id);
        // Keep token fresh if Firebase rotates it
        unsubscribe = messaging().onTokenRefresh((newToken) => {
          supabase
            .from('profiles')
            .update({ fcm_token: newToken })
            .eq('id', session.user.id)
            .then(() => console.log('[FCM] Token refreshed'));
        });
      } catch (err) {
        console.warn('[FCM] Firebase not ready:', err);
      }
    })();
    return () => unsubscribe?.();
  }, [session?.user?.id]);

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
      if (hasPartner === null) return;

      if (!hasPartner) {
        router.replace('/(auth)/invite-partner');
      } else {
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
