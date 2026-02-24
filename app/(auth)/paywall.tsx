import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchasesPackage } from 'react-native-purchases';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useRevenueCat } from '@/src/context/RevenueCatContext';

export const ONBOARDING_KEY = 'spark.hasCompletedOnboarding';

const FEATURES = [
  { icon: '💡', label: 'Deepen your bond — science-backed daily questions.' },
  { icon: '🎨', label: 'Stay playful — weekly mini-adventures for couples.' },
  { icon: '🌱', label: 'Guided growth — expert-led intimacy exercises.' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offering, loading, purchasePackage, restorePurchases, isPremium } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Button Shimmer Animation
  const shimmerOpacity = useSharedValue(0.4);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // If the user somehow already is premium, boot them out
  if (isPremium) {
    router.replace('/(root)/home');
    return null;
  }

  // The first package in the Main Offering (monthly)
  const pkg: PurchasesPackage | undefined = offering?.availablePackages[0];

  const priceString = pkg?.product.priceString ?? '$14.99';
  const periodLabel = pkg?.product.subscriptionPeriod === 'P1M' ? '/month' : '';

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!pkg) {
      Alert.alert('Not available', 'Could not load subscription. Please try again.');
      return;
    }
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      router.replace('/(root)/home');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      router.replace('/(root)/home');
    } else {
      Alert.alert('No purchases found', 'We couldn\'t find a previous subscription for this account.');
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-midnight items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="text-slate-muted text-sm mt-4">Curating your experience…</Text>
      </View>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      {/* Cinematic Background */}
      <View className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
        <ImageBackground
          source={require('../../assets/onboarding-images/hugging-couple.png')}
          style={{ flex: 1 }}
          resizeMode="cover"
          blurRadius={10} // Adjusted blur for warm, candle-lit premium feel
        >
          <LinearGradient
            colors={['rgba(15,23,42,0.4)', 'rgba(15,23,42,0.8)', '#0F172A']}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </ImageBackground>
      </View>

      {/* Top bar */}
      <View className="flex-row justify-between items-center px-6 pt-16 pb-2 z-10">
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text className="text-glacier text-sm font-medium tracking-wide uppercase">Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={restoring} hitSlop={12}>
          <Text className="text-glacier text-sm font-medium tracking-wide uppercase">
            {restoring ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Trial Badge */}
        <View className="items-center mb-6">
          <View className="px-5 py-1.5 rounded-full bg-spark/10 border border-spark">
            <Text className="text-spark font-bold text-xs uppercase tracking-widest">
              7-Day Free Trial
            </Text>
          </View>
        </View>

        {/* Hero Hook */}
        <View className="items-center mb-10">
          <Text
            className="text-glacier text-4xl font-bold mt-2 text-center"
            style={{ letterSpacing: -1, lineHeight: 44 }}
          >
            Keep the <Text className="text-spark">spark</Text> alive.
          </Text>
          <Text className="text-white/60 text-base mt-3 text-center px-4 leading-6">
            Less than the cost of one coffee date per month.
          </Text>
        </View>

        {/* Refined Feature List with Glassmorphism */}
        <BlurView
          tint="dark"
          intensity={60}
          className="rounded-3xl border border-white/10 p-6 mb-10 gap-6 overflow-hidden bg-white/5"
        >
          {FEATURES.map((f, i) => (
            <View key={i} className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center border border-white/10">
                <Text style={{ fontSize: 18 }}>{f.icon}</Text>
              </View>
              <Text className="text-glacier text-base font-medium flex-1 leading-7">{f.label}</Text>
            </View>
          ))}
        </BlurView>

        {/* How Trial Works (Horizontal Trust Factor) */}
        <View className="mb-10 px-2">
          <Text className="text-white/50 text-xs font-bold uppercase tracking-widest mb-5 text-center">
            How your trial works
          </Text>
          <View className="flex-row justify-between items-start">
            <View className="items-center flex-1">
              <Text style={{ fontSize: 24 }} className="mb-2">🔓</Text>
              <Text className="text-white font-medium text-sm">Today</Text>
              <Text className="text-white/50 text-[10px] text-center mt-1 leading-4">Unlock everything{'\n'}for $0</Text>
            </View>
            <View className="w-[1px] h-10 bg-white/10 mt-2" />
            <View className="items-center flex-1">
              <Text style={{ fontSize: 24 }} className="mb-2">🔔</Text>
              <Text className="text-white font-medium text-sm">Day 5</Text>
              <Text className="text-white/50 text-[10px] text-center mt-1 leading-4">We'll send a{'\n'}reminder</Text>
            </View>
            <View className="w-[1px] h-10 bg-white/10 mt-2" />
            <View className="items-center flex-1">
              <Text style={{ fontSize: 24 }} className="mb-2">✨</Text>
              <Text className="text-white font-medium text-sm">Day 7</Text>
              <Text className="text-white/50 text-[10px] text-center mt-1 leading-4">Cancel anytime{'\n'}before</Text>
            </View>
          </View>
        </View>

        {/* Shimmering Subscribe CTA */}
        <View className="mb-5">
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={purchasing || !pkg}
            activeOpacity={0.8}
            className="rounded-3xl py-4 items-center justify-center overflow-hidden relative"
            style={{
              backgroundColor: purchasing ? '#92400e' : '#F59E0B',
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              minHeight: 68,
            }}
          >
            {/* Animated Shimmer Overlay */}
            {!purchasing && (
              <Animated.View
                style={[
                  animatedButtonStyle,
                  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}
                pointerEvents="none"
              />
            )}

            {purchasing ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text className="text-midnight text-[22px] font-bold">Start My 7-Day Free Trial</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-white/50 text-center font-medium mb-8">
          Then {priceString}{periodLabel}. Cancel anytime.
        </Text>

        <Text className="text-white/30 text-xs text-center leading-5 flex-1 justify-end mb-4">
          Subscription auto-renews at {priceString}{periodLabel} unless cancelled at
          least 24 hours before the end of the period. Manage in App Store Settings.
        </Text>

        <View className="flex-row justify-center items-center gap-4 pt-2">
          <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/sparktermsofuse/home')}>
            <Text className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Terms of Use</Text>
          </TouchableOpacity>
          <View className="w-[1px] h-3 bg-white/20" />
          <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/spark-app-privacy-policy/home')}>
            <Text className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
