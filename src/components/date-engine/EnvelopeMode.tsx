import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface Activity {
  id: string;
  title: string;
  mode: string;
  desc: string;
}

interface EnvelopeModeProps {
  activity: Activity;
  scientificBasis: string;
  onComplete: () => void;
}

type Stage = 'sealed' | 'tearing' | 'revealed' | 'done';

export default function EnvelopeMode({ activity, scientificBasis, onComplete }: EnvelopeModeProps) {
  const [stage, setStage] = useState<Stage>('sealed');

  // Flap tear animation values
  const flapTranslateY = useSharedValue(0);
  const flapOpacity = useSharedValue(1);
  const flapRotate = useSharedValue(0);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);

  const handleTear = () => {
    if (stage !== 'sealed') return;
    setStage('tearing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Flap flies off upward with rotation
    flapTranslateY.value = withTiming(-height * 0.35, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    flapRotate.value = withTiming(-15, { duration: 500 });
    flapOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );

    // Card slides in
    setTimeout(() => {
      cardScale.value = withSpring(1, { stiffness: 100 });
      cardOpacity.value = withTiming(1, { duration: 400 });
      setStage('revealed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 450);
  };

  // PanResponder for swipe-up gesture
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 12 && gs.dy < 0,
    onPanResponderRelease: (_, gs) => {
      if (gs.dy < -40 && stage === 'sealed') {
        handleTear();
      }
    },
  });

  const flapAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: flapTranslateY.value },
      { rotate: `${flapRotate.value}deg` },
    ],
    opacity: flapOpacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center px-6 gap-7">
      {/* Label */}
      <Text className="text-[#475569] text-[11px] font-semibold uppercase tracking-[1.5px] text-center">{scientificBasis}</Text>
      <Text className="text-[#94A3B8] text-[14px] text-center min-h-[20px]">
        {stage === 'sealed' ? 'Swipe up or tap to open your envelope' : ''}
      </Text>

      {/* Envelope body */}
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleTear}
        className="items-center justify-end"
        style={{ width: ENVELOPE_W, height: ENVELOPE_H + 80 }}
        {...panResponder.panHandlers}
      >
        {/* Envelope back */}
        <View className="rounded-[20px] overflow-hidden border border-[#F59E0B]/25 bg-[#0F172A]/90 items-center justify-center relative" style={{ width: ENVELOPE_W, height: ENVELOPE_H, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 }}>
          <BlurView tint="dark" intensity={40} className="absolute top-0 bottom-0 left-0 right-0" />
          <LinearGradient
            colors={['rgba(245,158,11,0.12)', 'rgba(15,23,42,0.8)', 'rgba(245,158,11,0.06)']}
            className="absolute top-0 bottom-0 left-0 right-0"
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Bottom triangle fold */}
          <View className="absolute bottom-0 left-0 right-0 border-t border-[#F59E0B]/12 bg-[#F59E0B]/5" style={{ height: ENVELOPE_H * 0.4 }} />

          {/* Wax seal */}
          {stage === 'sealed' && (
            <View className="w-14 h-14 rounded-full items-center justify-center overflow-hidden z-10" style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }}>
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#D97706']}
                className="absolute top-0 bottom-0 left-0 right-0"
              />
              <Text className="text-[#0F172A] text-[22px] font-bold">✦</Text>
            </View>
          )}

          {/* Revealed Spark Card inside */}
          {(stage === 'revealed' || stage === 'done') && (
            <Animated.View style={[cardAnimStyle, { width: ENVELOPE_W - 32 }]} className="bg-[#0F172A]/95 rounded-2xl p-5 border border-[#F59E0B]/20 gap-3 overflow-hidden">
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                className="absolute top-0 bottom-0 left-0 right-0"
              />
              <View className="flex-row items-center">
                <View className="px-2 py-[3px] rounded-lg bg-[#F59E0B]/15">
                  <Text className="text-[#F59E0B] text-[9px] font-bold tracking-[1.5px]">SPARK DATE</Text>
                </View>
              </View>

              <Text className="text-[#F8FAFC] text-[20px] font-bold tracking-tighter leading-[26px]">{activity.title}</Text>
              <Text className="text-[#94A3B8] text-[14px] leading-[22px]">{activity.desc}</Text>

              <View className="h-px bg-white/5" />
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flask-outline" size={13} color="#F59E0B" />
                <Text className="text-[#475569] text-[11px] font-semibold italic flex-1">{scientificBasis}</Text>
              </View>
            </Animated.View>
          )}

          {/* Flap — animated tear away */}
          {stage !== 'done' && (
            <Animated.View style={[flapAnimStyle, { height: ENVELOPE_H * 0.5 }]} className="absolute top-0 left-0 right-0 bg-[#1E293B]/95 rounded-t-[20px] overflow-hidden border-b-[1.5px] border-[#F59E0B]/20">
              <LinearGradient
                colors={['rgba(245,158,11,0.18)', 'rgba(30,41,59,0.95)']}
                className="absolute top-0 bottom-0 left-0 right-0"
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              {/* Diagonal cut lines for texture */}
              <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F59E0B]/30" />
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>

      {/* CTA after reveal */}
      {stage === 'revealed' && (
        <Animated.View entering={FadeInDown.delay(500).springify()} className="w-full gap-3 items-center">
          <TouchableOpacity
            className="flex-row items-center gap-2.5 bg-[#F59E0B] rounded-[20px] py-4 px-7 w-full justify-center"
            style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setStage('done');
              onComplete();
            }}
          >
            <Ionicons name="camera-outline" size={18} color="#0F172A" />
            <Text className="text-[#0F172A] font-bold text-[15px]">Take a Photo for Widget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2"
            activeOpacity={0.7}
            onPress={() => {
              setStage('done');
              onComplete();
            }}
          >
            <Text className="text-[#475569] text-[14px] font-semibold">Skip photo →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const ENVELOPE_W = width - 48;
const ENVELOPE_H = ENVELOPE_W * 0.72;


