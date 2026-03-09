import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  StyleSheet,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { ONBOARDING_KEY } from '@/src/lib/constants';
import { useMemories, Memory, MemoryType } from '@/src/hooks/useMemories';
import { useStreak } from '@/src/hooks/useStreak';

import { MemoryCard } from '@/src/components/memories/MemoryCard';
import { FlameStats } from '@/src/components/memories/FlameStats';
import { HeatmapCalendar } from '@/src/components/memories/HeatmapCalendar';
import { LinearGradient } from 'expo-linear-gradient';

export default function MemoriesScreen() {
  const { user, signOut } = useAuth();
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { memories, isLoading } = useMemories();
  const { streak } = useStreak();

  const handleSettingsMenu = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Sign Out', 'Reset App', 'Delete My Account'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 3,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          // Sign Out
          signOut();
        } else if (buttonIndex === 2) {
          // Reset
          Alert.alert('🛠 Debug', 'Reset to fresh-install state?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                await SecureStore.deleteItemAsync(ONBOARDING_KEY);
                await signOut();
              },
            },
          ]);
        } else if (buttonIndex === 3) {
          // Delete
          Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and will permanently erase your memories and data.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { error } = await supabase.rpc('delete_user');
                    if (error) throw error;
                    await signOut();
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to delete account');
                  }
                },
              },
            ]
          );
        }
      }
    );
  };

  const filters: Array<{ key: MemoryType | 'all'; label: string }> = [
    { key: 'all', label: '✦ All' },
    { key: 'spark', label: 'Sparks' },
    { key: 'date', label: 'Dates' },
    { key: 'photo', label: 'Photos' },
    { key: 'note', label: 'Notes' },
  ];

  const filtered = memories.filter((m) => {
    if (filter !== 'all' && m.type !== filter) return false;
    if (selectedDate && m.date.toISOString().split('T')[0] !== selectedDate) return false;
    return true;
  });

  // Group by month
  const groupedByMonth = filtered.reduce((acc, mem) => {
    const monthYear = mem.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(mem);
    return acc;
  }, {} as Record<string, Memory[]>);

  const isIdle = filter === 'all' && !selectedDate;

  // We need to build a single array of React elements to pass to ScrollView as direct children.
  // This allows `stickyHeaderIndices` to correctly target the month headers.
  const scrollChildren: React.ReactNode[] = [];
  const stickyIndices: number[] = [];

  // 1. Top Section (Index 0)
  scrollChildren.push(
    <View key="top-section" className="px-5 gap-4 mb-6 mt-6">
      <Animated.View entering={FadeInDown.delay(50).springify()} className="mb-1 flex-row items-center justify-between">
        <View>
          <Text className="text-glacier text-[30px] font-bold tracking-tighter">Our Flame</Text>
          <Text className="text-slate-muted text-[14px] mt-0.5">Your shared journey together</Text>
        </View>
        <TouchableOpacity onPress={handleSettingsMenu} className="w-10 h-10 items-center justify-center" activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <FlameStats memories={memories} streak={streak} />
      </Animated.View>

      {/* Heatmap Calendar */}
      <Animated.View entering={FadeInDown.delay(120).springify()}>
        <HeatmapCalendar 
          memories={memories} 
          selectedDate={selectedDate} 
          onSelectDate={setSelectedDate} 
        />
      </Animated.View>

      {/* Filter Pills */}
      <Animated.View entering={FadeInDown.delay(140).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3.5 py-[7px] rounded-full border ${filter === f.key ? 'bg-[#F59E0B]/15 border-[#F59E0B]' : 'bg-white/5 border-white/5'}`}
              activeOpacity={0.8}
            >
              <Text className={`text-[13px] font-semibold ${filter === f.key ? 'text-[#F59E0B]' : 'text-[#64748B]'}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );

  // 2. Main Content
  if (isIdle) {
    scrollChildren.push(
      <Animated.View key="idle" entering={FadeIn} className="items-center justify-center pt-10 px-6">
        <View className="w-16 h-16 rounded-full items-center justify-center">
          <Ionicons name="map" size={28} color="#F8FAFC" />
        </View>
        <Text className="text-glacier text-[18px] font-semibold text-center mb-2">Explore Your Journey</Text>
        <Text className="text-slate-muted text-[14px] text-center leading-5">
          Select a glowing flame on the map above to view the memories from that day, or use the filters to browse by category.
        </Text>
      </Animated.View>
    );
  } else if (filtered.length === 0) {
    scrollChildren.push(
      <View key="empty" className="items-center pt-[60px]">
        <View className="w-16 h-16 items-center justify-center">
          <Ionicons name="flame-outline" size={28} color="#F8FAFC" />
        </View>
        <Text className="text-glacier text-[18px] font-bold mb-1.5">No memories found</Text>
        <Text className="text-slate-muted text-[14px] text-center leading-[21px]">Try selecting a different date or filter.</Text>
      </View>
    );
  } else {
    // Top of results
    scrollChildren.push(
      <View key="results-count" className="px-5 mb-2">
        <Text className="text-slate-muted text-[12px] font-semibold uppercase tracking-wide">
          {filtered.length} {filter === 'all' && !selectedDate ? 'memories' : 'results'} found
        </Text>
      </View>
    );

    // Grouped Month Lists
    Object.entries(groupedByMonth).forEach(([monthLabel, monthMemories], idx) => {
      // Note index of header
      stickyIndices.push(scrollChildren.length);
      
      // Push header
      scrollChildren.push(
        <View key={`header-${monthLabel}`} className="bg-[#0F172A] py-3 mb-2 px-5 z-20 border-b border-spark/10">
          <Text className="text-[#FBBF24] text-[18px] font-serif tracking-tight">{monthLabel}</Text>
        </View>
      );

      // Split for masonry
      const leftCol: Memory[] = [];
      const rightCol: Memory[] = [];
      monthMemories.forEach((mem, i) => {
        if (i % 2 === 0) leftCol.push(mem);
        else rightCol.push(mem);
      });

      // Push grid
      scrollChildren.push(
        <View key={`grid-${monthLabel}`} className="flex-row gap-3 px-5 pt-2 pb-8 bg-[#0F172A] z-0">
          <View className="flex-1 gap-3">
            {leftCol.map((memory, index) => <MemoryCard key={memory.id} memory={memory} index={index} />)}
          </View>
          <View className="flex-1 gap-3">
            {rightCol.map((memory, index) => <MemoryCard key={memory.id} memory={memory} index={index} />)}
          </View>
        </View>
      );
    });
  }

  return (
    <View className="flex-1 bg-midnight">
      <LinearGradient
        colors={['rgba(142, 154, 175, 0.03)', 'rgba(142, 154, 175, 0.01)']}
        style={StyleSheet.absoluteFillObject}
      />
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={stickyIndices}
      >
        {scrollChildren}
      </ScrollView>
    </View>
  );
}


