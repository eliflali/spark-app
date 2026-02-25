import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

export function SelectionCard({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  // Animate scale to 1.02 when selected, back to 1 when unselected
  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.02 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  const handlePress = () => {
    if (!selected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 16 }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <BlurView
          tint="dark"
          intensity={selected ? 40 : 20}
          className="flex-row items-center gap-5 px-6 py-6 rounded-3xl overflow-hidden"
          style={{
            borderWidth: selected ? 2 : 1, // slightly thicker when selected
            borderColor: selected ? '#F59E0B' : 'rgba(255,255,255,0.2)', // glow color vs crisp thin white
            backgroundColor: selected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.1)', // bg-white/10
            shadowColor: selected ? '#F59E0B' : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: selected ? 0.3 : 0,
            shadowRadius: 10,
          }}>
          <Image source={icon} style={{ width: 36, height: 36, resizeMode: 'contain', tintColor: '#cbd5e1' }} />
          <Text
            className="text-lg flex-1"
            style={{ color: selected ? '#FFF' : '#cbd5e1', fontWeight: selected ? '600' : '500' }}>
            {label}
          </Text>
          {selected && (
            <View className="w-6 h-6 rounded-full items-center justify-center bg-spark">
              <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '800' }}>✓</Text>
            </View>
          )}
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}
