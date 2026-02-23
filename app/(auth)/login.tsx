import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/src/lib/supabase';

type Mode = 'idle' | 'email';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    // Try sign-in first; if user doesn't exist, sign them up
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) Alert.alert('Auth error', signUpError.message);
      else Alert.alert('Check your email', 'We sent a confirmation link.');
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
          <Text style={{ fontSize: 64 }}>🔥</Text>
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
                {loading ? 'Please wait…' : 'Continue'}
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
