import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useRevenueCat } from '@/src/context/RevenueCatContext';
import { useActiveSession } from '@/src/hooks/useActiveSession';
import { useDailySpark } from '@/src/hooks/useDailySpark';
import { useWidgetSurprise } from '@/src/hooks/useWidgetSurprise';
import { useStreak } from '@/src/hooks/useStreak';

import { PartnerHeader } from '@/src/components/home/PartnerHeader';
import { IncomingInviteCard } from '@/src/components/home/IncomingInviteCard';
import { DailySparkCard } from '@/src/components/home/DailySparkCard';
import { WidgetSurpriseCard } from '@/src/components/home/WidgetSurpriseCard';
import { StickyNoteModal } from '@/src/components/home/StickyNoteModal';
import type { PartnerProfile } from '@/src/components/home/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const { isPremium } = useRevenueCat();
  const router = useRouter();

  const [myProfile, setMyProfile] = useState<PartnerProfile | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [draftAnswer, setDraftAnswer] = useState('');

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latestSurprise, partnerSurprise, sending: sendingSurprise, sendNote, sendPhoto, sendReaction } = useWidgetSurprise();

  const { spark, myAnswer, partnerAnswer, sparkState, loading: loadingData, submitting, submitAnswer, error: sparkError } = useDailySpark();

  const { incomingSession, acceptSession } = useActiveSession();
  const { streak, isLoading: loadingStreak } = useStreak();

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

  const handleAcceptInvite = async () => {
    if (!incomingSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await acceptSession(incomingSession.id);
    router.push('/(root)/dates');
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingProfile(true);
      try {
        const { data: profile } = await supabase.from('profiles').select('id, display_name, avatar_url, partner_id').eq('id', user.id).single();
        if (profile) {
          setMyProfile({ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url });
          if (profile.partner_id) {
            const { data: partnerData } = await supabase.from('profiles').select('id, display_name, avatar_url').eq('id', profile.partner_id).single();
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

  return (
    <View className="flex-1 bg-midnight">
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: 120,
          gap: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-0">
          <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row items-center justify-between">
            <View className="flex-col justify-center">
              <Text className="text-[24px] font-light text-slate-muted leading-[34px] ">Good {getTimeOfDay()},</Text>
              <Text className="text-[32px] font-bold tracking-wide text-spark leading-[38px]">
                {myProfile?.display_name?.split(' ')[0] ?? 'there'}
              </Text>
            </View>
          </Animated.View>
          <View className="absolute -top-6 right-0 flex-row items-center gap-2">
            {!loadingStreak && streak > 0 && (
              <View className="rounded-full border border-rose/30 bg-rose/10 px-3 py-1 flex-row items-center gap-1.5 shadow-sm">
                <Ionicons name="flame" size={12} color="#FB7185" />
                <Text className="text-[10px] font-bold text-rose tracking-wider">{streak} DAY STREAK</Text>
              </View>
            )}
            {isPremium && (
              <View className="rounded-full border border-spark bg-spark/12 px-3 py-1">
                <Text className="text-[10px] font-bold text-spark">✦ PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        <IncomingInviteCard incomingSession={incomingSession} onAccept={handleAcceptInvite} />

        <DailySparkCard
          loadingData={loadingData}
          spark={spark}
          sparkError={sparkError}
          sparkState={sparkState}
          draftAnswer={draftAnswer}
          setDraftAnswer={setDraftAnswer}
          myAnswer={myAnswer}
          partner={partner}
          partnerAnswer={partnerAnswer}
          handleSubmitAnswer={handleSubmitAnswer}
          submitting={submitting}
        />

        <WidgetSurpriseCard
          partnerSurprise={partnerSurprise}
          latestSurprise={latestSurprise}
          myUserId={user?.id}
          partnerFirstName={partnerFirstName}
          sendingSurprise={sendingSurprise}
          onOpenNoteModal={() => setNoteModalVisible(true)}
          handleWidgetPhoto={handleWidgetPhoto}
          handleWidgetReaction={handleWidgetReaction}
        />
      </ScrollView>

      {toastVisible && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOut.duration(300)}
          className="absolute bottom-28 self-center rounded-3xl border border-spark/35 bg-slate-900/95 px-5 py-3"
          style={{ shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}
          pointerEvents="none"
        >
          <Text className="text-sm font-semibold tracking-wide text-glacier">{toastMsg}</Text>
        </Animated.View>
      )}

      <StickyNoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        draftNote={draftNote}
        setDraftNote={setDraftNote}
        handleSubmit={handleWidgetNoteSubmit}
        sendingSurprise={sendingSurprise}
      />
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
