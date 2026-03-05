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
    <Animated.View entering={FadeInDown.delay(160).springify()}>
      <BlurView
        tint="dark"
        intensity={100}
        className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
        <LinearGradient
          colors={['rgba(255,255,255,0.03)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View className="gap-4 p-6">
          <View className="self-start rounded-xl bg-spark/15 px-2.5 py-1">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-spark">
              ✦ Today's Spark
            </Text>
          </View>

          {loadingData ? (
            <ActivityIndicator color="#F59E0B" style={{ marginVertical: 24 }} />
          ) : spark ? (
            <Text className="text-lg font-semibold leading-[27px] tracking-tight text-glacier">
              {spark.question_text}
            </Text>
          ) : (
            <Text className="text-[13px] font-semibold leading-[27px] tracking-tight text-slate-muted">
              {sparkError ?? 'No spark today — check back tomorrow! ✨'}
            </Text>
          )}

          {sparkError && spark && <Text className="mb-2 text-xs text-rose">⚠ {sparkError}</Text>}

          <View
            className="w-full flex-row gap-3"
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            {sparkState === 'revealed' ? (
              <View className="relative w-full">
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const slideIndex = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
                    setActiveSlide(slideIndex);
                  }}
                  className="h-[160px] w-full rounded-[20px]"
                  contentContainerStyle={{ alignItems: 'center' }}>
                  {/* Slide 1: User's Answer */}
                  <View style={{ width: containerWidth }} className="h-full">
                    <View className="relative mx-1 h-full flex-1 rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
                        You
                      </Text>
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
                  </View>

                  {/* Slide 2: Partner's Answer */}
                  <View style={{ width: containerWidth }} className="h-full">
                    <View className="relative mx-1 h-full flex-1 rounded-[20px] border border-white/10 bg-white/5 p-4">
                      <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
                        {partner?.display_name?.split(' ')[0] ?? 'Partner'}
                      </Text>
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
                    </View>
                  </View>
                </ScrollView>

                {/* Pagination Dots */}
                <View className="absolute bottom-[-16px] left-0 right-0 flex-row items-center justify-center gap-2">
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${activeSlide === 0 ? 'w-4 bg-spark' : 'bg-slate-muted/40'}`}
                  />
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${activeSlide === 1 ? 'w-4 bg-spark' : 'bg-slate-muted/40'}`}
                  />
                </View>
              </View>
            ) : (
              // Pending / Waiting State
              <>
                <View className="relative h-[160px] flex-1 rounded-[20px] border border-white/10 bg-white/5 p-3.5">
                  <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-glacier/50">
                    You
                  </Text>
                  {sparkState === 'pending' ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setIsWriting(true)}
                        className="flex-1 rounded-xl p-2">
                        <Text
                          className={`text-sm ${draftAnswer ? 'text-slate-muted' : 'text-slate-muted/40'}`}
                          numberOfLines={3}>
                          {draftAnswer || 'Tap to write your answer...'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSubmitAnswer}
                        disabled={!draftAnswer.trim() || submitting}
                        activeOpacity={0.8}
                        className={`mt-2.5 items-center rounded-xl bg-spark py-2 ${!draftAnswer.trim() || submitting ? 'opacity-40' : ''}`}>
                        {submitting ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text className="text-[13px] font-bold text-midnight">Send ✦</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View className="flex-1">
                      <Text
                        numberOfLines={4}
                        className="flex-1 text-sm leading-[21px] text-[#E2EAF4]">
                        {myAnswer?.answer_text ?? ''}
                      </Text>
                      {(myAnswer?.answer_text?.length ?? 0) > 80 && (
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedAnswer({ title: 'You', text: myAnswer.answer_text })
                          }
                          className="mt-1 self-start">
                          <Text className="text-[12px] font-medium text-spark">Read more</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <View className="relative h-[160px] flex-1 overflow-hidden rounded-[20px] border border-white/10 bg-white/5 p-3.5">
                  <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
                    {partner?.display_name?.split(' ')[0] ?? 'Partner'}
                  </Text>
                  <BlurView
                    tint="dark"
                    intensity={sparkState === 'waiting' ? 100 : 72}
                    style={StyleSheet.absoluteFillObject}>
                    <View className="absolute -inset-10 opacity-30">
                      <Animated.View style={[meshAnimStyle]} className="flex-1">
                        <LinearGradient
                          colors={['#4C1D95', '#C2410C', '#4C1D95']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ flex: 1, filter: 'blur(20px)' as any }}
                        />
                      </Animated.View>
                    </View>
                    <View className="flex-1 items-center justify-center gap-1.5 bg-black/20">
                      <Animated.View style={lockAnimStyle}>
                        <Ionicons name="lock-closed" size={22} color="#F8FAFC" />
                      </Animated.View>
                      {sparkState !== 'waiting' && (
                        <Text className="text-center text-xs font-semibold text-slate-muted">
                          Answer first
                        </Text>
                      )}
                    </View>
                  </BlurView>
                </View>
              </>
            )}
          </View>
        </View>
      </BlurView>

      {/* Writing State Modal */}
      <Modal visible={isWriting} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <BlurView
            tint="dark"
            intensity={80}
            className="flex-1"
            style={StyleSheet.absoluteFillObject}
          />
          <View className="flex-1 justify-center p-6">
            <View className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60 shadow-2xl">
              <View className="p-6">
                <Text className="mb-4 text-center font-serif text-[18px] tracking-wide text-glacier">
                  Your Answer
                </Text>
                <TextInput
                  value={draftAnswer}
                  onChangeText={setDraftAnswer}
                  placeholder="Share your thoughts honestly..."
                  placeholderTextColor="#64748B"
                  multiline
                  autoFocus
                  className="min-h-[220px] rounded-2xl bg-black/20 p-5 text-[16px] leading-[26px] text-[#E2EAF4]"
                  style={{ textAlignVertical: 'top' }}
                />
                <View className="mt-5 flex-row gap-4">
                  <TouchableOpacity
                    onPress={() => setIsWriting(false)}
                    className="flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-4">
                    <Text className="text-[14px] font-semibold text-[#94A3B8]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsWriting(false);
                      // Don't auto-submit here, just save draft. The user can hit Send on the card.
                    }}
                    className="flex-1 items-center justify-center rounded-2xl bg-spark py-4 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                    <Text className="text-[14px] font-bold text-midnight">Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
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
