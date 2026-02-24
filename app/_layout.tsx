import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { RevenueCatProvider } from '@/src/context/RevenueCatContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { ONBOARDING_KEY } from './(auth)/paywall';

import '../global.css';

function RouteGuard() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  // Load onboarding flag once
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((val) => {
      setHasOnboarded(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in → send to home
      router.replace('/(root)/home');
    } else if (!session && !inAuthGroup) {
      // Not signed in → onboarding if first time, else login
      //CHANGE WHEN ON PRODUCTION!!
      //router.replace(hasOnboarded ? '/(auth)/login' : '/(auth)/onboarding');
      console.log('hasOnboarded', hasOnboarded);
      router.replace('/(auth)/onboarding');
    }
  }, [session, loading, segments, onboardingChecked, hasOnboarded]);

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

