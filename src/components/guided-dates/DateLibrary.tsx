import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { type Category } from '@/src/components/guided-dates/types';
import { type Activity } from '@/src/components/date-engine/DateController';
import { AnimatedGradientCard } from '@/src/components/guided-dates/AnimatedGradientCard';

interface DateLibraryProps {
  categories: Category[];
  onCardPress: (activity: Activity, basis: string, category: string) => void;
}

export function DateLibrary({ categories, onCardPress }: DateLibraryProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <View>
      {categories.map((cat, ci) => (
        <Animated.View key={cat.category} entering={FadeInDown.delay(150 + ci * 40).springify()}>
          <View className="px-5 mb-4">
            <Text className="text-glacier text-[18px] font-bold tracking-tighter">{cat.category}</Text>
            <Text className="text-slate-muted text-[12px] mt-1 italic">{cat.scientific_basis}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 30 }}
            snapToInterval={176}
            decelerationRate="fast"
          >
            {cat.activities.map((activity) => (
              <AnimatedGradientCard
                key={activity.id}
                activity={activity as Activity}
                category={cat.category}
                onPress={() => onCardPress(activity as Activity, cat.scientific_basis, cat.category)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      ))}
    </View>
  );
}
