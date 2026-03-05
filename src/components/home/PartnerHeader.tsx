import { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarCircle } from './AvatarCircle';
import type { PartnerProfile } from './types';

export function PartnerHeader({
  myProfile,
  partner,
}: {
  myProfile: PartnerProfile | null;
  partner: PartnerProfile | null;
}) {
  const glow = useSharedValue(0.6);
  const animStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  return (
    <View className="flex-row items-center justify-start px-1">
      <AvatarCircle name={myProfile?.display_name ?? null} avatarUrl={myProfile?.avatar_url ?? null} />

      {/* Connecting line */}
      <View className="relative mx-2 h-0.5 flex-1">
        <View className="absolute bottom-0 left-0 right-0 top-0 rounded-sm bg-spark/20" />
        <Animated.View style={animStyle} className="absolute bottom-0 left-0 right-0 top-0 rounded-sm">
          <LinearGradient
            colors={['transparent', '#F59E0B', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
      </View>

      {partner ? (
        <AvatarCircle name={partner.display_name} avatarUrl={partner.avatar_url} color="#FB7185" />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-700">
          <Ionicons name="person-add-outline" size={18} color="#475569" />
        </View>
      )}
    </View>
  );
}
