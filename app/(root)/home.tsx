import { Alert, Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/src/context/AuthContext';
import { useRevenueCat } from '@/src/context/RevenueCatContext';
import { ONBOARDING_KEY } from '../(auth)/paywall';

// Features gated behind premium
const LOCKED_FEATURES = [
  { icon: '🎨', label: 'Shared Drawing Widget', description: 'Draw on a shared canvas together' },
  { icon: '🕯️', label: 'Guided Dates', description: 'Interactive date experiences for two' },
  { icon: '✨', label: 'AI Sparks', description: 'Personalised questions from AI' },
];

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { isPremium } = useRevenueCat();
  const router = useRouter();

  const goToPaywall = () => router.push('/(auth)/paywall');

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="items-center pt-20 pb-8">
          <Image
            source={require('@/assets/logo-transparent-bg.png')}
            className="w-24 h-24 mb-4"
          />
          <Text
            className="text-glacier text-4xl font-bold text-center mt-4"
            style={{ letterSpacing: -0.5 }}>
            Welcome to Spark
          </Text>
          <Text className="text-slate-muted text-sm text-center mt-2">
            {user?.email ?? 'Signed in with Apple'}
          </Text>

          {/* Premium badge */}
          {isPremium && (
            <View
              className="mt-3 px-4 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#F59E0B', borderWidth: 1 }}>
              <Text className="text-spark text-xs font-semibold">✦ Premium Member</Text>
            </View>
          )}
        </View>

        {/* Today's Spark — free for everyone */}
        <View
          className="w-full rounded-3xl border border-slate-muted/25 p-6 mb-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <Text className="text-spark text-xs font-semibold uppercase tracking-widest mb-2">
            Today's Spark
          </Text>
          <Text className="text-glacier text-lg font-semibold mb-2">Daily Question</Text>
          <Text className="text-slate-muted text-base leading-6">
            "What's one small thing your partner did recently that you appreciated but never
            mentioned?"
          </Text>
        </View>

        {/* Premium-gated features */}
        <View className="mt-2 gap-3">
          {LOCKED_FEATURES.map((feature) => (
            <View
              key={feature.label}
              className="rounded-3xl border border-slate-muted/20 p-5 overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>

              {/* Feature content */}
              <View className="flex-row items-center gap-3 mb-1">
                <Text style={{ fontSize: 24 }}>{feature.icon}</Text>
                <Text className="text-glacier text-base font-semibold flex-1">
                  {feature.label}
                </Text>
                {!isPremium && (
                  <Text className="text-slate-muted text-base">🔒</Text>
                )}
              </View>
              <Text className="text-slate-muted text-sm ml-9">{feature.description}</Text>

              {/* Lock overlay for non-premium */}
              {!isPremium && (
                <View
                  className="absolute inset-0 rounded-3xl items-center justify-center"
                  style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}>
                  <Text className="text-glacier text-sm font-semibold mb-2">
                    Premium Feature
                  </Text>
                  <TouchableOpacity
                    onPress={goToPaywall}
                    activeOpacity={0.85}
                    className="bg-spark px-5 py-2 rounded-full"
                    style={{
                      shadowColor: '#F59E0B',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 10,
                    }}>
                    <Text className="text-midnight text-xs font-bold">Upgrade to Premium</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          activeOpacity={0.7}
          className="mt-8 py-3 rounded-2xl border border-slate-muted/30 items-center">
          <Text className="text-slate-muted text-sm">Sign Out</Text>
        </TouchableOpacity>

        {/* ── DEBUG ONLY (remove before production) ── */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              '🛠 Debug',
              'Clear onboarding flag and sign out? This resets the app to a fresh-install state.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
                    await signOut();
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
          className="mt-3 py-3 rounded-2xl border border-rose/30 items-center"
          style={{ backgroundColor: 'rgba(251,113,133,0.06)' }}
        >
          <Text className="text-rose text-xs font-semibold">🛠 Reset Onboarding State</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
