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
    <View style={ss.container}>
      {/* Background glow */}
      <Animated.View style={[ss.glow, glowStyle]} pointerEvents="none" />

      <Animated.View entering={SlideInDown.springify()} style={ss.card}>
        <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFillObject} />
        <LinearGradient
          colors={['rgba(245,158,11,0.12)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Trophy icon */}
        <View style={ss.iconRing}>
          <LinearGradient colors={['#FBBF24', '#F59E0B', '#D97706']} style={StyleSheet.absoluteFillObject} />
          <Text style={ss.iconText}>✦</Text>
        </View>

        <Text style={ss.title}>Session Complete!</Text>
        <Text style={ss.subtitle}>{modeLabels[activity.mode]}: {activity.title}</Text>

        {/* Spark Score */}
        <View style={ss.scoreRow}>
          <Text style={ss.scoreLabel}>Spark Score</Text>
          <View style={ss.scorePill}>
            <Text style={ss.scoreValue}>{sparkScore}</Text>
          </View>
        </View>

        {/* Share to Widget */}
        <View style={ss.shareRow}>
          <View style={ss.shareTextBlock}>
            <Text style={ss.shareTitle}>Share to Widget</Text>
            <Text style={ss.shareDesc}>Pin this memory to your partner's home screen</Text>
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
          style={ss.doneBtn}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
        >
          <Text style={ss.doneBtnText}>Back to Dates ✦</Text>
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
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        {/* Dark backdrop */}
        <View style={styles.backdrop} />

        <Animated.View
          entering={SlideInDown.springify().stiffness(100)}
          exiting={SlideOutDown.duration(280)}
          style={styles.sheet}
        >
          <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFillObject} />

          {/* Top accent gradient */}
          <LinearGradient
            colors={[accentColor + '18', 'transparent']}
            style={[StyleSheet.absoluteFillObject, { height: 180 }]}
          />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.modeDot, { backgroundColor: accentColor }]} />
              <Text style={styles.headerMode}>
                {activity.mode.replace('_', ' ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleExitRequest}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Content – mode router */}
          <View style={styles.content}>
            {/* Partner-is-ready banner (Deep Dive step sync) */}
            {partnerIsReady && !completed && (
              <Animated.View
                entering={FadeInDown.springify()}
                exiting={FadeOut.duration(200)}
                style={styles.partnerReadyBanner}
              >
                <Ionicons name="flash" size={14} color="#0F172A" />
                <Text style={styles.partnerReadyText}>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    height: height * 0.92,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerMode: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    flex: 1,
  },
  // Partner-ready banner (Deep Dive real-time sync)
  partnerReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  partnerReadyText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
});

// ── Success Screen Styles ─────────────────────────────────────────────────────

const ss = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    height: 400,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  card: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: 28,
    gap: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  iconText: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  scoreLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  scorePill: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  scoreValue: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  shareTextBlock: {
    flex: 1,
    gap: 3,
  },
  shareTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  shareDesc: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },
  doneBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  doneBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16,
  },
});
