import { Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 bg-midnight items-center justify-center px-6">
      <StatusBar style="light" />

      <Text style={{ fontSize: 72 }}>🔥</Text>

      <Text
        className="text-glacier text-4xl font-bold text-center mt-4"
        style={{ letterSpacing: -0.5 }}>
        Welcome to Spark
      </Text>

      <Text className="text-slate-muted text-base text-center mt-3">
        {user?.email ?? 'Signed in with Apple'}
      </Text>

      {/* Placeholder for the main content */}
      <View
        className="w-full rounded-3xl border border-slate-muted/25 p-6 mt-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Text className="text-glacier text-lg font-semibold mb-1">Today's Spark</Text>
        <Text className="text-slate-muted text-base">
          "What's one small thing your partner did recently that you appreciated but never
          mentioned?"
        </Text>
      </View>

      <TouchableOpacity
        onPress={signOut}
        activeOpacity={0.7}
        className="mt-auto mb-10 px-8 py-3 rounded-2xl border border-slate-muted/40">
        <Text className="text-slate-muted text-sm">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
