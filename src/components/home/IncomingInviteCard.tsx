import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import guidedDatesData from '@/assets/guided-dates/guided-dates.json';
import type { Category } from '@/src/components/guided-dates/types';

function getActivityTitle(templateId: string): string {
  const allCategories = (guidedDatesData as { guided_dates: Category[] }).guided_dates;
  for (const cat of allCategories) {
    const found = cat.activities.find((a) => a.id === templateId);
    if (found) return found.title;
  }
  return 'Guided Date';
}

export function IncomingInviteCard({
  incomingSession,
  onAccept,
}: {
  incomingSession: { id: string; template_id: string } | null;
  onAccept: () => void;
}) {
  if (!incomingSession) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOut.duration(300)}>
      <BlurView
        tint="dark"
        intensity={55}
        className="overflow-hidden rounded-[28px]"
        style={{
          shadowColor: '#F59E0B',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={['rgba(245,158,11,0.22)', 'rgba(251,113,133,0.08)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Animated border glow */}
        <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 top-0 rounded-[28px] border-[1.5px] border-spark/45" />

        <View className="gap-3 p-5">
          <View className="self-start flex-row items-center gap-1.5 rounded-xl border border-spark/30 bg-spark/15 px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-spark" />
            <Text className="text-[10px] font-extrabold tracking-widest text-spark">LIVE INVITE</Text>
          </View>

          <Text className="text-xl font-bold tracking-tight text-glacier">⚡ Partner is waiting!</Text>
          <Text className="text-sm leading-5 text-slate-muted">
            {getActivityTitle(incomingSession.template_id)}
          </Text>

          <TouchableOpacity
            onPress={onAccept}
            activeOpacity={0.85}
            className="mt-1 items-center overflow-hidden rounded-2xl py-3.5"
            style={{
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={['#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text className="text-[15px] font-extrabold tracking-wide text-midnight">Join Partner ✦</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Animated.View>
  );
}
