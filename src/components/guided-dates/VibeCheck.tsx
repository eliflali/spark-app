import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';

export interface VibeData {
  location: string;
  energy: string;
  vibe: string;
}

interface Props {
  onComplete: (vibeData: VibeData) => void;
}

const GRADIENTS: readonly [string, string][] = [
  ['rgba(56, 189, 248, 0.3)', 'rgba(56, 189, 248, 0)'], // Step 0: Spark
  ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0)'], // Step 1: Blue
  ['rgba(249, 115, 22, 0.3)', 'rgba(249, 115, 22, 0)'], // Step 2: Orange
  ['rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0)'], // Step 3: Purple
];

const getHighlightColors = (step: number) => {
  switch(step) {
    case 1: return { bg: 'rgba(59, 130, 246, 0.4)', border: 'rgba(59, 130, 246, 0.8)' }; // Blue
    case 2: return { bg: 'rgba(249, 115, 22, 0.4)', border: 'rgba(249, 115, 22, 0.8)' }; // Orange
    case 3: return { bg: 'rgba(168, 85, 247, 0.4)', border: 'rgba(168, 85, 247, 0.8)' }; // Purple
    default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' };
  }
};

const GradientLayer = ({ colors, isActive }: { colors: readonly [string, string], isActive: boolean }) => {
  const opacity = useSharedValue(isActive ? 1 : 0);
  
  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0, { duration: 800 });
  }, [isActive, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient colors={colors} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 0.8 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
};

const BackgroundGlow = ({ step }: { step: number }) => {
  return (
    <View style={{ position: 'absolute', top: -300, bottom: -300, left: -200, right: -200 }} pointerEvents="none">
      {GRADIENTS.map((colors, index) => {
        const isActive = step === index;
        return <GradientLayer key={index} colors={colors} isActive={isActive} />;
      })}
    </View>
  );
};

export function VibeCheck({ onComplete }: Props) {
  const [step, setStep] = useState(0); // 0 = start, 1 = location, 2 = energy, 3 = vibe
  const [vibeData, setVibeData] = useState<Partial<VibeData>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const { bg: highlightBg, border: highlightBorder } = getHighlightColors(step);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
  };

  const handleAnswer = (key: keyof VibeData, value: string) => {
    if (selectedAnswer !== null) return; // Prevent multiple taps
    Haptics.selectionAsync();
    setSelectedAnswer(value);
    
    setTimeout(() => {
      const newData = { ...vibeData, [key]: value };
      setVibeData(newData);
      setSelectedAnswer(null); // Clear selected answer for the next step
      
      if (step < 3) {
        setStep(step + 1);
      } else {
        onComplete(newData as VibeData);
      }
    }, 550); // Pause to hold the selection on screen briefly
  };

  return (
    <Animated.View layout={Layout.springify()} className="px-5 mb-6 mt-5">
      <BackgroundGlow step={step} />

      {/* Progress Bar */}
      {step > 0 && (
        <Animated.View entering={FadeIn} exiting={FadeOut} className="mb-4 px-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white/60 text-[11px] font-extrabold tracking-widest uppercase">
              Step {step} of 3
            </Text>
          </View>
          <View className="h-1 bg-white/10 rounded-full overflow-hidden">
            <MotiView
              className="h-full bg-white shadow-sm shadow-white"
              animate={{
                width: `${(step / 3) * 100}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }}
              transition={{
                type: 'timing',
                duration: 600,
              }}
            />
          </View>
        </Animated.View>
      )}

      <BlurView 
        tint="dark" 
        intensity={25} 
        className="rounded-[32px] overflow-hidden border border-white/10" 
        style={{ 
          shadowColor: step === 1 ? '#3B82F6' : step === 2 ? '#F97316' : step === 3 ? '#A855F7' : '#38BDF8', 
          shadowOffset: { width: 0, height: 12 }, 
          shadowOpacity: 0.2, 
          shadowRadius: 30, 
          elevation: 8 
        }}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.0)']}
          className="absolute top-0 bottom-0 left-0 right-0"
        />
        
        <View className="p-7">
          {step === 0 && (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="gap-5">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="sparkles" size={24} color="#38BDF8" />
                <View>
                  <Text className="text-[#38BDF8] text-[13px] font-black tracking-widest uppercase">Daily Spark</Text>
                </View>
              </View>
              <Text className="text-glacier text-[25px] font-black tracking-tighter leading-9">
                Not sure what to do?{'\n'}Let&apos;s find your vibe.
              </Text>
              
              <TouchableOpacity
                onPress={handleStart}
                activeOpacity={0.8}
                className="rounded-full overflow-hidden mt-2 self-start"
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <BlurView intensity={20} tint="light" className="px-6 py-3 flex-row items-center gap-2">
                  <Text className="text-white font-bold text-[14px] tracking-wider">Start Vibe Check</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="gap-5">
              <Text className="text-glacier text-[24px] font-black tracking-tighter leading-8">Where are you right now?</Text>
              <View className="flex-row gap-3 mt-2">
                <MotiPressable
                  onPress={() => handleAnswer('location', 'INDOOR')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'INDOOR';
                    return {
                      scale: pressed ? 0.96 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.card}
                >
                  <Ionicons name="home-outline" size={28} color={selectedAnswer === 'INDOOR' ? highlightBorder : "#F8FAFC"} className="mb-3" />
                  <Text className="text-white font-bold text-[16px] tracking-wide mt-2">Indoor</Text>
                </MotiPressable>

                <MotiPressable
                  onPress={() => handleAnswer('location', 'OUTDOOR')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'OUTDOOR';
                    return {
                      scale: pressed ? 0.96 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.card}
                >
                  <Ionicons name="leaf-outline" size={28} color={selectedAnswer === 'OUTDOOR' ? highlightBorder : "#F8FAFC"} className="mb-3" />
                  <Text className="text-white font-bold text-[16px] tracking-wide mt-2">Outdoor</Text>
                </MotiPressable>
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="gap-5">
              <Text className="text-[#F8FAFC] text-[26px] font-black tracking-tighter leading-8">What&apos;s the energy level?</Text>
              <View className="flex-row gap-3 mt-2">
                <MotiPressable
                  onPress={() => handleAnswer('energy', 'LOW')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'LOW';
                    return {
                      scale: pressed ? 0.96 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.card}
                >
                  <Ionicons name="cafe-outline" size={28} color={selectedAnswer === 'LOW' ? highlightBorder : "#F8FAFC"} className="mb-3" />
                  <Text className="text-white font-bold text-[15px] tracking-wide text-center mt-2">Low / Chill</Text>
                </MotiPressable>

                <MotiPressable
                  onPress={() => handleAnswer('energy', 'HIGH')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'HIGH';
                    return {
                      scale: pressed ? 0.96 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.card}
                >
                  <Ionicons name="flash-outline" size={28} color={selectedAnswer === 'HIGH' ? highlightBorder : "#F8FAFC"} className="mb-3" />
                  <Text className="text-white font-bold text-[15px] tracking-wide text-center mt-2">High / Active</Text>
                </MotiPressable>
              </View>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="gap-5">
              <Text className="text-[#F8FAFC] text-[26px] font-black tracking-tighter leading-8">What vibe are you seeking?</Text>
              <View className="gap-3 mt-2">
                <MotiPressable
                  onPress={() => handleAnswer('vibe', 'Romantic')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'Romantic';
                    return {
                      scale: pressed ? 0.98 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.rowCard}
                >
                  <Ionicons name="heart-outline" size={28} color={selectedAnswer === 'Romantic' ? highlightBorder : "#F8FAFC"} className="mr-5" />
                  <Text className="text-white font-bold text-[16px] tracking-wide flex-1">Romantic & Present</Text>
                  <Ionicons name="chevron-forward" size={20} color={selectedAnswer === 'Romantic' ? highlightBorder : "rgba(255,255,255,0.3)"} />
                </MotiPressable>

                <MotiPressable
                  onPress={() => handleAnswer('vibe', 'Deep')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'Deep';
                    return {
                      scale: pressed ? 0.98 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.rowCard}
                >
                  <Ionicons name="planet-outline" size={28} color={selectedAnswer === 'Deep' ? highlightBorder : "#F8FAFC"} className="mr-5" />
                  <Text className="text-white font-bold text-[16px] tracking-wide flex-1">Deep & Philosophical</Text>
                  <Ionicons name="chevron-forward" size={20} color={selectedAnswer === 'Deep' ? highlightBorder : "rgba(255,255,255,0.3)"} />
                </MotiPressable>

                <MotiPressable
                  onPress={() => handleAnswer('vibe', 'Fun')}
                  animate={({ pressed }) => {
                    'worklet'
                    const isSelected = selectedAnswer === 'Fun';
                    return {
                      scale: pressed ? 0.98 : (isSelected ? 1.02 : 1),
                      opacity: (pressed && !isSelected) ? 0.8 : 1,
                      backgroundColor: isSelected ? highlightBg : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isSelected ? highlightBorder : 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  style={styles.rowCard}
                >
                  <Ionicons name="game-controller-outline" size={28} color={selectedAnswer === 'Fun' ? highlightBorder : "#F8FAFC"} className="mr-5" />
                  <Text className="text-white font-bold text-[16px] tracking-wide flex-1">Fun & Playful</Text>
                  <Ionicons name="chevron-forward" size={20} color={selectedAnswer === 'Fun' ? highlightBorder : "rgba(255,255,255,0.3)"} />
                </MotiPressable>
              </View>
            </Animated.View>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    width: 150,
  },
  rowCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  }
});
