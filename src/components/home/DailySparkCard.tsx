import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { PartnerProfile } from './types';

export function DailySparkCard({
  loadingData,
  spark,
  sparkError,
  sparkState,
  draftAnswer,
  setDraftAnswer,
  myAnswer,
  partner,
  partnerAnswer,
  handleSubmitAnswer,
  submitting,
}: {
  loadingData: boolean;
  spark: any;
  sparkError: string | null;
  sparkState: 'pending' | 'waiting' | 'revealed';
  draftAnswer: string;
  setDraftAnswer: (text: string) => void;
  myAnswer: any;
  partner: PartnerProfile | null;
  partnerAnswer: any;
  handleSubmitAnswer: () => void;
  submitting: boolean;
}) {
  const { width: screenWidth } = Dimensions.get('window');
  // Card padding is 24px on each side + 20px padding horizontal for the screen = 88px total padding approximately.
  // Actually, we can measure it dynamically, but let's use a roughly correct fixed width or flex-1 in a parent.
  const [containerWidth, setContainerWidth] = useState(screenWidth - 40 - 48); // 20px page padding, 24px card padding.

  const [isWriting, setIsWriting] = useState(false);
  const [expandedAnswer, setExpandedAnswer] = useState<{ title: string; text: string } | null>(
    null
  );
  const [activeSlide, setActiveSlide] = useState(0);

  const lockScale = useSharedValue(1);
  const lockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));
  useEffect(() => {
    if (sparkState === 'waiting') {
      lockScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      lockScale.value = withTiming(1.0, { duration: 200 });
    }
  }, [sparkState]);

  const revealScale = useSharedValue(0.85);
  const revealOpacity = useSharedValue(0);
  const revealAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revealScale.value }],
    opacity: revealOpacity.value,
  }));
  useEffect(() => {
    if (sparkState === 'revealed') {
      revealScale.value = withSpring(1, { damping: 14, stiffness: 120 });
      revealOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [sparkState]);

  const meshAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withRepeat(
          withSequence(withTiming(1.2, { duration: 4000 }), withTiming(1, { duration: 4000 })),
          -1,
          true
        ),
      },
      {
        rotate: withRepeat(
          withTiming('360deg', { duration: 20000, easing: Easing.linear }),
          -1,
          false
        ),
      },
    ],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(160).springify()} className="relative">
      {/* Background Mesh for the whole Daily Spark section */}
      
      <View className="gap-6 py-2">
        <View className="self-center items-center w-[150px]">
          <View className="border-b border-slate-muted/30 pb-1.5 items-center px-3">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-slate-muted">Today's Question</Text>
          </View>
        </View>

        {loadingData ? (
          <ActivityIndicator color="#F59E0B" style={{ marginVertical: 24 }} />
        ) : spark ? (
          <Text className="text-[22px] font-small leading-[32px] tracking-tight text-glacier ml-2">
            {spark.question_text}
          </Text>
        ) : (
          <Text className="text-[15px] font-medium leading-[27px] tracking-tight text-slate-muted">
            {sparkError ?? 'No spark today — check back tomorrow! ✨'}
          </Text>
        )}

        {sparkError && spark && <Text className="mb-2 text-xs text-rose">⚠ {sparkError}</Text>}

        <View
          className="w-full"
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
          <View className="relative w-full">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const slideIndex = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
                setActiveSlide(slideIndex);
              }}
              className="h-[180px] w-full"
              contentContainerStyle={{ alignItems: 'center' }}>
              
              {/* Slide 1: User's Answer */}
              <View style={{ width: containerWidth }} className="h-full">
                <View className="relative h-full flex-1 rounded-[24px] border border-white/10 bg-slate-900/40 p-5 shadow-sm">
                  <Text className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-muted/60">
                    Your answer
                  </Text>
                  
                  {sparkState === 'pending' ? (
                    <View className="flex-1 ">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setIsWriting(true)}
                        className="flex-1 rounded-xl p-4">
                        <Text
                          className={`text-[15px] leading-[22px] ${draftAnswer ? 'text-glacier' : 'text-slate-muted/60'}`}
                          numberOfLines={3}>
                          {draftAnswer || 'Tap to answer...'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSubmitAnswer}
                        disabled={!draftAnswer.trim() || submitting}
                        activeOpacity={0.8}
                        className={`mt-3 items-center rounded-xl bg-spark py-3 ${!draftAnswer.trim() || submitting ? 'opacity-40' : ''}`}>
                        {submitting ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text className="text-[14px] font-bold text-midnight">Send ✦</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-1">
                      <Text
                        numberOfLines={4}
                        className="flex-1 text-[15px] leading-[22px] text-[#E2EAF4]">
                        {myAnswer?.answer_text ?? ''}
                      </Text>
                      {(myAnswer?.answer_text?.length ?? 0) > 100 && (
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedAnswer({ title: 'You', text: myAnswer.answer_text })
                          }
                          className="mt-2 self-start">
                          <Text className="text-[12px] font-medium text-spark">Read more</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Slide 2: Partner's Answer */}
              <View style={{ width: containerWidth }} className="h-full">
                <View className="relative ml-4 h-full flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/40 p-5 shadow-sm">
                  <Text className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#64748B] z-10">
                    {partner?.display_name?.split(' ')[0] ?? 'Partner'}
                  </Text>
                  
                  {sparkState === 'revealed' ? (
                    <Animated.View style={[{ flex: 1 }, revealAnimStyle]}>
                      <Text
                        numberOfLines={4}
                        className="flex-1 text-[15px] leading-[22px] text-[#E2EAF4]">
                        {partnerAnswer?.answer_text ?? ''}
                      </Text>
                      {(partnerAnswer?.answer_text?.length ?? 0) > 100 && (
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedAnswer({
                              title: partner?.display_name?.split(' ')[0] ?? 'Partner',
                              text: partnerAnswer.answer_text,
                            })
                          }
                          className="mt-2 self-start">
                          <Text className="text-[12px] font-medium text-spark">Read more</Text>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  ) : (
                    <BlurView
                      tint="light"
                      intensity={20}
                      className="absolute inset-0 items-center justify-center p-5">
                      <Animated.View style={lockAnimStyle} className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-white/10">
                        <Ionicons name="lock-closed" size={20} color="#F8FAFC" />
                      </Animated.View>
                      <Text className="text-center font-serif text-[14px] font-medium text-white/80">
                        {sparkState === 'waiting' ? 'Waiting for partner' : 'Locked'}
                      </Text>
                    </BlurView>
                  )}
                </View>
              </View>

            </ScrollView>

            {/* Pagination Dots */}
            <View className="mt-4 flex-row items-center justify-center gap-2">
              <View
                className={`h-1.5 w-1.5 rounded-full ${activeSlide === 0 ? 'w-5 bg-spark' : 'bg-slate-muted/30'}`}
              />
              <View
                className={`h-1.5 w-1.5 rounded-full ${activeSlide === 1 ? 'w-5 bg-spark' : 'bg-slate-muted/30'}`}
              />
            </View>
          </View>
        </View>
      </View>
      {/* Writing State Modal - Bottom Sheet Style */}
      <Modal visible={isWriting} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end">
          <TouchableOpacity 
            className="absolute inset-0 z-0" 
            activeOpacity={1} 
            onPress={() => setIsWriting(false)}
          >
            <BlurView
              tint="dark"
              intensity={40}
              className="flex-1"
              style={StyleSheet.absoluteFillObject}
            />
          </TouchableOpacity>
          <Animated.View entering={FadeInDown.springify()} className="z-10 bg-slate-900 border-t border-white/10 rounded-t-[40px] px-6 pt-2 pb-10 shadow-2xl">
            {/* Grabber handle */}
            <View className="w-12 h-1.5 rounded-full bg-white/20 self-center mb-6 mt-3" />
            
            <View className="flex-row items-center justify-between mb-4 px-2">
              <Text className="font-serif text-[20px] tracking-wide text-glacier">
                Your Answer
              </Text>
              <TouchableOpacity
                onPress={() => setIsWriting(false)}
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              value={draftAnswer}
              onChangeText={setDraftAnswer}
              placeholder="Share your thoughts honestly..."
              placeholderTextColor="#64748B"
              multiline
              autoFocus
              className="min-h-[160px] max-h-[250px] rounded-[24px] bg-black/20 p-5 pt-5 text-[16px] leading-[26px] text-[#E2EAF4] border border-white/5"
              style={{ textAlignVertical: 'top' }}
            />
            
            <TouchableOpacity
              onPress={() => {
                setIsWriting(false);
                if (draftAnswer.trim()) {
                  // Optionally submit here or just let user tap "Send" on the card
                }
              }}
              className="mt-6 w-full items-center justify-center rounded-[20px] bg-spark py-4 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Text className="text-[15px] font-bold text-midnight">Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Read More Overlay Modal */}
      <Modal visible={!!expandedAnswer} animationType="fade" transparent>
        <BlurView
          tint="dark"
          intensity={90}
          className="flex-1 items-center justify-center p-6"
          style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            className="absolute inset-0 z-0"
            activeOpacity={1}
            onPress={() => setExpandedAnswer(null)}
          />
          <Animated.View
            entering={FadeInDown.springify()}
            className="z-10 w-full max-w-[340px] overflow-hidden rounded-[32px] border border-white/15 bg-white/5">
            <View className="absolute inset-0 opacity-20">
              <Animated.View style={[meshAnimStyle]} className="flex-1">
                <LinearGradient
                  colors={['#4C1D95', '#C2410C', '#4C1D95']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1, filter: 'blur(30px)' as any }}
                />
              </Animated.View>
            </View>

            <View className="p-8">
              <Text className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-spark">
                {expandedAnswer?.title}'s Answer
              </Text>
              <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
                <Text className="text-center font-serif text-[18px] leading-[28px] text-[#F8FAFC]">
                  {expandedAnswer?.text}
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setExpandedAnswer(null)}
                className="mt-8 self-center rounded-full border border-white/20 bg-white/10 px-8 py-3">
                <Text className="text-[13px] font-bold tracking-wide text-[#E2EAF4]">Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>
    </Animated.View>
  );
}
