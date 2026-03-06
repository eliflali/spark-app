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
import { Image } from 'react-native';
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
      <View className="relative mx-3 h-0.5 flex-1 items-center justify-center">
        {/* Glow effect */}
        <Animated.View style={animStyle} className="absolute -bottom-1 -left-1 -right-1 -top-1 rounded-sm">
          <LinearGradient
            colors={['transparent', 'rgba(245,158,11,0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, filter: 'blur(4px)' as any }}
          />
        </Animated.View>

        {/* Core silky line */}
        <Animated.View style={animStyle} className="absolute bottom-0 left-0 right-0 top-0 rounded-sm">
          <LinearGradient
            colors={['transparent', '#FBCFE8', '#F59E0B', '#FBCFE8', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
        
        <Image
          source={require('@/assets/logo-transparent-bg.png')}
          className="absolute h-8 w-8"
        />
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
