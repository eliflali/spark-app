import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const FEATURES = [
  { icon: '💬', label: 'Unlimited Daily Sparks' },
  { icon: '🎨', label: 'Shared Drawing Widget' },
  { icon: '🕯️', label: 'All Guided Date Experiences' },
  { icon: '✨', label: 'AI-Powered Question Generation' },
  { icon: '🔔', label: 'Couple Reminders & Nudges' },
];

export default function PaywallScreen() {
  const router = useRouter();

  const handleSkip = () => router.replace('/(auth)/login');
  const handleRestore = () => {
    // TODO: integrate with RevenueCat restore purchases
    console.log('Restore tapped');
  };
  const handleSubscribe = () => {
    // TODO: integrate with RevenueCat purchase flow
    console.log('Subscribe tapped');
  };

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      {/* Close / Skip */}
      <View className="flex-row justify-between items-center px-6 pt-14 pb-2">
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text className="text-slate-muted text-sm">Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} hitSlop={12}>
          <Text className="text-slate-muted text-sm">Restore</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View className="items-center mt-6 mb-10">
          <Text style={{ fontSize: 56 }}>🔥</Text>
          <Text className="text-glacier text-4xl font-bold mt-4 text-center" style={{ letterSpacing: -1 }}>
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
              <Text className="text-spark text-lg">✓</Text>
            </View>
          ))}
        </View>

        {/* Price badge */}
        <View className="items-center mb-6">
          <View
            className="rounded-2xl px-6 py-3"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#F59E0B', borderWidth: 1 }}>
            <Text className="text-spark text-2xl font-bold text-center">
              $14.99 / month
            </Text>
            <Text className="text-slate-muted text-sm text-center mt-1">
              Cancel anytime
            </Text>
          </View>
        </View>

        {/* Subscribe CTA */}
        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.85}
          className="bg-spark rounded-3xl py-4 items-center"
          style={{
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
          }}>
          <Text className="text-midnight text-lg font-bold">Start Free Trial</Text>
        </TouchableOpacity>

        <Text className="text-slate-muted text-xs text-center mt-4">
          Subscription auto-renews. Manage in App Store Settings.
        </Text>
      </ScrollView>
    </View>
  );
}
