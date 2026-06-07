import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';

export default function VerifyScreen() {
  const { verification_id, contact, recipient_type } = useLocalSearchParams<{
    verification_id: string;
    contact: string;
    recipient_type: string;
  }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);
  const { setAuth } = useAuthStore();

  // Countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleChange(text: string, idx: number) {
    const val = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
  }

  function handleKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    try {
      // Backend expects: recipient + code + device_token (sent via interceptor)
      const result = await authApi.verify(contact, code);
      await handleAuthSuccess(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'OTP ভুল হয়েছে';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSuccess(result: {
    token: string;
    is_new_user: boolean;
    onboarding_complete: boolean;
  }) {
    await storage.setAuthToken(result.token);
    const user = await authApi.me();
    await setAuth(result.token, user);

    if (!result.onboarding_complete) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await authApi.initiate(contact);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      Alert.alert('সফল', 'নতুন OTP পাঠানো হয়েছে।');
    } catch {
      Alert.alert('ত্রুটি', 'আবার OTP পাঠানো যায়নি।');
    } finally {
      setResendLoading(false);
    }
  }

  const codeComplete = otp.every((d) => d !== '');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← ফিরে যান</Text>
          </TouchableOpacity>

          <Text style={styles.title}>OTP যাচাই</Text>
          <Text style={styles.desc}>
            <Text style={styles.contact}>{contact}</Text> তে পাঠানো ৬ সংখ্যার OTP দিন
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(r) => {
                  inputs.current[idx] = r;
                }}
                style={[styles.otpBox, digit && styles.otpFilled]}
                value={digit}
                onChangeText={(t) => handleChange(t, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <Button title="যাচাই করুন" onPress={handleVerify} loading={loading} disabled={!codeComplete} />

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
              {resendCooldown > 0
                ? `পুনরায় পাঠান (${resendCooldown}s)`
                : 'পুনরায় OTP পাঠান'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 24, left: 24 },
  backText: { color: Colors.gold, fontSize: 14 },
  title: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700', marginBottom: 10 },
  desc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 32 },
  contact: { color: Colors.gold },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 32 },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpFilled: { borderColor: Colors.crimson },
  resendBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
  resendText: { color: Colors.gold, fontSize: 14, fontWeight: '500' },
  resendDisabled: { color: Colors.textMuted },
});
