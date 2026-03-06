import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Memory } from '@/src/hooks/useMemories';

interface HeatmapCalendarProps {
  memories: Memory[];
  selectedDate: string | null;
  onSelectDate: (dateString: string | null) => void;
}

export function HeatmapCalendar({ memories, selectedDate, onSelectDate }: HeatmapCalendarProps) {
  // Generate last 24 weeks (168 days)
  const WEEKS = 24;
  const DAYS = WEEKS * 7;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Calculate start date (Sunday of 24 weeks ago)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - DAYS + 1 + (6 - today.getDay()));

  // Create a map of date strings to memory counts
  const memoryCounts = memories.reduce((acc, memory) => {
    const dStr = memory.date.toISOString().split('T')[0];
    acc[dStr] = (acc[dStr] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Build grid data: weeks array containing days array
  const weeks = [];
  const monthLabels: { month: string, index: number }[] = [];
  let currentMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (w * 7) + d);
      const isFuture = date > today;
      const dateString = date.toISOString().split('T')[0];
      
      // Check for month label (only add if it's the first week of the month)
      if (d === 0) {
        if (date.getMonth() !== currentMonth) {
          monthLabels.push({ 
            month: date.toLocaleDateString('en-US', { month: 'short' }), 
            index: w 
          });
          currentMonth = date.getMonth();
        }
      }

      weekDays.push({
        date,
        dateString,
        count: isFuture ? -1 : (memoryCounts[dateString] || 0),
        isFuture
      });
    }
    weeks.push(weekDays);
  }

  const getColor = (count: number) => {
    if (count === -1) return 'transparent';
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count === 1) return 'rgba(245,158,11,0.3)'; // Dim amber
    if (count === 2) return 'rgba(245,158,11,0.6)'; // Medium amber
    return 'rgba(245,158,11,1.0)'; // Bright glow for 3+
  };

  const handlePress = (dateString: string, count: number) => {
    if (count === -1) return; // Ignore future dates
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDate === dateString) {
      onSelectDate(null); // Deselect
    } else {
      onSelectDate(dateString);
    }
  };

  return (
    <Animated.View entering={FadeIn.delay(120)} className="w-full">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        <View>
          {/* Month Labels */}
          <View className="flex-row mb-2 h-4 relative">
            {monthLabels.map((lbl, idx) => (
              <Text 
                key={idx} 
                className="text-[#64748B] text-[10px] font-semibold uppercase absolute"
                style={{ left: lbl.index * 24 }} // 20px width + 4px gap
              >
                {lbl.month}
              </Text>
            ))}
          </View>

          <View className="flex-row gap-1">
          {weeks.map((week, wIdx) => (
            <View key={wIdx} className="gap-1">
              {week.map((day, dIdx) => {
                const isSelected = selectedDate === day.dateString;
                return (
                  <TouchableOpacity
                    key={dIdx}
                    activeOpacity={0.7}
                    onPress={() => handlePress(day.dateString, day.count)}
                    disabled={day.isFuture}
                    className="w-[20px] h-[20px] rounded-[4px]"
                    style={{ 
                      backgroundColor: getColor(day.count),
                      borderWidth: isSelected ? 1.5 : 0.5,
                      borderColor: isSelected ? '#FBBF24' : 'rgba(255,255,255,0.05)',
                      shadowColor: day.count > 1 ? '#F59E0B' : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: day.count > 1 ? 0.5 : 0,
                      shadowRadius: day.count > 1 ? 6 : 0,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
        </View>
      </ScrollView>
      
      {/* Active Filter Hint */}
      {selectedDate && (
        <Animated.View entering={FadeIn} className="flex-row items-center justify-between mt-3 bg-spark/10 px-3 py-2 rounded-xl border border-spark/20 mx-1">
          <Text className="text-spark text-[12px] font-semibold">
            Showing memories for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => onSelectDate(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color="#FBBF24" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}
