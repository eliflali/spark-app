import { useEffect, useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRevenueCat } from '@/src/context/RevenueCatContext';
import { ONBOARDING_KEY } from '@/src/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────

interface PartnerProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface DailySpark {
  id: string;
  question_text: string;
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

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { isPremium } = useRevenueCat();
  const router = useRouter();

  const [myProfile, setMyProfile] = useState<PartnerProfile | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [spark, setSpark] = useState<DailySpark | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [partnerAnswer, setPartnerAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Fetch own profile + partner info
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, partner_id')
        .eq('id', user!.id)
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

      // Fetch today's spark
      const today = new Date().toISOString().split('T')[0];
      const { data: sparkData } = await supabase
        .from('daily_sparks')
        .select('id, question_text')
        .eq('release_date', today)
        .maybeSingle();

      if (sparkData) setSpark(sparkData);
    } catch (e) {
      console.error('[HomeScreen] loadData error:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!myAnswer.trim() || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);
    // TODO: persist answer to Supabase (spark_answers table)
    setTimeout(() => {
      setAnswerSubmitted(true);
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 800);
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
          <Image
            source={require('@/assets/logo-transparent-bg.png')}
            style={styles.logo}
          />
        </Animated.View>

        {/* ── Greeting ── */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.greetingRow}>
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
                <Text style={styles.sparkQuestion}>
                  "What's one small thing your partner did recently that you appreciated but never mentioned?"
                </Text>
              )}

              {/* Answer boxes */}
              <View style={styles.answersRow}>
                {/* My answer */}
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>You</Text>
                  {answerSubmitted ? (
                    <Text style={styles.answerText}>{myAnswer}</Text>
                  ) : (
                    <>
                      <TextInput
                        value={myAnswer}
                        onChangeText={setMyAnswer}
                        placeholder="Your answer..."
                        placeholderTextColor="#334155"
                        multiline
                        style={styles.answerInput}
                      />
                      <TouchableOpacity
                        onPress={handleSubmitAnswer}
                        disabled={!myAnswer.trim() || submitting}
                        style={[styles.submitBtn, (!myAnswer.trim() || submitting) && { opacity: 0.4 }]}
                        activeOpacity={0.8}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                          <Text style={styles.submitBtnText}>Send ✦</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Partner answer — blurred if not submitted */}
                <View style={[styles.answerBox, { overflow: 'hidden' }]}>
                  <Text style={styles.answerLabel}>{partner?.display_name?.split(' ')[0] ?? 'Partner'}</Text>
                  {partnerAnswer && answerSubmitted ? (
                    <Text style={styles.answerText}>{partnerAnswer}</Text>
                  ) : (
                    <>
                      {/* Blurred placeholder */}
                      <View style={styles.blurredContent}>
                        <Text style={styles.blurredPlaceholderText}>
                          Lorem ipsum dolor sit amet consectetur, they wrote something beautiful here...
                        </Text>
                      </View>
                      <BlurView tint="dark" intensity={answerSubmitted ? 20 : 70} style={StyleSheet.absoluteFillObject}>
                        <View style={styles.lockOverlay}>
                          <Ionicons name="lock-closed" size={22} color="#F59E0B" />
                          <Text style={styles.lockText}>
                            {answerSubmitted ? 'Waiting...' : 'Answer first'}
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

              <View style={styles.widgetOptions}>
                {/* Photo option */}
                <TouchableOpacity style={styles.widgetOption} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={28} color="#94A3B8" />
                  <Text style={styles.widgetOptionLabel}>Photo</Text>
                </TouchableOpacity>
                {/* Note option */}
                <TouchableOpacity style={styles.widgetOption} activeOpacity={0.8}>
                  <Ionicons name="pencil-outline" size={28} color="#94A3B8" />
                  <Text style={styles.widgetOptionLabel}>Sticky Note</Text>
                </TouchableOpacity>
                {/* Emoji option */}
                <TouchableOpacity style={styles.widgetOption} activeOpacity={0.8}>
                  <Ionicons name="heart-outline" size={28} color="#94A3B8" />
                  <Text style={styles.widgetOptionLabel}>Reaction</Text>
                </TouchableOpacity>
              </View>
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
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
});
