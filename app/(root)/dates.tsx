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

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'DEEP_DIVE' | 'ENVELOPE' | 'RESONANCE';

interface Category {
  category: string;
  scientific_basis: string;
  activities: Activity[];
}

// ── Mode Config ───────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<Mode, { icon: string; label: string; color: string; bg: string }> = {
  DEEP_DIVE: {
    icon: 'water-outline',
    label: 'Deep Dive',
    color: '#818CF8',
    bg: 'rgba(129,140,248,0.15)',
  },
  ENVELOPE: {
    icon: 'mail-outline',
    label: 'Envelope',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
  },
  RESONANCE: {
    icon: 'radio-outline',
    label: 'Resonance',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.15)',
  },
};

// ── Activity Card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity, onPress }: { activity: Activity; onPress: () => void }) {
  const cfg = MODE_CONFIG[activity.mode as Mode];

  const glowPulse = useSharedValue(0.4);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.card}>
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFillObject} />

      {/* Animated colour glow */}
      <Animated.View
        style={[styles.cardGlow, glowStyle, { backgroundColor: cfg.color }]}
        pointerEvents="none"
      />

      {/* Glass sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.cardContent}>
        <View style={[styles.cardIconCircle, { backgroundColor: cfg.bg, borderColor: cfg.color + '55' }]}>
          <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
        </View>

        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{activity.title}</Text>
          <View style={[styles.modeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.modeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DatesScreen() {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<Mode | 'ALL'>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedBasis, setSelectedBasis] = useState('');

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [myName, setMyName] = useState('You');
  const [partnerName, setPartnerName] = useState('Partner');

  const categories = (guidedDates as { guided_dates: Category[] }).guided_dates;

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, partner_id')
          .eq('id', user.id)
          .single();

        if (profile?.display_name) setMyName(profile.display_name.split(' ')[0]);

        if (profile?.partner_id) {
          const { data: partner } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', profile.partner_id)
            .single();
          if (partner?.display_name) setPartnerName(partner.display_name.split(' ')[0]);
        }

        const { data: member } = await supabase
          .from('space_members')
          .select('space_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.space_id) {
          setSpaceId(member.space_id);
        } else {
          const { data: space } = await supabase
            .from('spaces')
            .select('id')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
            .maybeSingle();
          if (space?.id) setSpaceId(space.id);
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

  const handleCardPress = useCallback((activity: Activity, basis: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedActivity(activity);
    setSelectedBasis(basis);
  }, []);

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
              snapToInterval={180}
              decelerationRate="fast"
            >
              {cat.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity as Activity}
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
        myName={myName}
        partnerName={partnerName}
        onClose={() => setSelectedActivity(null)}
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
    opacity: 0.6,
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
  // Card
  card: {
    width: 164,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  cardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    gap: 8,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Pre-reveal
  transitionBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  transitionFlap: {
    width: 160,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
