import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import ResonanceMode from './ResonanceMode';
import EnvelopeMode from './EnvelopeMode';
import DeepDiveMode from './DeepDiveMode';

const { width, height } = Dimensions.get('window');
const SPARK_SCORE_KEY = 'spark_score_v1';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'RESONANCE' | 'ENVELOPE' | 'DEEP_DIVE';

export interface Activity {
  id: string;
  title: string;
  mode: Mode;
  desc: string;
  location?: string;
  energy?: string;
}

interface DateControllerProps {
  visible: boolean;
  activity: Activity | null;
  scientificBasis: string;
  spaceId: string | null;
  /** Optional: live session ID for real-time sync between partners */
  sessionId?: string | null;
  myUserId?: string;
  myName: string;
  partnerName: string;
  onClose: () => void;
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  activity,
  sparkScore,
  onDismiss,
}: {
  activity: Activity;
  sparkScore: number;
  onDismiss: () => void;
}) {
  const [shareEnabled, setShareEnabled] = useState(false);

  const glowPulse = useSharedValue(0.7);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowPulse.value }));
  const modeLabels: Record<Mode, string> = {
    RESONANCE: 'Resonance Session',
    ENVELOPE: 'Envelope Adventure',
    DEEP_DIVE: 'Deep Dive',
  };

  return (
    <View className="flex-1 items-center justify-center p-6">
      {/* Background glow */}
      <Animated.View className="absolute top-[-100px] left-[-100px] right-[-100px] h-[400px] rounded-full bg-[#F59E0B]/10" style={[glowStyle]} pointerEvents="none" />

      <Animated.View entering={SlideInDown.springify()} className="w-full rounded-[28px] overflow-hidden border border-[#F59E0B]/20 p-7 gap-5 items-center bg-[#0F172A]/85">
        <BlurView tint="dark" intensity={60} className="absolute top-0 bottom-0 left-0 right-0" />
        <LinearGradient
          colors={['rgba(245,158,11,0.12)', 'transparent']}
          className="absolute top-0 bottom-0 left-0 right-0"
        />

        {/* Trophy icon */}
        <View className="w-[72px] h-[72px] rounded-full overflow-hidden items-center justify-center" style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 10 }}>
          <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} className="absolute top-0 bottom-0 left-0 right-0" />
          <Text className="text-[#0F172A] text-[28px] font-bold">✦</Text>
        </View>

        <Text className="text-[#F8FAFC] text-[26px] font-bold tracking-tighter text-center">Session Complete!</Text>
        <Text className="text-[#94A3B8] text-[14px] text-center leading-[21px]">{modeLabels[activity.mode]}: {activity.title}</Text>

        {/* Spark Score */}
        <View className="flex-row items-center justify-between w-full bg-[#F59E0B]/10 rounded-2xl p-4 border border-[#F59E0B]/15">
          <Text className="text-[#F8FAFC] text-[15px] font-semibold">Spark Score</Text>
          <View className="bg-[#F59E0B] rounded-xl px-3.5 py-1">
            <Text className="text-[#0F172A] font-extrabold text-[16px]">{sparkScore}</Text>
          </View>
        </View>

        {/* Share to Widget */}
        <View className="flex-row items-center justify-between w-full bg-white/5 rounded-2xl p-4 border border-white/10 gap-3">
          <View className="flex-1 gap-[3px]">
            <Text className="text-[#F8FAFC] text-[14px] font-semibold">Share to Widget</Text>
            <Text className="text-[#475569] text-[12px] leading-[17px]">Pin this memory to your partner's home screen</Text>
          </View>
          <Switch
            value={shareEnabled}
            onValueChange={(v) => {
              setShareEnabled(v);
              Haptics.selectionAsync();
            }}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(245,158,11,0.4)' }}
            thumbColor={shareEnabled ? '#F59E0B' : '#475569'}
          />
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          className="bg-[#F59E0B] rounded-[20px] py-4 px-10 w-full items-center"
          style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
        >
          <Text className="text-[#0F172A] font-bold text-[16px]">Back to Dates ✦</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Date Controller ───────────────────────────────────────────────────────────

export default function DateController({
  visible,
  activity,
  scientificBasis,
  spaceId,
  sessionId,
  myUserId,
  myName,
  partnerName,
  onClose,
}: DateControllerProps) {
  const [completed, setCompleted] = useState(false);
  const [sparkScore, setSparkScore] = useState(0);
  // Tracks whether the partner has advanced ahead (for Deep Dive step sync)
  const [partnerIsReady, setPartnerIsReady] = useState(false);
  const myCurrentStep = useRef(0);

  useEffect(() => {
    if (visible) {
      setCompleted(false);
      setPartnerIsReady(false);
      myCurrentStep.current = 0;
      loadSparkScore();
    }
  }, [visible]);

  // ── Real-time subscription: watch partner's step progress ─────────────────
  useEffect(() => {
    if (!sessionId || !visible) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'date_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as { current_step: number; status: string };
          // If the session's current_step is ahead of where I am, partner is ready
          if (
            updated.status === 'active' &&
            updated.current_step > myCurrentStep.current
          ) {
            setPartnerIsReady(true);
          }
          // If partner completed the session
          if (updated.status === 'completed') {
            setPartnerIsReady(true);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, visible]);

  const loadSparkScore = async () => {
    try {
      const val = await AsyncStorage.getItem(SPARK_SCORE_KEY);
      setSparkScore(val ? parseInt(val, 10) : 0);
    } catch {
      setSparkScore(0);
    }
  };

  const handleComplete = async () => {
    // Increment spark score
    const newScore = sparkScore + 1;
    setSparkScore(newScore);
    await AsyncStorage.setItem(SPARK_SCORE_KEY, String(newScore));

    // Update or create the date_session row
    if (activity) {
      try {
        if (sessionId) {
          // Update existing session to completed
          await supabase
            .from('date_sessions')
            .update({
              status: 'completed',
              is_completed: true,
              current_step: myCurrentStep.current + 1,
              last_interaction_at: new Date().toISOString(),
            })
            .eq('id', sessionId);
        } else if (spaceId) {
          // Solo play — insert a completed session directly
          await supabase.from('date_sessions').insert({
            space_id: spaceId,
            template_id: activity.id,
            current_step: 1,
            is_completed: true,
            status: 'completed',
            last_interaction_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('[DateController] Supabase update error:', e);
      }
    }

    setCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  /** Called by Deep Dive when user moves to the next step */
  const handleStepAdvance = async (step: number) => {
    myCurrentStep.current = step;
    setPartnerIsReady(false); // Reset banner since we're now in sync
    if (sessionId) {
      await supabase
        .from('date_sessions')
        .update({
          current_step: step,
          last_interaction_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  };

  const handleExitRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Exit Session?',
      'Your progress for this session will not be saved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            setCompleted(false);
            onClose();
          },
        },
      ]
    );
  };

  if (!activity) return null;

  const modeColors: Record<Mode, string> = {
    RESONANCE: '#34D399',
    ENVELOPE: '#F59E0B',
    DEEP_DIVE: '#818CF8',
  };
  const accentColor = modeColors[activity.mode];

  return (
    <Modal
      visible={visible}
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      transparent
    >
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} className="flex-1 justify-end">
        {/* Dark backdrop */}
        <View className="absolute top-0 bottom-0 left-0 right-0 bg-black/75" />

        <Animated.View
          entering={SlideInDown.springify().stiffness(100)}
          exiting={SlideOutDown.duration(280)}
          className="bg-[#0F172A]/95 rounded-t-[32px] overflow-hidden border border-white/5 border-b-0"
          style={{ height: height * 0.92 }}
        >
          <BlurView tint="dark" intensity={50} className="absolute top-0 bottom-0 left-0 right-0" />

          {/* Top accent gradient */}
          <LinearGradient
            colors={[accentColor + '18', 'transparent']}
            className="absolute top-0 left-0 right-0 h-[180px]"
          />

          {/* Handle */}
          <View className="w-9 h-1 rounded-full bg-white/15 self-center mt-3 mb-1" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-b-white/5">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
              <Text className="text-[#94A3B8] text-[12px] font-semibold uppercase tracking-wider">
                {activity.mode.replace('_', ' ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleExitRequest}
              className="w-9 h-9 rounded-full bg-white/5 items-center justify-center border border-white/5"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content – mode router */}
          <View className="flex-1">
            {/* Partner-is-ready banner (Deep Dive step sync) */}
            {partnerIsReady && !completed && (
              <Animated.View
                entering={FadeInDown.springify()}
                exiting={FadeOut.duration(200)}
                className="flex-row items-center gap-2 mx-5 mt-3 px-3.5 py-2.5 rounded-2xl bg-[#F59E0B]"
                style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }}
              >
                <Ionicons name="flash" size={14} color="#0F172A" />
                <Text className="text-[#0F172A] font-bold text-[13px] flex-1">
                  Partner is ready! Your turn.
                </Text>
              </Animated.View>
            )}

            {completed ? (
              <SuccessScreen
                activity={activity}
                sparkScore={sparkScore}
                onDismiss={() => {
                  setCompleted(false);
                  onClose();
                }}
              />
            ) : activity.mode === 'RESONANCE' ? (
              <ResonanceMode
                activity={activity}
                scientificBasis={scientificBasis}
                onComplete={handleComplete}
              />
            ) : activity.mode === 'ENVELOPE' ? (
              <EnvelopeMode
                activity={activity}
                scientificBasis={scientificBasis}
                onComplete={handleComplete}
              />
            ) : (
              <DeepDiveMode
                activity={activity}
                scientificBasis={scientificBasis}
                partnerName={partnerName}
                myName={myName}
                sessionId={sessionId}
                myUserId={myUserId}
                onComplete={handleComplete}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}


