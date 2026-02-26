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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Confetti burst */}
      {showParticles && PARTICLES.map((p, i) => (
        <Particle key={i} x={p.x} color={p.color} delay={p.delay} />
      ))}

      {/* Science header */}
      <View style={styles.header}>
        <Text style={styles.sciLabel}>{scientificBasis}</Text>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDesc}>{activity.desc}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Partner Box (top) ── */}
        <View style={styles.answerBlock}>
          <View style={styles.answerLabelRow}>
            <View style={styles.avatarDot} />
            <Text style={styles.answerName}>{partnerName}</Text>
          </View>

          <View style={styles.answerBox}>
            {/* Always render partner content underneath */}
            <Animated.View style={[styles.partnerContent, partnerRevealStyle]}>
              <Text style={styles.answerText}>{partnerAnswer}</Text>
            </Animated.View>

            {/* Blur overlay — lifts when user submits and partner is ready */}
            {(stage === 'input' || stage === 'waiting') && (
              <BlurView tint="dark" intensity={20} style={StyleSheet.absoluteFillObject}>
                <View style={styles.lockOverlay}>
                  {stage === 'waiting' ? (
                    <>
                      <Ionicons name="time-outline" size={24} color="#F59E0B" />
                      <Text style={styles.lockText}>Waiting for partner...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                      <Text style={styles.lockText}>Share your answer first</Text>
                    </>
                  )}
                </View>
              </BlurView>
            )}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <View style={styles.dividerIcon}>
            <Text style={{ color: '#F59E0B', fontSize: 16 }}>✦</Text>
          </View>
          <View style={styles.divider} />
        </View>

        {/* ── My Box (bottom) ── */}
        <View style={styles.answerBlock}>
          <View style={styles.answerLabelRow}>
            <View style={[styles.avatarDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.answerName, { color: '#F59E0B' }]}>{myName} (You)</Text>
          </View>

          {stage === 'input' ? (
            <View style={[styles.answerBox, styles.inputBox]}>
              <TextInput
                value={myAnswer}
                onChangeText={setMyAnswer}
                placeholder="Write your answer here..."
                placeholderTextColor="#334155"
                multiline
                style={styles.textInput}
                autoFocus={false}
              />
              <TouchableOpacity
                style={[styles.submitBtn, !myAnswer.trim() && { opacity: 0.4 }]}
                onPress={handleSubmit}
                disabled={!myAnswer.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Submit Answer ✦</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(400)} style={[styles.answerBox, styles.submittedBox, stage === 'waiting' && { opacity: 0.6 }]}>
              <Text style={styles.answerText}>{myAnswer}</Text>
            </Animated.View>
          )}
        </View>

        {/* CTA after reveal */}
        {stage === 'revealed' && (
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.ctaBox}>
            <View style={styles.sparkBurstBadge}>
              <Text style={styles.sparkBurstEmoji}>✦</Text>
              <Text style={styles.sparkBurstText}>Connection deepened!</Text>
            </View>
            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onComplete();
              }}
            >
              <Text style={styles.continueBtnText}>Complete Session →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  sciLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  activityTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  activityDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  answerBlock: {
    gap: 10,
  },
  answerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#818CF8',
  },
  answerName: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  answerBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 120,
    overflow: 'hidden',
    position: 'relative',
  },
  partnerContent: {
    padding: 18,
  },
  inputBox: {
    padding: 16,
    gap: 12,
  },
  submittedBox: {
    padding: 18,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  answerText: {
    color: '#E2EAF4',
    fontSize: 15,
    lineHeight: 24,
  },
  textInput: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 23,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  lockOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
  },
  lockText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  dividerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBox: {
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  sparkBurstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sparkBurstEmoji: {
    color: '#F59E0B',
    fontSize: 16,
  },
  sparkBurstText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 14,
  },
  continueBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  continueBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 16,
  },
});
