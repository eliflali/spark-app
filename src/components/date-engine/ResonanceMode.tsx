import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
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
  FadeIn,
  FadeOut,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.75;
const LOGO_BASE = RING_SIZE * 0.42;

interface Activity {
  id: string;
  title: string;
  mode: string;
  desc: string;
  estimated_time?: number;
}

interface ResonanceModeProps {
  activity: Activity;
  scientificBasis: string;
  onComplete: () => void;
}

// Fallback if estimated_time is missing from JSON for some reason
function parseDurationFallback(desc: string): number {
  const m = desc.match(/(\d+)\s*(second|sec|min)/i);
  if (!m) return 20; // 20 sec default
  const val = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  return unit.startsWith('min') ? val * 60 : val;
}

export default function ResonanceMode({ activity, scientificBasis, onComplete }: ResonanceModeProps) {
  // Use explicit estimated_time from JSON if exists, else parse desc
  const TOTAL_SECONDS = activity.estimated_time ?? parseDurationFallback(activity.desc);
  
  const [isStarted, setIsStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [done, setDone] = useState(false);

  // Animations
  const pulse = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const completeGlow = useSharedValue(0);

  // Idle hover animation for start button
  const idleHover = useSharedValue(0);

  useEffect(() => {
    // Soft idle floating effect before starting
    if (!isStarted && !done) {
      idleHover.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(idleHover);
      idleHover.value = 0;
    }
  }, [isStarted, done]);


  useEffect(() => {
    if (!isStarted || done) return;

    // Breathing animation (4s inhale -> 4s exhale)
    pulse.value = 0;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Ring fill logic
    ringProgress.value = 0;
    ringProgress.value = withTiming(1, {
      duration: TOTAL_SECONDS * 1000,
      easing: Easing.linear,
    });

    // Countdown Timer
    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Phase Switcher (Every 4 seconds)
    const phaseInterval = setInterval(() => {
      setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale'));
    }, 4000);

    // Subtle Haptic guidance matching the 4s breath switch
    const hapticInterval = setInterval(() => {
       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }, 4000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(phaseInterval);
      clearInterval(hapticInterval);
      cancelAnimation(pulse);
      cancelAnimation(ringProgress);
    };
  }, [isStarted, done, TOTAL_SECONDS]);


  // Watch for exact completion
  useEffect(() => {
    if (isStarted && secondsLeft === 0 && !done) {
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeGlow.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.exp) });
    }
  }, [secondsLeft, isStarted, done]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsStarted(true);
  };

  // --- Styles ---

  const logoAnimStyle = useAnimatedStyle(() => {
    // If not started, use idle hover. If started, use breathing pulse.
    const activeValue = isStarted ? pulse.value : idleHover.value;
    const scaleRange = isStarted ? [0.85, 1.15] : [0.98, 1.02];
    
    return {
      transform: [{ scale: interpolate(activeValue, [0, 1], scaleRange) }],
      opacity: interpolate(activeValue, [0, 1], [0.8, 1]),
    };
  });

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: completeGlow.value,
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringProgress.value, [0, 0.05, 1], [0, 1, 1])
  }));

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  
  // For short durations (<60s), we might just show seconds prominently
  const isShortDuration = TOTAL_SECONDS < 60;
  const displayTime = isShortDuration ? String(secondsLeft) : `${mm}:${ss}`;

  return (
    <View className="flex-1 items-center px-6 pt-10 pb-8 rounded-t-[32px] overflow-hidden bg-midnight">
      
      {/* Background Active Gradient */}
      {isStarted && !done && (
         <Animated.View entering={FadeIn.duration(1000)} exiting={FadeOut.duration(800)} className="absolute inset-0">
           <LinearGradient
             colors={['rgba(16, 185, 129, 0.15)', 'rgba(30, 58, 138, 0.2)', 'transparent']}
             className="absolute inset-0"
           />
         </Animated.View>
      )}

      {/* Completion Background Glow */}
      <Animated.View className="absolute inset-0 bg-[rgba(52,211,153,0.12)]" style={[glowAnimStyle]} pointerEvents="none" />

      {/* Header Info */}
      <View className="items-center w-full mt-4 gap-3 z-10 px-4">
        <View className="bg-glacier/10 px-3 py-1.5 rounded-full border border-glacier/20">
          <Text className="text-glacier/80 text-[10px] font-bold uppercase tracking-[2px]">{scientificBasis}</Text>
        </View>
        <Text className="text-glacier text-[24px] font-bold tracking-tighter text-center">{activity.title}</Text>
        {!isStarted && !done && (
           <Text className="text-slate-muted text-[15px] leading-[22px] text-center mt-2 px-2">{activity.desc}</Text>
        )}
      </View>

      <View className="flex-1 w-full items-center justify-center">
        {/* The Central Visual */}
        <View className="items-center justify-center relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
          
          {/* Static Background Track */}
          <View className="absolute rounded-full border-[3px] border-emerald-500/10 bg-transparent" style={{ width: RING_SIZE, height: RING_SIZE }} />

          {/* Progress Ring (Gradient) */}
          {isStarted && !done && (
             <Animated.View className="absolute rounded-full border-[3px] overflow-hidden border-transparent opacity-80" style={[{ width: RING_SIZE, height: RING_SIZE }, ringAnimStyle]}>
               <LinearGradient
                 colors={['#10B981', '#34D399', '#059669']}
                 start={{ x: 0, y: 0 }}
                 end={{ x: 1, y: 1 }}
                 className="absolute inset-0"
               />
             </Animated.View>
          )}

          {/* Center Orb */}
          <View className="items-center justify-center rounded-full bg-[#0F172A]" style={{ width: LOGO_BASE, height: LOGO_BASE, shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isStarted ? 0.3 : 0.1, shadowRadius: 24, elevation: 12 }}>
            <Animated.View className="w-full h-full items-center justify-center rounded-full overflow-hidden border border-emerald-500/20" style={logoAnimStyle}>
              <LinearGradient
                colors={isStarted ? ['rgba(16,185,129,0.25)', 'rgba(5,150,105,0.1)'] : ['rgba(148,163,184,0.15)', 'rgba(71,85,105,0.05)']}
                className="absolute inset-0"
              />
              
              {!isStarted && !done ? (
                 <Ionicons name="radio" size={36} color="#94A3B8" />
              ) : done ? (
                 <Ionicons name="checkmark" size={40} color="#34D399" />
              ) : (
                 <Text className="text-emerald-400 font-bold tabular-nums" style={{ fontSize: isShortDuration ? 42 : 32, letterSpacing: -1 }}>
                   {displayTime}
                 </Text>
              )}
            </Animated.View>
          </View>
        </View>

        {/* Dynamic Breathing Text below orb during session */}
        {isStarted && !done && (
           <Animated.View entering={FadeIn.delay(200)} className="absolute bottom-4 items-center">
              <Text className="text-emerald-400/90 text-[18px] font-bold tracking-[3px] uppercase">
                {phase === 'inhale' ? 'Breathe In' : 'Breathe Out'}
              </Text>
           </Animated.View>
        )}
      </View>

      {/* Bottom Action Area */}
      <View className="w-full h-[100px] items-center justify-end pb-4">
        {!isStarted && !done && (
          <Animated.View entering={FadeInDown.delay(300).springify()} className="w-full">
            <TouchableOpacity
              onPress={handleStart}
              activeOpacity={0.8}
              className="bg-emerald-500 w-full py-4 rounded-[20px] items-center"
              style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16 }}
            >
              <Text className="text-midnight font-extrabold text-[16px] tracking-wide">Start Connection ✦</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {done && (
           <Animated.View entering={FadeInDown.springify()} className="w-full items-center gap-6">
              <Text className="text-emerald-400 text-[16px] font-semibold text-center italic px-8">
                Your nervous systems are now in sync.
              </Text>
              <TouchableOpacity
                onPress={onComplete}
                activeOpacity={0.8}
                className="bg-emerald-500 w-full py-4 rounded-[20px] items-center"
                style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16 }}
              >
                <Text className="text-midnight font-extrabold text-[16px] tracking-wide">Finish & Save Memory ✦</Text>
              </TouchableOpacity>
           </Animated.View>
        )}
      </View>

    </View>
  );
}


