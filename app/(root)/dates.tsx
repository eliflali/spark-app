import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Data
import guidedDates from '@/assets/guided-dates/guided-dates.json';

// Supabase + auth
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// Date Engine
import DateController, { type Activity } from '@/src/components/date-engine/DateController';

// Guided Dates Components
import { type Mode, type Category } from '@/src/components/guided-dates/types';
import { AnimatedGradientCard } from '@/src/components/guided-dates/AnimatedGradientCard';

// Real-time session hook
import { useActiveSession } from '@/src/hooks/useActiveSession';



// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DatesScreen() {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<Mode | 'ALL'>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedBasis, setSelectedBasis] = useState('');
  // Track the sessionId of the session User A just started
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [myName, setMyName] = useState('You');
  const [partnerName, setPartnerName] = useState('Partner');

  const categories = (guidedDates as { guided_dates: Category[] }).guided_dates;

  // ── Real-time session hook ─────────────────────────────────────────────────
  const { incomingSession, acceptSession, cancelSession, startSession } = useActiveSession();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, partner_id, space_id')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setMyName(profile.display_name.split(' ')[0]);
        if (profile?.space_id) setSpaceId(profile.space_id);

        if (profile?.partner_id) {
          const { data: partner } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', profile.partner_id)
            .single();
          if (partner?.display_name) setPartnerName(partner.display_name.split(' ')[0]);
        }
      } catch (e) {
        console.warn('[DatesScreen] load error:', e);
      }
    })();
  }, [user]);

  const filters: Array<{ key: Mode | 'ALL'; label: string }> = [
    { key: 'ALL', label: '✦ All' },
    { key: 'DEEP_DIVE', label: '💧 Deep Dive' },
    { key: 'ENVELOPE', label: '✉️ Envelope' },
    { key: 'RESONANCE', label: '📡 Resonance' },
  ];

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      activities:
        activeFilter === 'ALL'
          ? cat.activities
          : cat.activities.filter((a) => a.mode === activeFilter),
    }))
    .filter((cat) => cat.activities.length > 0);

  const handleCardPress = useCallback(async (activity: Activity, basis: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // If we have a spaceId, create (or retrieve) the pending session for User A
    if (spaceId) {
      const sessionId = await startSession(activity.id, spaceId);
      setCurrentSessionId(sessionId);
    }
    setSelectedActivity(activity);
    setSelectedBasis(basis);
  }, [spaceId, startSession]);

  // Accept the incoming invitation (User B flow)
  const handleAcceptInvite = useCallback(async () => {
    if (!incomingSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await acceptSession(incomingSession.id);
    // Find the activity from guidedDates JSON
    const allCats = (guidedDates as { guided_dates: Category[] }).guided_dates;
    let foundActivity: Activity | null = null;
    let foundBasis = '';
    for (const cat of allCats) {
      const a = cat.activities.find((x) => x.id === incomingSession.template_id);
      if (a) {
        foundActivity = a as Activity;
        foundBasis = cat.scientific_basis;
        break;
      }
    }
    if (foundActivity) {
      setCurrentSessionId(incomingSession.id);
      setSelectedActivity(foundActivity);
      setSelectedBasis(foundBasis);
    }
  }, [incomingSession, acceptSession]);

  // When DateController closes, cancel the session if it was just pending
  const handleDateControllerClose = useCallback(async () => {
    if (currentSessionId) {
      await cancelSession(currentSessionId);
      setCurrentSessionId(null);
    }
    setSelectedActivity(null);
  }, [currentSessionId, cancelSession]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Guided Dates</Text>
        <Text style={styles.headerSub}>Science-backed experiences for two</Text>
      </Animated.View>

      {/* Filter Pills */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setActiveFilter(f.key);
                Haptics.selectionAsync();
              }}
              style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Horizontal Carousels */}
      <ScrollView
        contentContainerStyle={styles.activityListMain}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live Invitation Card (User B sees this) ── */}
        {incomingSession && (
          <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOut.duration(300)}
            style={styles.liveInviteWrapper}
          >
            <BlurView tint="dark" intensity={50} style={styles.liveInviteCard}>
              <LinearGradient
                colors={['rgba(245,158,11,0.2)', 'rgba(251,113,133,0.08)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.liveInviteCardBorder} pointerEvents="none" />
              <View style={styles.liveInviteInner}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveBadgeDot} />
                  <Text style={styles.liveBadgeText}>LIVE INVITE</Text>
                </View>
                <Text style={styles.liveInviteTitle}>
                  {(guidedDates as { guided_dates: Category[] }).guided_dates
                    .flatMap((c) => c.activities)
                    .find((a) => a.id === incomingSession.template_id)?.title ?? 'Guided Date'}
                </Text>
                <Text style={styles.liveInviteDesc}>
                  ⚡ Your partner started a date. Join them now!
                </Text>
                <TouchableOpacity
                  onPress={handleAcceptInvite}
                  style={styles.acceptBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.acceptBtnText}>Accept &amp; Join ✦</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        )}
      {filteredCategories.map((cat, ci) => (
          <Animated.View key={cat.category} entering={FadeInDown.delay(150 + ci * 40).springify()}>
            <View style={styles.catHeader}>
              <Text style={styles.catTitle}>{cat.category}</Text>
              <Text style={styles.catBasis}>{cat.scientific_basis}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              snapToInterval={176}
              decelerationRate="fast"
            >
              {cat.activities.map((activity) => (
                <AnimatedGradientCard
                  key={activity.id}
                  activity={activity as Activity}
                  category={cat.category}
                  onPress={() => handleCardPress(activity as Activity, cat.scientific_basis)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* DateController modal */}
      <DateController
        visible={!!selectedActivity}
        activity={selectedActivity}
        scientificBasis={selectedBasis}
        spaceId={spaceId}
        sessionId={currentSessionId}
        myUserId={user?.id}
        myName={myName}
        partnerName={partnerName}
        onClose={handleDateControllerClose}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#F8FAFC',
    fontSize: 13,
    marginTop: 4,
    opacity: 0.45,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: '#F59E0B',
  },
  filterText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#F59E0B',
  },
  activityListMain: {
    paddingBottom: 40,
    gap: 32,
  },
  catHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  catTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  catBasis: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  carouselContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },

  // ── Live Invitation Card ────────────────────────────────────────────────────
  liveInviteWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  liveInviteCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  liveInviteCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  liveInviteInner: {
    padding: 22,
    gap: 12,
  },
  liveBadge: {
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
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  liveBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveInviteTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  liveInviteDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  acceptBtn: {
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
  acceptBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
