import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { identifyDevice, getDeviceToken } from '@/lib/device';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/theme/colors';
import { useSettingsStore, t } from '@/store/settingsStore';

type DeviceState = 'checking' | 'ready' | 'retrying' | 'failed';

export default function LoginScreen() {
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceState, setDeviceState] = useState<DeviceState>('checking');
  const { locale } = useSettingsStore();

  useEffect(() => {
    checkDeviceToken();
  }, []);

  async function checkDeviceToken() {
    setDeviceState('checking');
    const existing = await getDeviceToken();
    if (existing) {
      setDeviceState('ready');
      return;
    }
    setDeviceState('retrying');
    const ok = await identifyDevice();
    setDeviceState(ok ? 'ready' : 'failed');
  }

  async function handleRetryDevice() {
    setDeviceState('retrying');
    const ok = await identifyDevice();
    setDeviceState(ok ? 'ready' : 'failed');
  }

  async function handleSendOtp() {
    const trimmed = contact.trim();
    if (!trimmed) return;

    if (deviceState !== 'ready') {
      setDeviceState('retrying');
      const ok = await identifyDevice();
      if (!ok) {
        setDeviceState('failed');
        Alert.alert(
          'ডিভাইস শনাক্তকরণ ব্যর্থ',
          'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।',
        );
        return;
      }
      setDeviceState('ready');
    }

    setLoading(true);
    try {
      const result = await authApi.initiate(trimmed);
      router.push({
        pathname: '/(auth)/verify',
        params: {
          verification_id: result.verification_id,
          contact: trimmed,
          recipient_type: result.recipient_type,
        },
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      let msg = 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';
      if (axiosErr?.message?.includes('Device token not found')) {
        msg = 'ডিভাইস শনাক্তকরণ ব্যর্থ হয়েছে। অ্যাপটি পুনরায় চালু করুন।';
        setDeviceState('failed');
      } else {
        msg = axiosErr?.response?.data?.message ?? msg;
      }
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  function renderDeviceBanner() {
    if (deviceState === 'ready') return null;

    if (deviceState === 'checking' || deviceState === 'retrying') {
      return (
        <View style={styles.banner}>
          <ActivityIndicator color={Colors.gold} size="small" style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            {deviceState === 'checking' ? 'ডিভাইস যাচাই করা হচ্ছে...' : 'সংযোগ স্থাপন করা হচ্ছে...'}
          </Text>
        </View>
      );
    }

    if (deviceState === 'failed') {
      return (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>
            ⚠️ সার্ভারের সাথে সংযোগ করা যাচ্ছে না।
          </Text>
          <TouchableOpacity onPress={handleRetryDevice} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>আবার চেষ্টা করুন</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Brand hero */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImg}
                contentFit="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Blood Lagbe</Text>
            <Text style={styles.heroTitleBn}>ব্লাড লাগবে</Text>
            <Text style={styles.heroTagline}>রক্তের জন্য সংযোগ</Text>
          </View>

          {/* Device status banner */}
          {renderDeviceBanner()}

          {/* Login form */}
          <View style={styles.form}>
            <Text style={styles.heading}>লগইন / নিবন্ধন</Text>
            <Text style={styles.desc}>
              ফোন নম্বর অথবা ইমেইল দিন — আপনার কাছে একটি OTP পাঠানো হবে।
            </Text>
            <Input
              label="ফোন নম্বর / ইমেইল"
              value={contact}
              onChangeText={setContact}
              placeholder="01XXXXXXXXX বা email@example.com"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
              editable={!loading && deviceState !== 'retrying'}
            />
            <Button
              title={t('sendOtp', locale)}
              onPress={handleSendOtp}
              loading={loading || deviceState === 'retrying'}
              disabled={!contact.trim() || loading || deviceState === 'checking' || deviceState === 'retrying'}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  // Brand hero
  hero: { alignItems: 'center', marginBottom: 36 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,71,73,0.30)',
  },
  logoImg: { width: 80, height: 80 },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroTitleBn: {
    color: Colors.crimson,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 24,
  },
  heroTagline: {
    color: Colors.gold,
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.4,
  },

  // Device banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  bannerText: { color: Colors.gold, fontSize: 13, flex: 1 },
  bannerError: {
    borderColor: 'rgba(255,71,73,0.35)',
    backgroundColor: Colors.crimsonSubtle,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  bannerErrorText: { color: Colors.crimson, fontSize: 13 },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.crimson,
    alignSelf: 'flex-start',
  },
  retryBtnText: { color: Colors.crimson, fontSize: 13, fontWeight: '600' },

  // Form card
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  heading: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  desc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 20 },
});
