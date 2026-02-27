import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export type BlobConfig = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  color: string;
  size: number;
};

export function AnimatedBlob({ config }: { config: BlobConfig }) {
  const tx = useSharedValue(config.startX);
  const ty = useSharedValue(config.startY);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(config.endX, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(config.startX, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(config.endY, {
          duration: config.duration * 1.3,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(config.startY, {
          duration: config.duration * 1.3,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute opacity-[0.55]"
      style={[
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}
