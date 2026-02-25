import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/src/lib/supabase';

type Mode = 'idle' | 'email';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // ── Logo Animations ─────────────────────────────────────────
  const floatAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(0.85);

  useEffect(() => {
    // Floating effect (up and down 8px)
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle opacity pulse (breathing)
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
    opacity: pulseAnim.value,
  }));

  // ── Apple Sign-In ────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) Alert.alert('Sign-in failed', error.message);
        // RouteGuard handles navigation after session updates
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In error', e.message);
      }
    }
  };

  // ── Email / Password ─────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Please enter your email and password.');
      return;
    }
    setLoading(true);

    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Sign Up Error', error.message);
      else if (!data?.session) Alert.alert('Check your email', 'We sent a confirmation link.');
      // RouteGuard handles navigation after session updates
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Sign In Error', error.message);
      // RouteGuard handles navigation after session updates
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-midnight"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      <View className="flex-1 justify-end px-6 pb-14">
        {/* Brand */}
        <View className="items-center mb-16">
          <Animated.View style={animatedLogoStyle}>
            <Image source={require('../../assets/logo-transparent-bg.png')} className="w-32 h-32" />
          </Animated.View>
          <Text
            className="text-glacier text-5xl font-bold mt-3"
            style={{ letterSpacing: -1.5 }}>
            Spark
          </Text>
          <Text className="text-slate-muted text-base mt-2">
            Connect deeper, every day.
          </Text>
        </View>

        {/* Email form (expanded when mode = 'email') */}
        {mode === 'email' && (
          <View className="mb-4 gap-3">
            <TextInput
              className="bg-white/5 border border-slate-muted/40 rounded-2xl px-4 py-4 text-glacier text-base"
              placeholder="Email"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              className="bg-white/5 border border-slate-muted/40 rounded-2xl px-4 py-4 text-glacier text-base"
              placeholder="Password"
              placeholderTextColor="#475569"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={handleEmailAuth}
              disabled={loading}
              activeOpacity={0.85}
              className="bg-spark rounded-2xl py-4 items-center"
              style={{
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
              }}>
              <Text className="text-midnight font-bold text-base">
                {loading ? 'Please wait…' : (isSignUp ? 'Sign Up' : 'Log In')}
              </Text>
            </TouchableOpacity>

            {/* Toggle Sign Up / Log In */}
            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              activeOpacity={0.7}
              className="mt-2 items-center py-2">
              <Text className="text-slate-muted text-sm font-medium">
                {isSignUp
                  ? 'Already have an account? Log In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Apple Sign-In */}
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={16}
          style={{ height: 52, marginBottom: 12 }}
          onPress={handleAppleSignIn}
        />

        {/* Email toggle */}
        {mode === 'idle' && (
          <TouchableOpacity
            onPress={() => setMode('email')}
            activeOpacity={0.7}
            className="border border-slate-muted/40 rounded-2xl py-4 items-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Text className="text-glacier text-base font-medium">
              Continue with Email
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-slate-muted text-xs text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
