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
    <View style={styles.container}>
      {/* Background glow on complete */}
      <Animated.View style={[styles.goldGlowBg, glowAnimStyle]} pointerEvents="none" />

      {/* Scientific basis */}
      <Text style={styles.sciLabel}>{scientificBasis}</Text>

      {/* Phase label */}
      {!done && (
        <Text style={styles.phaseLabel}>
          {phase === 'inhale' ? '🌬  Breathe In' : '💨  Breathe Out'}
        </Text>
      )}

      {/* Ring + Logo */}
      <View style={styles.ringWrapper}>
        {/* Background track ring */}
        <View style={[styles.ring, styles.ringTrack]} />

        {/* Progress ring segments — approximate with gradient arc */}
        <Animated.View style={[styles.ring, styles.ringProgress, ringAnimStyle]}>
          <LinearGradient
            colors={['#F59E0B', '#FBBF24', '#FDE68A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Liquid Logo */}
        <View style={styles.logoOuter}>
          <Animated.View style={[styles.logoInner, logoAnimStyle]}>
            <LinearGradient
              colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.08)']}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Spark Symbol */}
            <Text style={styles.logoEmoji}>✦</Text>
          </Animated.View>
        </View>
      </View>

      {/* Timer */}
      {!done ? (
        <Text style={styles.timer}>{mm}:{ss}</Text>
      ) : (
        <Animated.View style={styles.completedBox}>
          <Text style={styles.completedTitle}>✦ Connection Established</Text>
          <Text style={styles.completedSub}>Your nervous systems are in sync.</Text>
          <Text
            style={styles.completedBtn}
            onPress={onComplete}
          >
            Continue →
          </Text>
        </Animated.View>
      )}

      {/* Description */}
      {!done && (
        <Text style={styles.desc}>{activity.desc}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  goldGlowBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,158,11,0.07)',
    borderRadius: 0,
  },
  sciLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  phaseLabel: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
    overflow: 'hidden',
  },
  ringTrack: {
    borderColor: 'rgba(245,158,11,0.15)',
    backgroundColor: 'transparent',
  },
  ringProgress: {
    borderColor: 'transparent',
    // Gradient fills just the top-right quadrant — decorative approach
    opacity: 0.6,
  },
  logoOuter: {
    width: LOGO_BASE,
    height: LOGO_BASE,
    borderRadius: LOGO_BASE / 2,
    backgroundColor: 'rgba(15,23,42,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.3)',
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: LOGO_BASE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoEmoji: {
    fontSize: LOGO_BASE * 0.35,
    color: '#F59E0B',
  },
  timer: {
    color: '#F8FAFC',
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  desc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  completedBox: {
    alignItems: 'center',
    gap: 12,
  },
  completedTitle: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  completedSub: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  completedBtn: {
    marginTop: 12,
    color: '#0F172A',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
