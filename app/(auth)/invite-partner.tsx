import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvitePartnerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [sparkCode, setSparkCode] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [partnerJoined, setPartnerJoined] = useState(false);

  // Join-by-code state
  const [partnerCode, setPartnerCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Could not open share sheet.');
    }
  };

  const handleJoinByCode = async () => {
    const trimmed = partnerCode.trim().toUpperCase();
    if (!trimmed) return;

    setJoining(true);
    setJoinError(null);

    try {
      const { data, error } = await supabase.rpc('join_space_by_code', { p_code: trimmed });

      if (error) {
        // Map Postgres exception names to friendly messages
        const msg = error.message ?? '';
        if (msg.includes('code_not_found')) {
          setJoinError('No space found with that code. Double-check and try again.');
        } else if (msg.includes('space_full')) {
          setJoinError('This space already has two members.');
        } else if (msg.includes('already_joined')) {
          setJoinError('You are already in this space!');
        } else {
          setJoinError('Something went wrong. Please try again.');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      router.replace('/(root)/home');
    } catch (e) {
      console.warn('[InvitePartner] join error:', JSON.stringify(e));
      setJoinError('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(root)/home');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, backgroundColor: '#0B0F1A' }}>

        {/* Skip */}
        <TouchableOpacity
          onPress={handleSkip}
          hitSlop={12}
          style={{ position: 'absolute', top: 64, right: 24, zIndex: 20 }}
        >
          <Text style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' }}>
            Skip
          </Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 100, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pulsing Logo */}
          <Animated.View style={[animatedLogoStyle, { marginBottom: 36 }]}>
            <Image
              source={require('../../assets/logo-transparent-bg.png')}
              style={{ width: 80, height: 80 }}
            />
          </Animated.View>

          {/* Header */}
          <Text
            style={{ color: '#E2EAF4', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, letterSpacing: -1, lineHeight: 44 }}
          >
            {'Invite your '}
            <Text style={{ color: '#F59E0B' }}>partner</Text>
          </Text>
          <Text style={{ color: '#64748B', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 16 }}>
            Every spark is brighter together. Connect with your partner to start your journey.
          </Text>

          {/* ── Share Your Code Card ── */}
          <BlurView
            tint="dark"
            intensity={50}
            style={{ width: '100%', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 16 }}
          >
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16, fontWeight: '600' }}>
                Your Spark Code
              </Text>

              {loading ? (
                <ActivityIndicator color="#F59E0B" />
              ) : (
                <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7}>
                  <Text
                    style={{ color: '#E2EAF4', fontWeight: 'bold', textAlign: 'center', fontSize: 40, letterSpacing: 4 }}
                  >
                    {sparkCode}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
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
            style={{
              width: '100%',
              borderRadius: 24,
              paddingVertical: 18,
              alignItems: 'center',
              marginBottom: 12,
              backgroundColor: '#F59E0B',
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 20,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#0B0F1A', fontSize: 17, fontWeight: 'bold' }}>Send Invite 💌</Text>
          </TouchableOpacity>

          {/* Waiting / joined indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            {!partnerJoined ? (
              <>
                <ActivityIndicator size="small" color="#475569" />
                <Text style={{ color: '#64748B', fontSize: 14 }}>Waiting for your partner to join...</Text>
              </>
            ) : (
              <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: 'bold' }}>
                ✓ Partner joined! Taking you in...
              </Text>
            )}
          </View>

          {/* ── Divider ── */}
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <Text style={{ color: '#475569', fontSize: 12, marginHorizontal: 12, fontWeight: '600' }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </View>

          {/* ── Join by Partner's Code ── */}
          <BlurView
            tint="dark"
            intensity={50}
            style={{ width: '100%', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}
          >
            <View style={{ padding: 28, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6, fontWeight: '600' }}>
                Have a code?
              </Text>
              <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                Enter your partner's Spark code to join their space.
              </Text>

              {/* Code Input */}
              <TextInput
                value={partnerCode}
                onChangeText={(text) => {
                  setPartnerCode(text.toUpperCase());
                  if (joinError) setJoinError(null);
                }}
                placeholder="SP-XXXX"
                placeholderTextColor="#334155"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: joinError ? '#EF4444' : 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  color: '#E2EAF4',
                  fontSize: 26,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  letterSpacing: 4,
                  marginBottom: 12,
                }}
              />

              {/* Error message */}
              {joinError && (
                <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  {joinError}
                </Text>
              )}

              {/* Join Button */}
              <TouchableOpacity
                onPress={handleJoinByCode}
                disabled={joining || partnerCode.trim().length < 6}
                activeOpacity={0.85}
                style={{
                  width: '100%',
                  borderRadius: 20,
                  paddingVertical: 16,
                  alignItems: 'center',
                  backgroundColor: '#1E293B',
                  borderWidth: 1,
                  borderColor: partnerCode.trim().length >= 6 ? '#F59E0B' : 'rgba(255,255,255,0.1)',
                  opacity: joining || partnerCode.trim().length < 6 ? 0.5 : 1,
                }}
              >
                {joining ? (
                  <ActivityIndicator color="#F59E0B" />
                ) : (
                  <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: 'bold' }}>
                    Join Partner's Space 🔥
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
