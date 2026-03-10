import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export interface DeckData {
  deck_id: string;
  title: string;
  vibe: string;
  level: number;
  tag: string;
  scientific_basis: string;
  questions: string[];
}

interface Props {
  deck: DeckData;
  onPress: () => void;
  index: number;
}

const getGradientsForVibe = (vibe: string): readonly [string, string, string] => {
  switch (vibe) {
    case 'Curious & Light':
      return ['rgba(20, 184, 166, 0.4)', 'rgba(45, 212, 191, 0.2)', 'transparent']; // Teal
    case 'Meaningful':
      return ['rgba(245, 158, 11, 0.4)', 'rgba(251, 191, 36, 0.2)', 'transparent']; // Amber/Gold
    case 'Intimate':
      return ['rgba(244, 63, 94, 0.4)', 'rgba(251, 113, 133, 0.2)', 'transparent']; // Rose
    case 'Soulful':
      return ['rgba(139, 92, 246, 0.4)', 'rgba(167, 139, 250, 0.2)', 'transparent']; // Violet
    default:
      return ['rgba(56, 189, 248, 0.4)', 'rgba(125, 211, 252, 0.2)', 'transparent']; // Sky
  }
};

const getIconForVibe = (vibe: string): keyof typeof Ionicons.glyphMap => {
  switch (vibe) {
    case 'Curious & Light': return 'chatbubbles-outline';
    case 'Meaningful': return 'book-outline';
    case 'Intimate': return 'flame-outline';
    case 'Soulful': return 'infinite-outline';
    default: return 'help-circle-outline';
  }
};

export function ConversationDeckCard({ deck, onPress, index }: Props) {
  const gradients = getGradientsForVibe(deck.vibe);
  const iconName = getIconForVibe(deck.vibe);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.85}
        className="w-[160px] h-[200px] rounded-[24px] overflow-hidden"
        style={{
          shadowColor: gradients[0].replace('0.4', '1'),
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <BlurView 
          tint="dark" 
          intensity={40} 
          className="flex-1 border-[0.5px] border-white/20 p-4 justify-between"
        >
          {/* Background Mesh Gradient */}
          <LinearGradient
            colors={gradients}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Section: Tag & Level */}
          <View className="flex-row justify-between items-start">
            <View className="bg-white/10 px-2 py-1 rounded-xl border border-white/10">
              <Text className="text-glacier/80 text-[9px] font-bold tracking-widest uppercase">{deck.tag}</Text>
            </View>
          </View>

          {/* Bottom Section: Title, Vibe & Icon */}
          <View className="gap-2">
            <Ionicons name={iconName} size={24} color="rgba(255,255,255,0.9)" />
            <View>
              <Text className="text-glacier font-bold text-[18px] tracking-tight leading-6 mb-1">{deck.title}</Text>
              <Text className="text-slate-muted text-[11px] font-medium tracking-widest uppercase">{deck.vibe}</Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}
