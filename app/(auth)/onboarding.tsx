import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '💬',
    title: 'Daily Sparks',
    subtitle:
      'One meaningful question every day. Go deeper than "how was your day?" and actually connect.',
  },
  {
    id: '2',
    emoji: '🎨',
    title: 'Draw Together',
    subtitle:
      'A shared canvas that lives in your home screen widget. Leave each other little surprises.',
  },
  {
    id: '3',
    emoji: '🕯️',
    title: 'Guided Dates',
    subtitle:
      'Interactive date experiences designed for real connection — from cozy nights in to adventures out.',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      router.push('/(auth)/paywall');
    }
  };

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      {/* Slide pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            {/* Glow orb */}
            <View className="w-40 h-40 rounded-full items-center justify-center mb-10"
              style={{
                backgroundColor: 'rgba(245,158,11,0.12)',
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 48,
              }}>
              <Text style={{ fontSize: 72 }}>{item.emoji}</Text>
            </View>

            <Text className="text-glacier text-4xl font-bold text-center mb-4" style={{ letterSpacing: -0.5 }}>
              {item.title}
            </Text>
            <Text className="text-slate-muted text-lg text-center leading-7">
              {item.subtitle}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View className="flex-row justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className="rounded-full"
            style={{
              width: i === activeIndex ? 24 : 8,
              height: 8,
              backgroundColor: i === activeIndex ? '#F59E0B' : '#475569',
            }}
          />
        ))}
      </View>

      {/* CTA */}
      <View className="px-6 pb-12">
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          className="bg-spark rounded-3xl py-4 items-center"
          style={{
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
          }}>
          <Text className="text-midnight text-lg font-bold">
            {activeIndex < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
