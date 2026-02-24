import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchasesPackage } from 'react-native-purchases';
import { useRevenueCat } from '@/src/context/RevenueCatContext';

const FEATURES = [
  { icon: '💬', label: 'Unlimited Daily Sparks' },
  { icon: '🎨', label: 'Shared Drawing Widget' },
  { icon: '🕯️', label: 'All Guided Date Experiences' },
  { icon: '✨', label: 'AI-Powered Question Generation' },
  { icon: '🔔', label: 'Couple Reminders & Nudges' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offering, loading, purchasePackage, restorePurchases, isPremium } = useRevenueCat();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // If the user somehow already is premium, boot them out
  if (isPremium) {
    router.replace('/(root)/home');
    return null;
  }

  // The first package in the Main Offering (monthly)
  const pkg: PurchasesPackage | undefined = offering?.availablePackages[0];

  const priceString = pkg?.product.priceString ?? '$14.99';
  const periodLabel = pkg?.product.subscriptionPeriod === 'P1M' ? '/ month' : '';

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (!pkg) {
      Alert.alert('Not available', 'Could not load subscription. Please try again.');
      return;
    }
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) router.replace('/(root)/home');
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

  const handleSkip = () => router.replace('/(auth)/login');

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-midnight items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="text-slate-muted text-sm mt-4">Loading plans…</Text>
      </View>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      {/* Top bar */}
      <View className="flex-row justify-between items-center px-6 pt-14 pb-2">
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text className="text-slate-muted text-sm">Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={restoring} hitSlop={12}>
          <Text className="text-slate-muted text-sm">
            {restoring ? 'Restoring…' : 'Restore'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View className="items-center mt-6 mb-10">
          <Text style={{ fontSize: 64 }}>🔥</Text>
          <Text
            className="text-glacier text-4xl font-bold mt-4 text-center"
            style={{ letterSpacing: -1 }}>
            Spark Premium
          </Text>
          <Text className="text-slate-muted text-base mt-2 text-center">
            Everything you need to keep the flame alive.
          </Text>
        </View>

        {/* Feature list */}
        <View
          className="rounded-3xl border border-slate-muted/30 p-6 mb-8 gap-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          {FEATURES.map((f) => (
            <View key={f.label} className="flex-row items-center gap-4">
              <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              <Text className="text-glacier text-base flex-1">{f.label}</Text>
              <Text className="text-spark text-lg font-bold">✓</Text>
            </View>
          ))}
        </View>

        {/* Price badge — real data from RevenueCat */}
        <View className="items-center mb-6">
          <View
            className="rounded-2xl px-8 py-4"
            style={{
              backgroundColor: 'rgba(245,158,11,0.10)',
              borderColor: '#F59E0B',
              borderWidth: 1,
            }}>
            <Text className="text-spark text-3xl font-bold text-center">
              {priceString} {periodLabel}
            </Text>
            <Text className="text-slate-muted text-sm text-center mt-1">
              Cancel anytime · No commitments
            </Text>
          </View>
        </View>

        {/* Subscribe CTA */}
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={purchasing || !pkg}
          activeOpacity={0.85}
          className="rounded-3xl py-5 items-center"
          style={{
            backgroundColor: purchasing ? '#92400e' : '#F59E0B',
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
          }}>
          {purchasing ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <Text className="text-midnight text-lg font-bold">
              {pkg?.product.introPrice ? 'Start Free Trial' : 'Subscribe Now'}
            </Text>
          )}
        </TouchableOpacity>

        <Text className="text-slate-muted text-xs text-center mt-5 leading-5">
          Subscription auto-renews at {priceString}{periodLabel} unless cancelled at
          least 24 hours before the end of the period. Manage in App Store Settings.
        </Text>
      </ScrollView>
    </View>
  );
}
