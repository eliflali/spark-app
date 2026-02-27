import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.7;
const LOGO_BASE = RING_SIZE * 0.44;

interface Activity {
  id: string;
  title: string;
  mode: string;
  desc: string;
}

interface ResonanceModeProps {
  activity: Activity;
  scientificBasis: string;
  onComplete: () => void;
}

// Duration (seconds) derived from desc — fall back to 20s
function parseDuration(desc: string): number {
  const m = desc.match(/(\d+)\s*(second|sec|min)/i);
  if (!m) return 20;
  const val = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  return unit.startsWith('min') ? val * 60 : val;
}

export default function ResonanceMode({ activity, scientificBasis, onComplete }: ResonanceModeProps) {
  const TOTAL_SECONDS = parseDuration(activity.desc);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [done, setDone] = useState(false);

  // Liquid logo pulse (4s inhale expand → 4s exhale contract)
  const pulse = useSharedValue(0);
  // Ring fill (0 → 1 over full session)
  const ringProgress = useSharedValue(0);
  // Gold glow on completion
  const goldGlow = useSharedValue(0);

  useEffect(() => {
    // Breathing animation
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Ring fill
    ringProgress.value = withTiming(1, {
      duration: TOTAL_SECONDS * 1000,
      easing: Easing.linear,
    });

    // Haptic metronome — every 4 seconds
    const hapticInterval = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 4000);

    // Countdown
    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          clearInterval(hapticInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Phase label
    const phaseInterval = setInterval(() => {
      setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale'));
    }, 4000);

    return () => {
      clearInterval(hapticInterval);
      clearInterval(countdownInterval);
      clearInterval(phaseInterval);
      cancelAnimation(pulse);
      cancelAnimation(ringProgress);
    };
  }, []);

  // Watch for completion
  useEffect(() => {
    if (secondsLeft === 0 && !done) {
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goldGlow.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });
    }
  }, [secondsLeft]);

  // Animated styles
  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pulse.value, [0, 1], [0.92, 1.08]),
      },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.85, 1]),
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: goldGlow.value,
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    // We use borderWidth + rotation trick for the progress ring effect
    opacity: interpolate(ringProgress.value, [0, 0.05, 1], [0, 1, 1]),
  }));

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View className="flex-1 items-center justify-center px-8 gap-6">
      {/* Background glow on complete */}
      <Animated.View className="absolute top-0 bottom-0 left-0 right-0 bg-[rgba(245,158,11,0.07)] rounded-none" style={[glowAnimStyle]} pointerEvents="none" />

      {/* Scientific basis */}
      <Text className="text-[#475569] text-[11px] font-semibold uppercase tracking-[1.5px] text-center">{scientificBasis}</Text>

      {/* Phase label */}
      {!done && (
        <Text className="text-[#F59E0B] text-[16px] font-bold tracking-[0.3px]">
          {phase === 'inhale' ? '🌬  Breathe In' : '💨  Breathe Out'}
        </Text>
      )}

      {/* Ring + Logo */}
      <View className="items-center justify-center relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        {/* Background track ring */}
        <View className="absolute rounded-full border-4 overflow-hidden border-[#F59E0B]/15 bg-transparent" style={{ width: RING_SIZE, height: RING_SIZE }} />

        {/* Progress ring segments — approximate with gradient arc */}
        <Animated.View className="absolute rounded-full border-4 overflow-hidden border-transparent opacity-60" style={[{ width: RING_SIZE, height: RING_SIZE }, ringAnimStyle]}>
          <LinearGradient
            colors={['#F59E0B', '#FBBF24', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        </Animated.View>

        {/* Liquid Logo */}
        <View className="bg-[#0F172A]/95 items-center justify-center border-[1.5px] border-[#F59E0B]/30 overflow-hidden" style={{ width: LOGO_BASE, height: LOGO_BASE, borderRadius: LOGO_BASE / 2, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 }}>
          <Animated.View className="w-full h-full items-center justify-center overflow-hidden" style={[{ borderRadius: LOGO_BASE / 2 }, logoAnimStyle]}>
            <LinearGradient
              colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.08)']}
              className="absolute top-0 bottom-0 left-0 right-0"
            />
            {/* Spark Symbol */}
            <Text className="text-[#F59E0B]" style={{ fontSize: LOGO_BASE * 0.35 }}>✦</Text>
          </Animated.View>
        </View>
      </View>

      {/* Timer */}
      {!done ? (
        <Text className="text-[#F8FAFC] text-[48px] font-light tracking-[2px] tabular-nums">{mm}:{ss}</Text>
      ) : (
        <Animated.View className="items-center gap-3">
          <Text className="text-[#F59E0B] text-[24px] font-bold tracking-tighter text-center">✦ Connection Established</Text>
          <Text className="text-[#94A3B8] text-[15px] leading-[22px] text-center">Your nervous systems are in sync.</Text>
          <Text
            className="mt-3 text-[#0F172A] bg-[#F59E0B] px-8 py-3.5 rounded-[20px] text-[16px] font-bold overflow-hidden"
            onPress={onComplete}
          >
            Continue →
          </Text>
        </Animated.View>
      )}

      {/* Description */}
      {!done && (
        <Text className="text-[#94A3B8] text-[14px] leading-[22px] text-center">{activity.desc}</Text>
      )}
    </View>
  );
}


