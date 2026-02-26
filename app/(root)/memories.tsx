import { useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';

// ── Types ─────────────────────────────────────────────────────────────────────

type MemoryType = 'spark' | 'photo' | 'date';

interface Memory {
  id: string;
  type: MemoryType;
  date: string;
  title: string;
  preview: string;
  emoji: string;
  color: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_MEMORIES: Memory[] = [
  {
    id: '1',
    type: 'spark',
    date: 'Today',
    title: 'Daily Spark',
    preview: "What's one small thing your partner did recently that you appreciated but never mentioned?",
    emoji: '✨',
    color: '#F59E0B',
  },
  {
    id: '2',
    type: 'date',
    date: 'Feb 24',
    title: 'The 20-Second Hug',
    preview: 'We held each other until the world melted away. It worked.',
    emoji: '🤍',
    color: '#34D399',
  },
  {
    id: '3',
    type: 'spark',
    date: 'Feb 23',
    title: 'Daily Spark',
    preview: 'If you could relive one moment from our relationship, which would it be?',
    emoji: '🔥',
    color: '#F59E0B',
  },
  {
    id: '4',
    type: 'photo',
    date: 'Feb 22',
    title: 'Widget Surprise',
    preview: 'A secret photo from the morning walk 🌿',
    emoji: '📸',
    color: '#818CF8',
  },
  {
    id: '5',
    type: 'date',
    date: 'Feb 21',
    title: 'Eye Contact Marathon',
    preview: '4 minutes of silent connection. It felt like hours.',
    emoji: '👁',
    color: '#34D399',
  },
  {
    id: '6',
    type: 'spark',
    date: 'Feb 20',
    title: 'Daily Spark',
    preview: 'What song would be the soundtrack of our relationship right now?',
    emoji: '✨',
    color: '#F59E0B',
  },
];

// ── Memory Card ───────────────────────────────────────────────────────────────

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: memory.color }]} />

        <View style={styles.cardInner}>
          {/* Emoji + Date row */}
          <View style={styles.cardTopRow}>
            <View style={[styles.emojiCircle, { backgroundColor: memory.color + '20' }]}>
              <Text style={{ fontSize: 20 }}>{memory.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardDate}>{memory.date}</Text>
              <Text style={styles.cardTitle}>{memory.title}</Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: memory.color + '18', borderColor: memory.color + '44' }]}>
              <Text style={[styles.typeText, { color: memory.color }]}>
                {memory.type === 'spark' ? '✦ Spark' : memory.type === 'date' ? '📅 Date' : '📸 Photo'}
              </Text>
            </View>
          </View>

          {/* Preview */}
          <Text style={styles.cardPreview} numberOfLines={2}>{memory.preview}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Flame Stats ───────────────────────────────────────────────────────────────

function FlameStats() {
  return (
    <BlurView tint="dark" intensity={40} style={styles.statsCard}>
      <LinearGradient
        colors={['rgba(245,158,11,0.06)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Sparks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>2</Text>
          <Text style={styles.statLabel}>Dates</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🔥 7</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
    </BlurView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');

  const filters: Array<{ key: MemoryType | 'all'; label: string }> = [
    { key: 'all', label: '✦ All' },
    { key: 'spark', label: '✨ Sparks' },
    { key: 'date', label: '📅 Dates' },
    { key: 'photo', label: '📸 Photos' },
  ];

  const filtered =
    filter === 'all' ? MOCK_MEMORIES : MOCK_MEMORIES.filter((m) => m.type === filter);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <Text style={styles.headerTitle}>Our Flame</Text>
          <Text style={styles.headerSub}>Your shared journey together</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <FlameStats />
        </Animated.View>

        {/* Filter Pills */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>
          {filtered.length} {filter === 'all' ? 'memories' : filter + 's'} together
        </Text>

        {/* Memory cards */}
        <View style={styles.cardList}>
          {filtered.map((memory, index) => (
            <MemoryCard key={memory.id} memory={memory} index={index} />
          ))}
        </View>

        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptySub}>Complete sparks and dates to build your flame.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: '#475569',
    fontSize: 14,
    marginTop: 2,
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 4,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  sectionTitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardList: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 3,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardInner: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardDate: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  typePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardPreview: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    color: '#E2EAF4',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
