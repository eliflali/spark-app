import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Data
import guidedDates from '@/assets/guided-dates/guided-dates.json';
import conversationStarters from '@/assets/guided-dates/conversation-starters.json';

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

// Conversation Decks
import { ConversationDeckCard, type DeckData } from '@/src/components/guided-dates/ConversationDeckCard';
import { ConversationDeckController } from '@/src/components/guided-dates/ConversationDeckController';



// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DatesScreen() {
  const { user } = useAuth();

  const [activeFilter, setActiveFilter] = useState<Mode | 'ALL'>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedBasis, setSelectedBasis] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  // Track the sessionId of the session User A just started
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [myName, setMyName] = useState('You');
  const [partnerName, setPartnerName] = useState('Partner');
  const [hasPartner, setHasPartner] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const categories = (guidedDates as { guided_dates: Category[] }).guided_dates;

  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<DeckData | null>(null);

  // ── Real-time hooks ────────────────────────────────────────────────────────
  const { incomingSession, acceptSession, cancelSession, startSession } = useActiveSession();
  const { suggestedDate, isCompleted, createSuggestion } = useSuggestedDate();

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
          setHasPartner(true);
          const { data: partner } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', profile.partner_id)
            .single();
          if (partner?.display_name) setPartnerName(partner.display_name.split(' ')[0]);
        } else {
          setHasPartner(false);
        }
      } catch (e) {
        console.warn('[DatesScreen] load error:', e);
      } finally {
        setIsProfileLoaded(true);
      }
    })();
  }, [user]);

  const handleCardPress = useCallback(async (activity: Activity, basis: string, category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // If we have a spaceId, create (or retrieve) the pending session for User A
    if (spaceId) {
      const sessionId = await startSession(activity.id, spaceId);
      setCurrentSessionId(sessionId);
    }
    setSelectedActivity(activity);
    setSelectedBasis(basis);
    setSelectedCategory(category);
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
    let foundCategory = '';
    for (const cat of allCats) {
      const a = cat.activities.find((x) => x.id === incomingSession.template_id);
      if (a) {
        foundActivity = a as Activity;
        foundBasis = cat.scientific_basis;
        foundCategory = cat.category;
        break;
      }
    }
    if (foundActivity) {
      setCurrentSessionId(incomingSession.id);
      setSelectedActivity(foundActivity);
      setSelectedBasis(foundBasis);
      setSelectedCategory(foundCategory);
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

    let matches: { activity: Activity, basis: string, category: string }[] = [];

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
          matches.push({ activity: act as Activity, basis: cat.scientific_basis, category: cat.category });
        }
      });
    });

    if (matches.length === 0) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      const randomAct = randomCat.activities[Math.floor(Math.random() * randomCat.activities.length)];
      matches.push({ activity: randomAct as Activity, basis: randomCat.scientific_basis, category: randomCat.category });
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
      if (a) return { activity: a as Activity, basis: cat.scientific_basis, category: cat.category };
    }
    return null;
  };

  const suggestedMatch = getSuggestedActivity();

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(142, 154, 175, 0.03)', 'rgba(142, 154, 175, 0.01)']}
        style={StyleSheet.absoluteFillObject}
      />
      

      {/* Horizontal Carousels */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, gap: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className={`px-5 pb-5 ${Platform.OS === 'ios' ? 'pt-24' : 'pt-11'}`}>
          {isLibraryExpanded ? (
            <TouchableOpacity 
              onPress={() => setIsLibraryExpanded(false)}
              className="flex-row items-center gap-3 pt-2"
            >
              <View className="w-10 h-10 rounded-full items-center justify-center">
                <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
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

        {hasPartner ? (
          <>
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
                  <View className="w-1.5 h-1.5 rounded-full bg-spark" />
                  <Text className="text-spark text-[10px] font-extrabold tracking-widest">LIVE INVITE</Text>
                </View>
                <Text className="text-spark text-[20px] font-bold tracking-tighter">
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
               <VibeCheck onComplete={handleVibeCheckComplete} />
             ) : isCompleted ? (
                <View className="px-5">
                   <BlurView tint="dark" intensity={50} className="w-full rounded-[32px] overflow-hidden p-[2px] items-center justify-center min-h-[160px]" style={{ shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 }}>
                       <LinearGradient colors={['#FBBF2433', '#F59E0B0d', 'transparent']} className="absolute inset-0" />
                       <View className="absolute inset-0 rounded-[30px] border-[1.5px] border-spark/30" pointerEvents="none" />
                       <View className="w-16 h-16 rounded-full bg-spark/20 border border-spark/40 items-center justify-center mb-4">
                           <Ionicons name="heart" size={28} color="#FBBF24" />
                       </View>
                       <Text className="text-glacier text-[20px] font-bold tracking-tighter text-center">Date Completed</Text>
                       <Text className="text-slate-muted text-[14px] mt-2 text-center px-4">You and your partner have successfully connected today.</Text>
                   </BlurView>
                </View>
             ) : suggestedMatch ? (
               <TodayMatchCard 
                 activity={suggestedMatch.activity} 
                 category={suggestedMatch.basis} 
                 onStartPress={() => handleCardPress(suggestedMatch.activity, suggestedMatch.basis, suggestedMatch.category)} 
               />
             ) : null}

             <Animated.View entering={FadeInDown.delay(500).springify()} className="px-5 items-center mt-2">
               <TouchableOpacity
                 onPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   setIsLibraryExpanded(true);
                 }}
                 activeOpacity={0.7}
                 className="py-3 px-6 flex-row items-center gap-2"
               >
                 <Text className="text-slate-muted text-[14px] tracking-wide">Browse Date Library</Text>
               </TouchableOpacity>
             </Animated.View>
          </View>
        )}

        
          </>
        ) : isProfileLoaded ? (
          <Animated.View entering={FadeInDown.delay(300).springify()} className="items-center justify-center pt-8">
            <View className="w-20 h-20 rounded-full items-center justify-center shadow-xl mb-6">
              <Ionicons name="heart-half" size={32} color="#FBBF24" />
            </View>
            <Text className="text-glacier text-[22px] font-bold tracking-tight mb-2 text-center">Your Space Awaits</Text>
            <Text className="text-slate-muted text-[15px] text-center ali leading-[22px] px-10 mb-8">
              Guided Dates are designed for two. Connect with your partner to unlock science-backed experiences.
            </Text>
            
            <View className="px-5 w-full">
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  import('expo-router').then(({ router }) => {
                    router.push('/(auth)/invite-partner');
                  });
                }}
                activeOpacity={0.8}
                className="w-full rounded-[20px] items-center justify-center overflow-hidden py-4 border border-spark/30"
                style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 }}
              >
                <LinearGradient
                  colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']}
                  className="absolute inset-0"
                />
                <Text className="text-spark text-[16px] font-bold tracking-wide">Invite Partner</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}
        {/* ── Conversation Decks ── */}
        {!isLibraryExpanded && (
          <Animated.View entering={FadeInDown.delay(300).springify()} className="mt-8 mb-4">
            <View className="px-5 mb-4">
              <Text className="text-glacier text-[20px] font-bold tracking-tighter">Meaningful Conversations</Text>
              <Text className="text-slate-muted text-[12px] mt-1 mb-4">36 Questions to deepen connection</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              snapToInterval={176}
              decelerationRate="fast"
            >
              {conversationStarters.conversation_decks.map((deck, i) => (
                <ConversationDeckCard
                  key={deck.deck_id}
                  deck={deck as DeckData}
                  index={i}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDeck(deck as DeckData);
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── State C: The Library ── */}
        {isLibraryExpanded && categories.length > 0 && (
          <View>
            {categories.map((cat, ci) => (
              <Animated.View key={cat.category} entering={FadeInDown.delay(150 + ci * 40).springify()}>
            <View className="px-5 mb-4">
              <Text className="text-glacier text-[18px] font-bold tracking-tighter">{cat.category}</Text>
              <Text className="text-slate-muted text-[12px] mt-1 italic">{cat.scientific_basis}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 30}}
              snapToInterval={176}
              decelerationRate="fast"
            >
              {cat.activities.map((activity) => (
                <AnimatedGradientCard
                  key={activity.id}
                  activity={activity as Activity}
                  category={cat.category}
                  onPress={() => handleCardPress(activity as Activity, cat.scientific_basis, cat.category)}
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
        category={selectedCategory}
        spaceId={spaceId}
        sessionId={currentSessionId}
        myUserId={user?.id}
        myName={myName}
        partnerName={partnerName}
        onClose={handleDateControllerClose}
      />

      {/* Conversation Deck Controller modal */}
      <ConversationDeckController
        visible={!!selectedDeck}
        deck={selectedDeck}
        onClose={() => setSelectedDeck(null)}
      />
    </View>
  );
}


