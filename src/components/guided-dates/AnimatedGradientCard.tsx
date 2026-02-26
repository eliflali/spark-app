import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Activity } from '@/src/components/date-engine/DateController';

import { Mode } from './types';
import { getModeColors, MODE_CONFIG, MODE_TIME } from './constants';
import { AnimatedBlob, type BlobConfig } from './AnimatedBlob';
import { styles } from './styles';

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
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.card}>
      {/* Dark base */}
      <View style={[StyleSheet.absoluteFillObject, styles.cardBase]} />

      {/* Lava-lamp blobs (clipped by overflow:hidden on card) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {blobs.map((b, i) => (
          <AnimatedBlob key={i} config={b} />
        ))}
      </View>

      {/* Blur overlay for glassmorphism */}
      <BlurView tint="dark" intensity={55} style={StyleSheet.absoluteFillObject} />

      {/* Top glass sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'transparent']}
        style={[StyleSheet.absoluteFillObject, { height: '50%' }]}
        pointerEvents="none"
      />

      {/* Card content */}
      <View style={styles.cardContent}>
        {/* Mode icon top-right */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }} />
          <View style={[styles.modeIconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
          </View>
        </View>

        {/* Title + time pill at bottom */}
        <View style={styles.cardBottom}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {activity.title}
          </Text>
          <View style={styles.timePill}>
            <Text style={styles.timePillText}>{timeLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
