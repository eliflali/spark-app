import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { ONBOARDING_KEY } from '@/src/lib/constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSparkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SP-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvitePartnerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [sparkCode, setSparkCode] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [partnerJoined, setPartnerJoined] = useState(false);

  // ── Pulsing logo animation ─────────────────────────────────────────────────
  const floatAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(0.8);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
    opacity: pulseAnim.value,
  }));

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // ── Create or fetch space on mount ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    createOrFetchSpace();
  }, [user]);

  const createOrFetchSpace = async () => {
    setLoading(true);
    try {
      // getSession() ensures the JWT token is fully hydrated from SecureStore
      // before ANY db write — without this, the first request after app reload
      // can fire before the token is attached to the client, causing 42501.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[InvitePartner] session uid:', session?.user?.id ?? '(none)', '| error:', sessionError);
      if (!session) {
        console.warn('[InvitePartner] Aborting: no active session');
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Check if already has a space
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('space_id, spaces(id, invite_code)')
        .eq('id', userId)
        .single();

      console.log('[InvitePartner] profile:', profile, '| profileError:', profileError);

      if (profile?.space_id) {
        const existing = profile.spaces as any;
        setSpaceId(existing.id);
        setSparkCode(existing.invite_code);
      } else {
        // Space doesn't exist yet. Use an RPC (SECURITY DEFINER) to create
        // the space + link the profile atomically, bypassing the RLS RETURNING conflict.
        console.log('[InvitePartner] No space yet, calling create_space_for_user RPC...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_space_for_user');

        console.log('[InvitePartner] RPC result:', rpcData, '| error:', rpcError);
        if (rpcError) throw rpcError;

        setSpaceId(rpcData.id);
        setSparkCode(rpcData.invite_code);
      }
    } catch (e) {
      console.warn('[InvitePartner] setupSpace error:', JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Real-time: watch for partner joining ──────────────────────────────────
  useEffect(() => {
    if (!spaceId) return;

    const channel = supabase
      .channel(`space:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `space_id=eq.${spaceId}`,
        },
        async () => {
          // Check if two people now share this space
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('space_id', spaceId);

          if (data && data.length >= 2) {
            setPartnerJoined(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Mark onboarding complete and go home
            await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
            setTimeout(() => router.replace('/(root)/home'), 1200);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCopyCode = () => {
    if (!sparkCode) return;
    Clipboard.setString(sparkCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    if (!sparkCode) return;
    const message = `I found a special space for us to grow closer. Join me on Spark using my code: ${sparkCode}. Let's keep our flame alive! 🔥`;

    console.log("sparkCode", sparkCode);
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Could not open share sheet.');
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(root)/home');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-midnight px-6">

      {/* Skip */}
      <TouchableOpacity
        onPress={handleSkip}
        hitSlop={12}
        className="absolute top-16 right-6 z-20"
      >
        <Text className="text-slate-muted text-sm uppercase tracking-wide font-medium">Skip</Text>
      </TouchableOpacity>

      <View className="flex-1 items-center justify-center">

        {/* Pulsing Logo */}
        <Animated.View style={[animatedLogoStyle, { marginBottom: 36 }]}>
          <Image
            source={require('../../assets/logo-transparent-bg.png')}
            style={{ width: 80, height: 80 }}
          />
        </Animated.View>

        {/* Header */}
        <Text
          className="text-glacier text-4xl font-bold text-center mb-3"
          style={{ letterSpacing: -1, lineHeight: 44 }}
        >
          Invite your<Text className="text-spark"> partner</Text>
        </Text>
        <Text className="text-slate-muted text-base text-center leading-6 mb-10 px-4">
          Every spark is brighter together. Connect with your partner to start your journey.
        </Text>

        {/* Invite Card */}
        <BlurView
          tint="dark"
          intensity={50}
          className="w-full rounded-3xl border border-white/10 overflow-hidden mb-8"
        >
          <View className="p-8 items-center">
            <Text className="text-slate-muted text-xs uppercase tracking-widest mb-4 font-semibold">
              Your Spark Code
            </Text>

            {loading ? (
              <ActivityIndicator color="#F59E0B" />
            ) : (
              <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
                <Text
                  className="text-glacier font-bold text-center"
                  style={{ fontSize: 40, letterSpacing: 4 }}
                >
                  {sparkCode}
                </Text>
                <Text className="text-slate-muted text-xs text-center mt-3">
                  {copied ? '✓ Copied!' : 'Tap to copy'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>

        {/* Send Invite Button */}
        <TouchableOpacity
          onPress={handleSendInvite}
          disabled={loading || !sparkCode}
          activeOpacity={0.85}
          className="w-full rounded-3xl py-5 items-center mb-6"
          style={{
            backgroundColor: '#F59E0B',
            shadowColor: '#F59E0B',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Text className="text-midnight text-lg font-bold">Send Invite 💌</Text>
        </TouchableOpacity>

        {/* Waiting indicator */}
        {!partnerJoined ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#475569" />
            <Text className="text-slate-muted text-sm">Waiting for your partner to join...</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Text className="text-spark text-sm font-bold">✓ Partner joined! Taking you in...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
