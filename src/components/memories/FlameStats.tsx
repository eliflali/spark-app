import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Memory } from '@/src/hooks/useMemories';

export function FlameStats({ memories, streak }: { memories: Memory[]; streak: number }) {
  const sparksCount = memories.filter(m => m.type === 'spark').length;
  const datesCount = memories.filter(m => m.type === 'date').length;

  return (
    <BlurView tint="dark" intensity={40} className="rounded-[24px] overflow-hidden my-6">
      <LinearGradient
        colors={['rgba(245,158,11,0.01)', 'transparent']}
        className="absolute top-0 bottom-0 left-0 right-0"
      />
      <View className="flex-row py-5 px-2 bg-slate-muted/5">
        <View className="flex-1 items-center gap-1">
          <Text className="text-glacier text-[20px] font-bold tracking-tight">{sparksCount}</Text>
          <Text className="text-slate-muted text-[11px] font-semibold">Sparks</Text>
        </View>
        <View className="w-[1px] bg-slate-muted/5 my-1" />
        <View className="flex-1 items-center gap-1">
          <Text className="text-glacier text-[20px] font-bold tracking-tight">{datesCount}</Text>
          <Text className="text-slate-muted text-[11px] font-semibold">Dates</Text>
        </View>
        <View className="w-[1px] bg-slate-muted/5 my-1" />
        <View className="flex-1 items-center gap-1">
          <Text className="text-glacier text-[20px] font-bold tracking-tight">{streak}</Text>
          <Text className="text-slate-muted text-[11px] font-semibold">Day Streak</Text>
        </View>
      </View>
    </BlurView>
  );
}
