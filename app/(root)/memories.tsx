import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useMemories, Memory, MemoryType } from '@/src/hooks/useMemories';

// ── Memory Card ───────────────────────────────────────────────────────────────

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity className="flex-row bg-white/5 rounded-[20px] border border-white/5 overflow-hidden" activeOpacity={0.85}>
        {/* Left accent bar */}
        <View className="w-[3px] rounded-tl-[20px] rounded-bl-[20px]" style={{ backgroundColor: memory.color }} />

        <View className="flex-1 p-4 gap-2.5">
          {/* Emoji + Date row */}
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-[13px] items-center justify-center shrink-0" style={{ backgroundColor: memory.color + '20' }}>
              <Text style={{ fontSize: 20 }}>{memory.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#475569] text-[11px] font-semibold uppercase tracking-wide mb-0.5">
                {memory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text className="text-[#F8FAFC] text-[15px] font-bold tracking-tight">{memory.title}</Text>
            </View>
            <View className="px-2.5 py-1 rounded-[10px] border shrink-0" style={{ backgroundColor: memory.color + '18', borderColor: memory.color + '44' }}>
              <Text className="text-[10px] font-bold" style={{ color: memory.color }}>
                {memory.type === 'spark' ? '✦ Spark' : memory.type === 'date' ? '📅 Date' : '📸 Photo'}
              </Text>
            </View>
          </View>

          {/* Preview */}
          <Text className="text-[#64748B] text-[13px] leading-5" numberOfLines={2}>{memory.preview}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Flame Stats ───────────────────────────────────────────────────────────────

function FlameStats() {
  return (
    <BlurView tint="dark" intensity={40} className="rounded-[24px] overflow-hidden border border-[#F59E0B]/15">
      <LinearGradient
        colors={['rgba(245,158,11,0.06)', 'transparent']}
        className="absolute top-0 bottom-0 left-0 right-0"
      />
      <View className="flex-row py-5 px-2 bg-white/5">
        <View className="flex-1 items-center gap-1">
          <Text className="text-[#F8FAFC] text-[22px] font-bold tracking-tight">6</Text>
          <Text className="text-[#475569] text-[12px] font-semibold">Sparks</Text>
        </View>
        <View className="w-[1px] bg-white/5 my-1" />
        <View className="flex-1 items-center gap-1">
          <Text className="text-[#F8FAFC] text-[22px] font-bold tracking-tight">2</Text>
          <Text className="text-[#475569] text-[12px] font-semibold">Dates</Text>
        </View>
        <View className="w-[1px] bg-white/5 my-1" />
        <View className="flex-1 items-center gap-1">
          <Text className="text-[#F8FAFC] text-[22px] font-bold tracking-tight">🔥 7</Text>
          <Text className="text-[#475569] text-[12px] font-semibold">Day Streak</Text>
        </View>
      </View>
    </BlurView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');
  const { memories, isLoading } = useMemories();

  const filters: Array<{ key: MemoryType | 'all'; label: string }> = [
    { key: 'all', label: '✦ All' },
    { key: 'spark', label: '✨ Sparks' },
    { key: 'date', label: '📅 Dates' },
    { key: 'photo', label: '📸 Photos' },
  ];

  const filtered =
    filter === 'all' ? memories : memories.filter((m) => m.type === filter);

  return (
    <View className="flex-1 bg-[#0F172A]">
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className="mb-1">
          <Text className="text-[#F8FAFC] text-[30px] font-bold tracking-tighter">Our Flame</Text>
          <Text className="text-[#475569] text-[14px] mt-0.5">Your shared journey together</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <FlameStats />
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

        {/* Section title */}
        <Text className="text-[#64748B] text-[13px] font-semibold uppercase tracking-wide">
          {filtered.length} {filter === 'all' ? 'memories' : filter + 's'} together
        </Text>

        {/* Memory cards */}
        <View className="gap-2.5">
          {filtered.map((memory, index) => (
            <MemoryCard key={memory.id} memory={memory} index={index} />
          ))}
        </View>

        {/* Empty state */}
        {filtered.length === 0 && (
          <View className="items-center pt-[60px]">
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
            <Text className="text-[#E2EAF4] text-[18px] font-bold mb-1.5">No memories yet</Text>
            <Text className="text-[#475569] text-[14px] text-center leading-[21px]">Complete sparks and dates to build your flame.</Text>
          </View>
        )}

        <View className="h-[120px]" />
      </ScrollView>
    </View>
  );
}


