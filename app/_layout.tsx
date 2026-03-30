import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { RevenueCatProvider } from '@/src/context/RevenueCatContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { ONBOARDING_KEY } from '@/src/lib/constants';
import { useScheduledNotifications } from '@/src/hooks/useScheduledNotifications';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';
import '../global.css';
import Constants from 'expo-constants';

async function registerForPushNotifications(userId) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // GET THE EXPO TOKEN (This works for both iOS and Android)
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  });
  const expoToken = tokenData.data;

  console.log("Expo Token:", expoToken); // Should look like ExponentPushToken[...]

  // Save this to Supabase
  await supabase
    .from('profiles')
    .update({ fcm_token: expoToken })
    .eq('id', userId);
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
        await registerForPushNotifications(session.user.id);
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
