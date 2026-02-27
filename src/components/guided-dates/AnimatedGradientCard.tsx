import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '@/src/components/date-engine/DateController';

import { Mode } from './types';
import { getModeColors, MODE_CONFIG, MODE_TIME } from './constants';
import { AnimatedBlob, type BlobConfig } from './AnimatedBlob';

export function AnimatedGradientCard({
  activity,
  category,
  onPress,
}: {
  activity: Activity;
  category: string;
  onPress: () => void;
}) {
  const cfg = MODE_CONFIG[activity.mode as Mode];
  const [color1, color2] = getModeColors(activity.mode);
  const timeLabel = MODE_TIME[activity.mode as Mode] ?? '20m';

  // 3 blobs, each with unique start/end positions and timing
  const blobs: BlobConfig[] = [
    {
      startX: -30,
      startY: -30,
      endX: 20,
      endY: 40,
      duration: 7000,
      color: color1,
      size: 140,
    },
    {
      startX: 60,
      startY: 20,
      endX: 10,
      endY: -20,
      duration: 9500,
      color: color2,
      size: 120,
    },
    {
      startX: 20,
      startY: 80,
      endX: 60,
      endY: 40,
      duration: 11000,
      color: color1,
      size: 100,
    },
  ];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} className="w-[140px] h-[150px] rounded-[24px] border-[0.5px] border-white/20 overflow-hidden">
      {/* Dark base */}
      <View className="absolute top-0 bottom-0 left-0 right-0 bg-[#0F172A] rounded-[24px]" />

      {/* Lava-lamp blobs (clipped by overflow:hidden on card) */}
      <View className="absolute top-0 bottom-0 left-0 right-0" pointerEvents="none">
        {blobs.map((b, i) => (
          <AnimatedBlob key={i} config={b} />
        ))}
      </View>

      {/* Blur overlay for glassmorphism */}
      <BlurView tint="dark" intensity={55} className="absolute top-0 bottom-0 left-0 right-0" />

      {/* Top glass sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'transparent']}
        className="absolute top-0 left-0 right-0 h-1/2"
        pointerEvents="none"
      />

      {/* Card content */}
      <View className="flex-1 p-3.5 justify-between">
        {/* Mode badge top-right */}
        <View className="flex-row items-start">
          <View className="flex-1" />
          <View className="px-2 py-1 rounded-xl border-[0.5px] items-center justify-center" style={{ backgroundColor: cfg.bg, borderColor: cfg.color }}>
            <Text className="text-[10px] font-bold tracking-wide uppercase" style={{ color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>

        {/* Title + time pill at bottom */}
        <View className="gap-2.5">
          <Text className="text-white text-[15px] font-bold tracking-tight leading-[21px]" numberOfLines={3}>
            {activity.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
