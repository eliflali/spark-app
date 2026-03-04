import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRevenueCat } from '@/src/context/RevenueCatContext';
import { ONBOARDING_KEY } from '@/src/lib/constants';
import { useActiveSession } from '@/src/hooks/useActiveSession';
import { useDailySpark } from '@/src/hooks/useDailySpark';
import { useWidgetSurprise } from '@/src/hooks/useWidgetSurprise';
import guidedDatesData from '@/assets/guided-dates/guided-dates.json';
import type { Category } from '@/src/components/guided-dates/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface PartnerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function AvatarCircle({
  name,
  avatarUrl,
  size = 48,
  color = '#F59E0B',
}: {
  name: string | null;
  avatarUrl: string | null;
  size?: number;
  color?: string;
}) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color, fontSize: size * 0.4, fontWeight: 'bold' }}>{initial}</Text>
      )}
    </View>
  );
}

// ── Partner Header ────────────────────────────────────────────────────────────

function PartnerHeader({
  myProfile,
  partner,
}: {
  myProfile: PartnerProfile | null;
  partner: PartnerProfile | null;
}) {
  const glow = useSharedValue(0.6);
  const animStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 4 }}>
      <AvatarCircle name={myProfile?.display_name ?? null} avatarUrl={myProfile?.avatar_url ?? null} />

      {/* Connecting line */}
      <View style={{ flex: 1, position: 'relative', height: 2, marginHorizontal: 8 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 2 }} />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 2 }, animStyle]}>
          <LinearGradient
            colors={['transparent', '#F59E0B', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
      </View>

      {partner ? (
        <AvatarCircle name={partner.display_name} avatarUrl={partner.avatar_url} color="#FB7185" />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: '#334155',
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-add-outline" size={18} color="#475569" />
        </View>
      )}
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

function getActivityTitle(templateId: string): string {
  const allCategories = (guidedDatesData as { guided_dates: Category[] }).guided_dates;
  for (const cat of allCategories) {
    const found = cat.activities.find((a) => a.id === templateId);
    if (found) return found.title;
  }
  return 'Guided Date';
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { isPremium } = useRevenueCat();
  const router = useRouter();

  const [myProfile, setMyProfile] = useState<PartnerProfile | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  // Local draft text for the input box
  const [draftAnswer, setDraftAnswer] = useState('');

  // ── Widget Surprise state ──────────────────────────────────────────────────
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { partnerSurprise, sending: sendingSurprise, sendNote, sendPhoto, sendReaction } =
    useWidgetSurprise();

  console.log('partnerSurprise', partnerSurprise);

  // ── Daily Spark hook ───────────────────────────────────────────────────────
  const {
    spark,
    myAnswer,
    partnerAnswer,
    sparkState,
    loading: loadingData,
    submitting,
    submitAnswer,
    error: sparkError,
  } = useDailySpark();

  // ── Real-time session hook ─────────────────────────────────────────────────
  const { incomingSession, acceptSession } = useActiveSession();

  // ── Logo pulse animation (activates when there's an incoming invite) ────────
  const logoScale = useSharedValue(1);
  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  useEffect(() => {
    if (incomingSession) {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      logoScale.value = withTiming(1.0, { duration: 300 });
    }
  }, [!!incomingSession]);

  // ── Lock-icon pulse (waiting state) ──────────────────────────────────────
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

  // ── Reveal animation (triggered once when state hits 'revealed') ──────────
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

  // ── Accept handler ────────────────────────────────────────────────────────
  const handleAcceptInvite = async () => {
    if (!incomingSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await acceptSession(incomingSession.id);
    router.push('/(root)/dates');
  };

  // ── Load profile + partner ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, partner_id')
          .eq('id', user.id)
          .single();
        if (profile) {
          setMyProfile({ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url });
          if (profile.partner_id) {
            const { data: partnerData } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', profile.partner_id)
              .single();
            if (partnerData) setPartner(partnerData);
          }
        }
      } catch (e) {
        console.error('[HomeScreen] loadProfile error:', e);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [user]);

  const handleSubmitAnswer = async () => {
    if (!draftAnswer.trim() || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await submitAnswer(draftAnswer);
    setDraftAnswer('');
  };

  // ── Widget helpers ────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  };

  const partnerFirstName = partner?.display_name?.split(' ')[0] ?? 'Partner';

  const handleWidgetPhoto = () => {
    Alert.alert('Send a Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            await sendPhoto('camera');
            showToast(`Sent to ${partnerFirstName}'s Widget! ✨`);
          } catch (e: any) {
            showToast(`Failed to send photo: ${e?.message ?? 'Unknown error'}`);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          try {
            await sendPhoto('gallery');
            showToast(`Sent to ${partnerFirstName}'s Widget! ✨`);
          } catch (e: any) {
            showToast(`Failed to send photo: ${e?.message ?? 'Unknown error'}`);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleWidgetNoteSubmit = async () => {
    if (!draftNote.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await sendNote(draftNote);
      showToast(`Sent to ${partnerFirstName}'s Widget! ✨`);
      setDraftNote('');
      setNoteModalVisible(false);
    } catch (e: any) {
      showToast(`Failed to send note: ${e?.message ?? 'Unknown error'}`);
    }
  };

  const handleWidgetReaction = async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await sendReaction(emoji);
      showToast(`Sent to ${partnerFirstName}'s Widget! ✨`);
    } catch {}
  };

  const handleSignOut = () => signOut();

  const handleDebugReset = () => {
    Alert.alert('🛠 Debug', 'Reset to fresh-install state?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(ONBOARDING_KEY);
          await signOut();
        },
      },
    ]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* ── Top Header ── */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.topHeader}>
          <PartnerHeader myProfile={myProfile} partner={partner} />
          
        </Animated.View>

        {/* ── Greeting ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.greetingRow}>
          <Animated.View style={logoAnimStyle}>
            {incomingSession && (
              <View style={styles.logoGlowRing} pointerEvents="none" />
            )}
            <Image
              source={require('@/assets/logo-transparent-bg.png')}
              style={styles.logo}
            />
          </Animated.View>
          <View>
            <Text style={styles.greetingSub}>Good {getTimeOfDay()}</Text>
            <Text style={styles.greetingName}>
              {myProfile?.display_name?.split(' ')[0] ?? 'Welcome'} 👋
            </Text>
          </View>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>✦ Premium</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Incoming Invitation Card ── */}
        {incomingSession && (
          <Animated.View entering={FadeInDown.springify()} exiting={FadeOut.duration(300)}>
            <BlurView tint="dark" intensity={55} style={styles.inviteCard}>
              <LinearGradient
                colors={['rgba(245,158,11,0.22)', 'rgba(251,113,133,0.08)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Animated border glow */}
              <View style={styles.inviteCardBorder} pointerEvents="none" />

              <View style={styles.inviteCardInner}>
                <View style={styles.inviteLiveBadge}>
                  <View style={styles.inviteLiveDot} />
                  <Text style={styles.inviteLiveBadgeText}>LIVE INVITE</Text>
                </View>

                <Text style={styles.inviteHeadline}>⚡ Partner is waiting!</Text>
                <Text style={styles.inviteDateTitle}>
                  {getActivityTitle(incomingSession.template_id)}
                </Text>

                <TouchableOpacity
                  onPress={handleAcceptInvite}
                  style={styles.joinBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.joinBtnText}>Join Partner ✦</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* ── Daily Spark Card ── */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <BlurView tint="dark" intensity={40} style={styles.sparkCard}>
            <LinearGradient
              colors={['rgba(245,158,11,0.08)', 'transparent']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.sparkCardInner}>
              {/* Badge */}
              <View style={styles.sparkBadge}>
                <Text style={styles.sparkBadgeText}>✦ Today's Spark</Text>
              </View>

              {loadingData ? (
                <ActivityIndicator color="#F59E0B" style={{ marginVertical: 24 }} />
              ) : spark ? (
                <Text style={styles.sparkQuestion}>{spark.question_text}</Text>
              ) : (
                <Text style={[styles.sparkQuestion, { color: '#94A3B8', fontSize: 13 }]}>
                  {sparkError ?? 'No spark today — check back tomorrow! ✨'}
                </Text>
              )}

              {/* Error banner (e.g. save failed) */}
              {sparkError && spark && (
                <Text style={{ color: '#FB7185', fontSize: 12, marginBottom: 8 }}>
                  ⚠ {sparkError}
                </Text>
              )}

              {/* ── Answer boxes — 3-state ── */}
              <View style={styles.answersRow}>

                {/* MY ANSWER BOX */}
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>You</Text>
                  {sparkState === 'pending' ? (
                    /* State 1: Pending — show input */
                    <>
                      <TextInput
                        value={draftAnswer}
                        onChangeText={setDraftAnswer}
                        placeholder="Your answer..."
                        placeholderTextColor="#334155"
                        multiline
                        style={styles.answerInput}
                      />
                      <TouchableOpacity
                        onPress={handleSubmitAnswer}
                        disabled={!draftAnswer.trim() || submitting}
                        style={[styles.submitBtn, (!draftAnswer.trim() || submitting) && { opacity: 0.4 }]}
                        activeOpacity={0.8}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text style={styles.submitBtnText}>Send ✦</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    /* State 2 & 3: show submitted answer */
                    <Text style={styles.answerText}>{myAnswer?.answer_text ?? ''}</Text>
                  )}
                </View>

                {/* PARTNER ANSWER BOX */}
                <View style={[styles.answerBox, { overflow: 'hidden' }]}>
                  <Text style={styles.answerLabel}>
                    {partner?.display_name?.split(' ')[0] ?? 'Partner'}
                  </Text>

                  {sparkState === 'revealed' ? (
                    /* State 3: Revealed — animate in partner answer */
                    <Animated.View style={[{ flex: 1 }, revealAnimStyle]}>
                      <Text style={styles.answerText}>{partnerAnswer?.answer_text ?? ''}</Text>
                    </Animated.View>
                  ) : (
                    /* State 1 & 2: Locked */
                    <>
                      <View style={styles.blurredContent}>
                        <Text style={styles.blurredPlaceholderText}>
                          They wrote something beautiful here...
                        </Text>
                      </View>
                      <BlurView
                        tint="dark"
                        intensity={sparkState === 'waiting' ? 55 : 72}
                        style={StyleSheet.absoluteFillObject}
                      >
                        <View style={styles.lockOverlay}>
                          <Animated.View style={lockAnimStyle}>
                            <Ionicons name="lock-closed" size={22} color="#F59E0B" />
                          </Animated.View>
                          <Text style={styles.lockText}>
                            {sparkState === 'waiting' ? 'Waiting for partner…' : 'Answer first'}
                          </Text>
                        </View>
                      </BlurView>
                    </>
                  )}
                </View>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* ── Widget Surprise ── */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <BlurView tint="dark" intensity={30} style={styles.widgetCard}>
            <View style={styles.widgetCardInner}>
              <View style={styles.widgetHeader}>
                <Ionicons name="gift-outline" size={18} color="#F59E0B" />
                <Text style={styles.widgetTitle}>Your Widget Surprise</Text>
              </View>
              <Text style={styles.widgetSub}>
                Send a secret photo or sticky note to your partner's home screen widget.
              </Text>

              {/* ── Action buttons ── */}
              <View style={styles.widgetOptions}>
                {/* Photo */}
                <TouchableOpacity
                  style={styles.widgetOption}
                  activeOpacity={0.8}
                  onPress={handleWidgetPhoto}
                  disabled={sendingSurprise}
                >
                  <Ionicons name="camera-outline" size={28} color="#F59E0B" />
                  <Text style={styles.widgetOptionLabel}>Photo</Text>
                </TouchableOpacity>

                {/* Sticky Note */}
                <TouchableOpacity
                  style={styles.widgetOption}
                  activeOpacity={0.8}
                  onPress={() => setNoteModalVisible(true)}
                  disabled={sendingSurprise}
                >
                  <Ionicons name="pencil-outline" size={28} color="#F59E0B" />
                  <Text style={styles.widgetOptionLabel}>Sticky Note</Text>
                </TouchableOpacity>

                {/* Reaction tray (single tap cycles through preset emojis) */}
                <View style={[styles.widgetOption, { gap: 0 }]}>
                  <Text style={styles.widgetOptionLabel}>Reactions</Text>
                  <View style={styles.reactionTray}>
                    {['❤️', '🔥', '😍', '✨', '🥰', '💌'].map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => handleWidgetReaction(emoji)}
                        disabled={sendingSurprise}
                        activeOpacity={0.7}
                        style={styles.reactionBtn}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* ── Incoming surprise preview ── */}
              {partnerSurprise && (
                <Animated.View entering={FadeIn.duration(400)} style={styles.incomingCard}>
                  <Text style={styles.incomingLabel}>
                    💌 From {partnerSurprise.sender_name?.split(' ')[0] ?? 'Partner'}
                  </Text>

                  {partnerSurprise.type === 'PHOTO' && (
                    <Image
                      source={{ uri: partnerSurprise.content }}
                      style={styles.incomingPhoto}
                      resizeMode="cover"
                    />
                  )}

                  {partnerSurprise.type === 'NOTE' && (
                    <View style={styles.incomingStickyNote}>
                      <Text style={styles.incomingNoteText}>{partnerSurprise.content}</Text>
                    </View>
                  )}

                  {partnerSurprise.type === 'REACTION' && (
                    <Text style={styles.incomingReactionEmoji}>{partnerSurprise.content}</Text>
                  )}
                </Animated.View>
              )}
            </View>
          </BlurView>
        </Animated.View>

        {/* ── Footer actions ── */}
        <View style={styles.footerActions}>
          <TouchableOpacity onPress={handleSignOut} style={styles.footerBtn} activeOpacity={0.7}>
            <Text style={styles.footerBtnText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDebugReset} style={[styles.footerBtn, styles.footerBtnDanger]} activeOpacity={0.7}>
            <Text style={[styles.footerBtnText, { color: '#FB7185' }]}>🛠 Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Toast overlay ── */}
      {toastVisible && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOut.duration(300)}
          style={styles.toast}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* ── Sticky Note Modal ── */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNoteModalVisible(false)} />
          <BlurView tint="dark" intensity={60} style={styles.noteModal}>
            <LinearGradient
              colors={['rgba(245,158,11,0.1)', 'rgba(15,23,42,0.95)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.noteModalInner}>
              <View style={styles.noteModalHandle} />
              <Text style={styles.noteModalTitle}>✍️ Write a Sticky Note</Text>
              <Text style={styles.noteModalSub}>Only your partner will see this on their widget.</Text>

              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                placeholder="Type something sweet..."
                placeholderTextColor="#475569"
                multiline
                maxLength={140}
                autoFocus
                style={styles.noteInput}
              />
              <Text style={styles.noteCharCount}>{draftNote.length}/140</Text>

              <TouchableOpacity
                onPress={handleWidgetNoteSubmit}
                disabled={!draftNote.trim() || sendingSurprise}
                style={[styles.noteSendBtn, (!draftNote.trim() || sendingSurprise) && { opacity: 0.4 }]}
                activeOpacity={0.85}
              >
                {sendingSurprise ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.noteSendBtnText}>Send to Widget ✦</Text>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logo: {
    width: 44,
    height: 44,
  },
  logoGlowRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.25)',
  },
  // Invitation card
  inviteCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  inviteCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  inviteCardInner: {
    padding: 22,
    gap: 12,
  },
  inviteLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  inviteLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  inviteLiveBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inviteHeadline: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  inviteDateTitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  joinBtn: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  joinBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greetingSub: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  greetingName: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  premiumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  premiumBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  // Spark card
  sparkCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  sparkCardInner: {
    padding: 24,
    gap: 16,
  },
  sparkBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  sparkBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sparkQuestion: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 27,
    letterSpacing: -0.2,
  },
  answersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  answerBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    minHeight: 130,
    position: 'relative',
  },
  answerLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  answerInput: {
    color: '#E2EAF4',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    textAlignVertical: 'top',
  },
  answerText: {
    color: '#E2EAF4',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  submitBtn: {
    marginTop: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
  blurredContent: {
    flex: 1,
    padding: 4,
  },
  blurredPlaceholderText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  lockOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Widget card
  widgetCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  widgetCardInner: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  widgetSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  widgetOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  widgetOption: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  widgetOptionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    alignItems: 'center',
  },
  footerBtnDanger: {
    borderColor: 'rgba(251,113,133,0.25)',
    backgroundColor: 'rgba(251,113,133,0.05)',
  },
  footerBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Reaction tray ─────────────────────────────────────────────────────────
  reactionTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginTop: 6,
  },
  reactionBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reactionEmoji: {
    fontSize: 20,
  },

  // ── Incoming surprise preview ─────────────────────────────────────────────
  incomingCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.25)',
    backgroundColor: 'rgba(251,113,133,0.06)',
    padding: 14,
    gap: 10,
  },
  incomingLabel: {
    color: '#FB7185',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  incomingPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  incomingStickyNote: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    padding: 14,
  },
  incomingNoteText: {
    color: '#FDE68A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  incomingReactionEmoji: {
    fontSize: 48,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  toastText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Sticky-note modal ─────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  noteModal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  noteModalInner: {
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  noteModalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  noteModalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  noteModalSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#E2EAF4',
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    minHeight: 110,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  noteCharCount: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'right',
  },
  noteSendBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  noteSendBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
