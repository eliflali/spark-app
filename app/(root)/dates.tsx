import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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

// Date Matchmaker
import { useSuggestedDate } from '@/src/hooks/useSuggestedDate';
import { VibeCheck, type VibeData } from '@/src/components/guided-dates/VibeCheck';
import { TodayMatchCard } from '@/src/components/guided-dates/TodayMatchCard';



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

  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);

  // ── Real-time hooks ────────────────────────────────────────────────────────
  const { incomingSession, acceptSession, cancelSession, startSession } = useActiveSession();
  const { suggestedDate, createSuggestion } = useSuggestedDate();

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

  // Matchmaking Algorithm
  const handleVibeCheckComplete = async (data: VibeData) => {
    if (!spaceId) return;

    let matches: { activity: Activity, basis: string }[] = [];

    categories.forEach(cat => {
      cat.activities.forEach(act => {
        let score = 0;
        if (act.location === data.location) score++;
        if (act.energy === data.energy) score++;
        
        const isRomantic = cat.category === 'Pure Presence' || cat.category === 'Neuro-Parallel Rhythms' || act.mode === 'RESONANCE';
        const isDeep = cat.category === 'Repair & Philosophy' || cat.category === 'Attachment Security' || act.mode === 'DEEP_DIVE';
        const isFun = cat.category === 'New Horizons' || cat.category === 'Playful Discovery' || act.mode === 'ENVELOPE';

        if (data.vibe === 'Romantic' && isRomantic) score += 2;
        if (data.vibe === 'Deep' && isDeep) score += 2;
        if (data.vibe === 'Fun' && isFun) score += 2;

        if (score >= 2) {
          matches.push({ activity: act as Activity, basis: cat.scientific_basis });
        }
      });
    });

    if (matches.length === 0) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      const randomAct = randomCat.activities[Math.floor(Math.random() * randomCat.activities.length)];
      matches.push({ activity: randomAct as Activity, basis: randomCat.scientific_basis });
    }

    // Top 3 matches or whatever matches exist
    matches.sort(() => 0.5 - Math.random());
    const bestMatch = matches[0];

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createSuggestion(bestMatch.activity.id, data, spaceId);
  };

  const getSuggestedActivity = () => {
    if (!suggestedDate) return null;
    for (const cat of categories) {
      const a = cat.activities.find((x) => x.id === suggestedDate.suggested_activity_id);
      if (a) return { activity: a as Activity, basis: cat.scientific_basis };
    }
    return null;
  };

  const suggestedMatch = getSuggestedActivity();

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      

      {/* Horizontal Carousels */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, gap: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className={`px-5 pb-5 ${Platform.OS === 'ios' ? 'pt-20' : 'pt-11'}`}>
          {isLibraryExpanded ? (
            <TouchableOpacity 
              onPress={() => setIsLibraryExpanded(false)}
              className="flex-row items-center gap-3 pt-2"
            >
              <View className="bg-white/10 w-10 h-10 rounded-full items-center justify-center">
                <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
              </View>
              <Text className="text-glacier text-[28px] font-bold tracking-tighter">Library</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text className="text-glacier text-[28px] font-bold tracking-tighter">Guided Dates</Text>
              <Text className="text-glacier text-[12px] mt-2">Science-backed experiences for two</Text>
            </View>
          )}
        </Animated.View>
        {/* ── Live Invitation Card (User B sees this) ── */}
        {incomingSession && (
          <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOut.duration(300)}
            className="px-5 mb-2"
          >
            <BlurView tint="dark" intensity={50} className="rounded-[28px] overflow-hidden" style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 12 }}>
              <LinearGradient
                colors={['rgba(245,158,11,0.2)', 'rgba(251,113,133,0.08)', 'transparent']}
                className="absolute top-0 bottom-0 left-0 right-0"
              />
              <View className="absolute top-0 bottom-0 left-0 right-0 rounded-[28px] border-[1.5px] border-[#F59E0B]/45" pointerEvents="none" />
              <View className="p-[22px] gap-3">
                <View className="flex-row items-center gap-1.5 self-start bg-[#F59E0B]/15 px-2.5 py-1 rounded-xl border border-[#F59E0B]/30">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <Text className="text-[#F59E0B] text-[10px] font-extrabold tracking-widest">LIVE INVITE</Text>
                </View>
                <Text className="text-[#F8FAFC] text-[20px] font-bold tracking-tighter">
                  {(guidedDates as { guided_dates: Category[] }).guided_dates
                    .flatMap((c) => c.activities)
                    .find((a) => a.id === incomingSession.template_id)?.title ?? 'Guided Date'}
                </Text>
                <Text className="text-[#94A3B8] text-[14px] leading-5">
                  ⚡ Your partner started a date. Join them now!
                </Text>
                <TouchableOpacity
                  onPress={handleAcceptInvite}
                  activeOpacity={0.85}
                  className="rounded-[18px] py-3.5 items-center overflow-hidden mt-1"
                  style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
                >
                  <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="absolute top-0 bottom-0 left-0 right-0"
                  />
                  <Text className="text-[#0F172A] font-extrabold text-[15px] tracking-wider">Accept & Join ✦</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* ── State A / B: The Daily Spark Matchmaker ── */}
        {!isLibraryExpanded && (
          <View>
             {!suggestedDate ? (
               <View>
                 <VibeCheck onComplete={handleVibeCheckComplete} />
                 <Animated.View entering={FadeInDown.delay(500).springify()} className="px-5 items-center mt-2">
                   <TouchableOpacity
                     onPress={() => {
                       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                       setIsLibraryExpanded(true);
                     }}
                     activeOpacity={0.7}
                     className="py-3 px-6 rounded-full bg-white/5 border border-white/10 flex-row items-center gap-2"
                   >
                     <Text className="text-white/80 font-bold text-[14px] tracking-wide">Browse Library</Text>
                     <Ionicons name="arrow-forward" size={16} color="white" />
                   </TouchableOpacity>
                 </Animated.View>
               </View>
             ) : suggestedMatch ? (
               <TodayMatchCard 
                 activity={suggestedMatch.activity} 
                 category={suggestedMatch.basis} 
                 onStartPress={() => handleCardPress(suggestedMatch.activity, suggestedMatch.basis)} 
                 onBrowseAllPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   setIsLibraryExpanded(true);
                 }} 
               />
             ) : null}
          </View>
        )}

        {/* ── State C: The Library ── */}
        {isLibraryExpanded && categories.length > 0 && (
          <View>
            {categories.map((cat, ci) => (
              <Animated.View key={cat.category} entering={FadeInDown.delay(150 + ci * 40).springify()}>
            <View className="px-5 mb-4">
              <Text className="text-[#F8FAFC] text-[18px] font-bold tracking-tighter">{cat.category}</Text>
              <Text className="text-[#475569] text-[12px] mt-0.5 italic">{cat.scientific_basis}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
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
          </View>
        )}

        <View className="h-[120px]" />
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


