import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  FadeInDown,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/src/lib/supabase';

const { width, height } = Dimensions.get('window');

interface Activity {
  id: string;
  title: string;
  mode: string;
  desc: string;
}

interface DeepDiveModeProps {
  activity: Activity;
  scientificBasis: string;
  partnerName: string;
  myName: string;
  sessionId?: string | null;
  myUserId?: string;
  onComplete: () => void;
}

type Stage = 'input' | 'waiting' | 'submitted' | 'revealed';

// Confetti particle
function Particle({ x, color, delay }: { x: number; color: string; delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 100 });
      translateY.value = withTiming(height * 0.5, { duration: 1800, easing: Easing.out(Easing.quad) });
      rotate.value = withRepeat(withTiming(360, { duration: 600 }), 3, false);
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 });
      }, 1400);
    }, delay);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: height * 0.35,
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const PARTICLE_COLORS = ['#F59E0B', '#FBBF24', '#FDE68A', '#34D399', '#818CF8', '#FB7185'];
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  x: (Math.random() - 0.5) * width,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  delay: Math.random() * 400,
}));

export default function DeepDiveMode({
  activity,
  scientificBasis,
  partnerName,
  myName,
  sessionId,
  myUserId,
  onComplete,
}: DeepDiveModeProps) {
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [showParticles, setShowParticles] = useState(false);

  const blurIntensity = useSharedValue(20);
  const lockOpacity = useSharedValue(1);
  const partnerReveal = useSharedValue(0);

  // Poll or subscribe to session_answers
  useEffect(() => {
    if (!sessionId) return;
    
    // Initial fetch to see if partner already answered
    const fetchAnswers = async () => {
      const { data, error } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', sessionId)
        .eq('step', 0);
        
      if (!error && data) {
        let hasPartner = false;
        let partnerAns = '';
        for (const ans of data) {
           if (ans.user_id !== myUserId) {
             hasPartner = true;
             partnerAns = ans.answer_text;
           }
        }
        if (hasPartner) setPartnerAnswer(partnerAns);
      }
    };
    fetchAnswers();

    const channel = supabase
      .channel(`answers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.step === 0) {
            if (newRow.user_id !== myUserId) {
               setPartnerAnswer(newRow.answer_text);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, myUserId]);

  const handleSubmit = async () => {
    if (!myAnswer.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setStage('submitted');

    // Save to Supabase
    if (sessionId && myUserId) {
       await supabase.from('session_answers').upsert({
          session_id: sessionId,
          user_id: myUserId,
          step: 0,
          answer_text: myAnswer,
       });
       
       if (!partnerAnswer) {
          setStage('waiting');
          return; // wait for partner
       }
    }
    
    triggerReveal();
  };

  const triggerReveal = () => {
    // Unlock partner box
    lockOpacity.value = withTiming(0, { duration: 500 });
    blurIntensity.value = withTiming(0, { duration: 600 });

    // Small delay then reveal
    setTimeout(() => {
      setShowParticles(true);
      setStage('revealed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      partnerReveal.value = withSpring(1, { stiffness: 90 });
    }, 700);
  };

  // If we are waiting, and partner answers, trigger reveal
  useEffect(() => {
    if (stage === 'waiting' && partnerAnswer) {
       triggerReveal();
    }
  }, [stage, partnerAnswer]);

  const partnerRevealStyle = useAnimatedStyle(() => ({
    opacity: partnerReveal.value,
    transform: [{ scale: 0.92 + partnerReveal.value * 0.08 }],
  }));

  return (
    <KeyboardAvoidingView
      className="flex-1 items-center"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Confetti burst */}
      {showParticles && PARTICLES.map((p, i) => (
        <Particle key={i} x={p.x} color={p.color} delay={p.delay} />
      ))}

      {/* Science header */}
      <View className="px-5 pb-2 pt-1 items-center gap-1.5">
        <Text className="text-[#475569] text-[10px] font-semibold uppercase tracking-widest text-center">{scientificBasis}</Text>
        <Text className="text-[#F8FAFC] text-[20px] font-bold tracking-tighter text-center">{activity.title}</Text>
        <Text className="text-[#94A3B8] text-[13px] leading-5 text-center px-2">{activity.desc}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Partner Box (top) ── */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#818CF8]" />
            <Text className="text-[#818CF8] text-[12px] font-bold uppercase tracking-widest">{partnerName}</Text>
          </View>

          <View className="bg-white/5 rounded-[20px] border border-white/10 min-h-[120px] overflow-hidden relative">
            {/* Always render partner content underneath */}
            <Animated.View style={partnerRevealStyle} className="p-[18px]">
              <Text className="text-[#E2EAF4] text-[15px] leading-6">{partnerAnswer}</Text>
            </Animated.View>

            {/* Blur overlay — lifts when user submits and partner is ready */}
            {(stage === 'input' || stage === 'waiting') && (
              <BlurView tint="dark" intensity={20} className="absolute top-0 bottom-0 left-0 right-0">
                <View className="flex-1 items-center justify-center gap-2 min-h-[120px]">
                  {stage === 'waiting' ? (
                    <>
                      <Ionicons name="time-outline" size={24} color="#F59E0B" />
                      <Text className="text-[#94A3B8] text-[13px] font-semibold text-center">Waiting for partner...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                      <Text className="text-[#94A3B8] text-[13px] font-semibold text-center">Share your answer first</Text>
                    </>
                  )}
                </View>
              </BlurView>
            )}
          </View>
        </View>

        {/* ── Divider ── */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-white/5" />
          <View className="w-8 h-8 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 items-center justify-center">
            <Text className="text-[#F59E0B] text-[16px]">✦</Text>
          </View>
          <View className="flex-1 h-px bg-white/5" />
        </View>

        {/* ── My Box (bottom) ── */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <Text className="text-[#F59E0B] text-[12px] font-bold uppercase tracking-widest">{myName} (You)</Text>
          </View>

          {stage === 'input' ? (
            <View className="bg-white/5 rounded-[20px] border border-white/10 min-h-[120px] overflow-hidden relative p-4 gap-3">
              <TextInput
                value={myAnswer}
                onChangeText={setMyAnswer}
                placeholder="Write your answer here..."
                placeholderTextColor="#334155"
                multiline
                className="text-[#F8FAFC] text-[15px] leading-[23px] min-h-[80px]"
                style={{ textAlignVertical: 'top' }}
                autoFocus={false}
              />
              <TouchableOpacity
                className={`bg-[#F59E0B] rounded-2xl py-3.5 items-center ${!myAnswer.trim() ? 'opacity-40' : ''}`}
                style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}
                onPress={handleSubmit}
                disabled={!myAnswer.trim()}
                activeOpacity={0.85}
              >
                <Text className="text-[#0F172A] font-bold text-[15px]">Submit Answer ✦</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)} className={`bg-white/5 rounded-[20px] border min-h-[120px] overflow-hidden relative p-[18px] border-[#F59E0B]/20 ${stage === 'waiting' ? 'opacity-60' : ''}`}>
              <Text className="text-[#E2EAF4] text-[15px] leading-6">{myAnswer}</Text>
            </Animated.View>
          )}
        </View>

        {/* CTA after reveal */}
        {stage === 'revealed' && (
          <Animated.View entering={FadeInDown.delay(600).springify()} className="items-center gap-4 mt-2">
            <View className="flex-row items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-[20px] px-4 py-2">
              <Text className="text-[#F59E0B] text-[16px]">✦</Text>
              <Text className="text-[#F59E0B] font-bold text-[14px]">Connection deepened!</Text>
            </View>
            <TouchableOpacity
              className="bg-[#F59E0B] rounded-[20px] py-4 px-10"
              style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onComplete();
              }}
            >
              <Text className="text-[#0F172A] font-bold text-[16px]">Complete Session →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View className="h-10" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


