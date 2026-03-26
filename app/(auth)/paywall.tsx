import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useRevenueCat } from '@/src/context/RevenueCatContext';

// ── Constants ─────────────────────────────────────────────────────────────────
const GOLD = '#F59E0B';
const GOLD_DIM = 'rgba(245,158,11,0.55)';

const FEATURES = [
  { icon: '✦', label: 'Science-backed daily questions to deepen your bond.' },
  { icon: '◈', label: 'Weekly mini-adventures designed for couples.' },
  { icon: '⟡', label: 'Expert-led intimacy exercises for guided growth.' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaywallScreen() {
  const router = useRouter();
  const { offering, loading, purchasePackage, restorePurchases, isPremium } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  // Pulsing gold glow on the CTA button
  const glowAnim = useRef(new Animated.Value(0.45)).current;
  // Soft shimmer inside button
  const shimmerAnim = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.45, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.55, duration: 1100, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.25, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Redirect premium users away
  useEffect(() => {
    if (isPremium) router.replace('/(root)/home');
  }, [isPremium]);

  const pkg: PurchasesPackage | undefined = offering?.availablePackages[0];

  const priceString = pkg?.product.priceString ?? '$14.99';
  const subscriptionPeriod = pkg?.product.subscriptionPeriod;
  const periodLabel = subscriptionPeriod === 'P1Y' ? '/year' : subscriptionPeriod === 'P1M' ? '/month' : '/month';
  const trialDays   = '7-Day';

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
    if (success) router.replace('/(auth)/login');
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      router.replace('/(root)/home');
    } else {
      Alert.alert('No purchases found', "We couldn't find a previous subscription for this account.");
    }
  };

  const handleSkip = () => router.replace('/(auth)/login');

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-midnight items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={GOLD} />
        <Text className="text-slate-muted text-sm mt-4">Curating your experience…</Text>
      </View>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      {/* ── Mesh Gradient Background ── */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {/* Base deep midnight */}
        <LinearGradient
          colors={['#060D1F', '#0A1628', '#0F172A']}
          locations={[0, 0.45, 1]}
          style={{ flex: 1 }}
        />
        {/* Soft upper-left gold orb */}
        <View style={{
          position: 'absolute', top: -80, left: -60,
          width: 340, height: 340,
          borderRadius: 170,
          backgroundColor: 'rgba(245,158,11,0.09)',
        }} />
        {/* Blue-violet lower-right orb */}
        <View style={{
          position: 'absolute', bottom: 60, right: -80,
          width: 300, height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(99,102,241,0.11)',
        }} />
        {/* Indigo mid bleed */}
        <View style={{
          position: 'absolute', top: '38%', left: '25%',
          width: 220, height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(79,70,229,0.07)',
        }} />
        {/* Frosted backdrop blur over the whole canvas */}
        <BlurView tint="dark" intensity={65} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </View>

      {/* ── Top Bar ── */}
      <View className="flex-row justify-between items-center px-6 pt-20 pb-2 z-10">
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text className="text-slate-muted" style={{ fontSize: 12, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Skip for now
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={restoring} hitSlop={12}>
          <Text className="text-slate-muted" style={{ fontSize: 12, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {restoring ? 'Restoring…' : 'Restore'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 56, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Eyebrow: Product name (Serif) ── */}
        <View style={{ alignItems: 'center', marginBottom: 2 }}>
          <Text
            className=""
            style={{ fontSize: 13, letterSpacing: 3.5, textTransform: 'uppercase', color: GOLD_DIM }}
          >
            Spark Premium
          </Text>
        </View>

        {/* ── Hero Headline (Serif) ── */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text
            className=""
            style={{ fontSize: 38, lineHeight: 46, letterSpacing: -0.5, color: '#E2EAF4', textAlign: 'center' }}
          >
            Keep the{' '}
            <Text style={{ color: GOLD }}>spark</Text>
            {'\n'}alive.
          </Text>
        </View>

        {/* ── Price Pill (translucent border container) ── */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            borderWidth: 1,
            borderColor: 'rgba(245,158,11,0.22)',
            borderRadius: 28,
            backgroundColor: 'rgba(245,158,11,0.05)',
            paddingHorizontal: 36,
            paddingVertical: 18,
            alignItems: 'center',
          }}>
            {/* Trial sub-label — subordinate */}
            <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2.5,
              textTransform: 'uppercase', color: 'rgba(245,158,11,0.65)', marginBottom: 10 }}>
              {trialDays} Free Trial, then
            </Text>

            {/* Price — dominant */}
            <Text className="text-glacier font-bold" style={{ fontSize: 54, letterSpacing: -2, lineHeight: 58 }}>
              {priceString}
            </Text>

            {/* Period — below price, smaller */}
            <Text style={{ fontSize: 14, fontWeight: '400', color: 'rgba(226,234,244,0.5)',
              letterSpacing: 0.5, marginTop: 4 }}>
              {periodLabel} · billed monthly
            </Text>
          </View>
        </View>

        {/* ── Feature Capsules (floating glassmorphic) ── */}
        <View style={{ gap: 10, marginBottom: 32 }}>
          {FEATURES.map(({ icon, label }, i) => (
            <BlurView
              key={i}
              tint="dark"
              intensity={55}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.12)',
                paddingHorizontal: 18,
                paddingVertical: 14,
                backgroundColor: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Gold icon halo */}
              <View style={{
                width: 40, height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: GOLD,
                shadowOpacity: 0.35,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              }}>
                <Text style={{ fontSize: 17, color: GOLD, fontWeight: '300' }}>{icon}</Text>
              </View>
              <Text
                className=""
                style={{ flex: 1, fontSize: 14, lineHeight: 21, color: 'rgba(226,234,244,0.88)' }}
              >
                {label}
              </Text>
            </BlurView>
          ))}
        </View>

        {/* ── Subscribe CTA with outward gold glow ── */}
        <View style={{ marginBottom: 14 }}>

          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={purchasing || !pkg}
            activeOpacity={0.82}
            style={{
              borderRadius: 28,
              paddingVertical: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: purchasing ? '#92400e' : GOLD,
              shadowColor: GOLD,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.7,
              shadowRadius: 28,
              minHeight: 68,
              overflow: 'hidden',
            }}
          >
            {/* Inner shimmer overlay */}
            {!purchasing && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  opacity: shimmerAnim,
                }}
              />
            )}
            {purchasing ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', letterSpacing: 0.3 }}>
                Subscribe Now!
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer copy ── */}
        <Text className="text-slate-muted" style={{ fontSize: 11, fontWeight: '300',
          textAlign: 'center', lineHeight: 18, marginBottom: 8, marginTop: 6 }}>
          Cancel anytime before the trial ends and you won't be charged.
        </Text>

        <Text className="text-slate-muted" style={{ fontSize: 10, fontWeight: '300',
          textAlign: 'left', lineHeight: 17, marginBottom: 20, paddingHorizontal: 8 }}>
          Payment of {priceString}{periodLabel} will be charged to your Apple ID account at confirmation
          of purchase. Subscription automatically renews unless cancelled at least 24 hours before
          the end of the current period. Manage or cancel in App Store Settings → Subscriptions.
        </Text>

        {/* ── Legal links ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/sparktermsofuse/home')}>
            <Text className="text-slate-muted" style={{ fontSize: 10, fontWeight: '300',
              textTransform: 'uppercase', letterSpacing: 1.2 }}>Terms of Use</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/spark-app-privacy-policy/home')}>
            <Text className="text-slate-muted" style={{ fontSize: 10, fontWeight: '300',
              textTransform: 'uppercase', letterSpacing: 1.2 }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
