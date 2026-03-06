import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Memory } from '@/src/hooks/useMemories';

export function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  // Determine dynamic title
  let dynamicTitle = memory.title;
  if (memory.type === 'photo') {
    dynamicTitle = "A photo to remember";
  } else if (memory.type === 'note') {
    dynamicTitle = "A sweet note";
  } else if (memory.type === 'spark') {
    dynamicTitle = "Today's Spark";
  } else if (memory.type === 'date') {
    dynamicTitle = `Guided Date: ${memory.title}`;
  }

  // Determine icon
  const getIcon = () => {
    if (memory.type === 'spark') return <Ionicons name="sparkles" size={14} color={memory.color} />;
    if (memory.type === 'date') return <Ionicons name="calendar" size={14} color={memory.color} />;
    if (memory.type === 'photo') return <Ionicons name="image" size={14} color={memory.color} />;
    if (memory.type === 'note') return <Ionicons name="mail" size={14} color={memory.color} />;
    return <Ionicons name="star" size={14} color={memory.color} />;
  }

  const isPhoto = memory.type === 'photo';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity 
        className={`flex-row rounded-[24px] overflow-hidden bg-white/5 border border-white/5 relative ${isPhoto ? 'min-h-[220px]' : 'min-h-[140px]'}`} 
        activeOpacity={0.85}
      >
        <BlurView tint="dark" intensity={25} style={StyleSheet.absoluteFillObject} />

        {isPhoto && (
          <Image source={{ uri: memory.preview }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        )}

        {/* Left Glowing Indicator */}
        <View className="absolute left-0 top-0 bottom-0 w-[2px] items-center justify-center pt-6 pb-6 shadow-xl" style={{ shadowColor: memory.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 }}>
          <LinearGradient colors={[memory.color, 'transparent']} className="w-full h-full" />
        </View>

        {isPhoto ? (
          // Photo Layout (Full Bleed with bottom overlay)
          <View className="flex-1 justify-end">
             <LinearGradient colors={['transparent', 'rgba(15,23,42,0.8)', 'rgba(2,6,23,1)']} className="absolute bottom-0 left-0 right-0 h-2/3" />
             <View className="p-4 pt-10 pl-5">
               <View className="flex-row items-center gap-2 mb-1">
                 {getIcon()}
                 <Text className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-widest">
                   {memory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                 </Text>
               </View>
               <Text className="text-glacier text-[16px] font-serif tracking-tight leading-5">{dynamicTitle}</Text>
             </View>
          </View>
        ) : (
          // Standard/Note Layout
          <View className="flex-1 p-4 pl-5 gap-3 justify-between">
            <View>
              <View className="flex-row items-center gap-2 mb-2 w-full">
                <View className="flex-row items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: memory.color + '15' }}>
                  {getIcon()}
                </View>
                <Text className="text-[#94A3B8] text-[9px] font-semibold uppercase tracking-widest shrink-0">
                  {memory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              
              <Text className="text-glacier text-[15px] font-serif tracking-tight leading-5">{dynamicTitle}</Text>
            </View>

            {/* Preview Content */}
            <View className="mt-1">
              {memory.type === 'note' ? (
                <Text className="text-glacier/90 text-[15px] font-serif leading-6 italic tracking-wide">"{memory.preview}"</Text>
              ) : (
                <Text className="text-[#94A3B8] text-[12px] leading-5" numberOfLines={4}>{memory.preview}</Text>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
