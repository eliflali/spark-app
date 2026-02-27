import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Activity } from '@/src/components/date-engine/DateController';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  activity: Activity;
  category: string;
  onStartPress: () => void;
  onBrowseAllPress: () => void;
}

// Function to map mode to colors
const getGradientsForMode = (mode: string): readonly [string, string] => {
  switch (mode) {
    case 'RESONANCE': return ['rgba(244, 63, 94, 0.4)', 'rgba(244, 63, 94, 0)']; // Rose
    case 'DEEP_DIVE': return ['rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0)']; // Sky
    case 'ENVELOPE': return ['rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0)']; // Amber
    default: return ['rgba(168, 85, 247, 0.4)', 'rgba(168, 85, 247, 0)']; // Purple
  }
};

const getButtonColorsForMode = (mode: string): readonly [string, string] => {
  switch (mode) {
    case 'RESONANCE': return ['#FDA4AF', '#F43F5E'];
    case 'DEEP_DIVE': return ['#7DD3FC', '#0EA5E9'];
    case 'ENVELOPE': return ['#FBBF24', '#F59E0B'];
    default: return ['#D8B4FE', '#A855F7'];
  }
};

const getTextColorForMode = (mode: string) => {
  switch (mode) {
    case 'RESONANCE': return '#F43F5E';
    case 'DEEP_DIVE': return '#0EA5E9';
    case 'ENVELOPE': return '#F59E0B';
    default: return '#A855F7';
  }
};

export function TodayMatchCard({ activity, category, onStartPress, onBrowseAllPress }: Props) {
  const bgGradients = getGradientsForMode(activity.mode);
  const btnGradient = getButtonColorsForMode(activity.mode);
  const textColor = getTextColorForMode(activity.mode);

  return (
    <Animated.View entering={FadeInDown.duration(800)} className="px-5 mb-6">
      
      {/* Dynamic Activity-Specific Mesh Background (Fills Screen Behind) */}
      <View style={{ position: 'absolute', top: -350, bottom: -350, left: -200, right: -200 }} pointerEvents="none">
        <Animated.View entering={FadeIn.duration(1200)} style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={bgGradients}
            start={{ x: 0.5, y: 0.1 }}
            end={{ x: 0.5, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <BlurView 
        tint="dark" 
        intensity={30} 
        className="rounded-[32px] overflow-hidden border border-white/10" 
        style={{ 
          shadowColor: textColor, 
          shadowOffset: { width: 0, height: 16 }, 
          shadowOpacity: 0.45, 
          shadowRadius: 40, 
          elevation: 12 
        }}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.08)', 'transparent']}
          className="absolute top-0 bottom-0 left-0 right-0"
        />
        
        <View className="p-7">
          <Animated.View entering={FadeInDown.delay(300)}>
            
            <Text className="text-white/60 text-[13px] font-bold tracking-widest uppercase mb-2">
              Based on your vibe
            </Text>
            
            <Text className="text-glacier text-[28px] font-black tracking-tighter leading-9 mb-3">
              {activity.title}
            </Text>
            
            <Text className="text-glacier/50 text-[14px] leading-6 mb-8 font-medium">
              {activity.desc}
            </Text>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(500)} className="gap-4">
            {/* Start Button */}
            <View className="relative">
              <TouchableOpacity
                onPress={onStartPress}
                activeOpacity={0.85}
                className="rounded-[20px] py-3 items-center overflow-hidden"
              >
                <LinearGradient
                  colors={btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
                />
                <View className="flex-row items-center gap-2">
                  <Text className="text-white font-black text-[15px] tracking-wide">Start Date</Text>
                  
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onBrowseAllPress}
              activeOpacity={0.7}
              className="py-2 items-end px-2"
            >
              <View className="flex-row items-center gap-1">
                <Text className="text-white/80 font-bold text-[12px] tracking-wide">Browse Library</Text>
                <Ionicons name="arrow-forward" size={15} color="white" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </BlurView>
    </Animated.View>
  );
}
