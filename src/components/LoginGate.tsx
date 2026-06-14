import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/theme/colors';

interface LoginGateProps {
  children: React.ReactNode;
  message?: string;
}

export function LoginGate({ children, message }: LoginGateProps) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.lockIcon}>🔐</Text>
      </View>
      <Text style={styles.title}>লগইন প্রয়োজন</Text>
      <Text style={styles.desc}>
        {message ?? 'এই ফিচারটি ব্যবহার করতে আপনার অ্যাকাউন্টে লগইন করুন।'}
      </Text>
      <Button
        title="লগইন / নিবন্ধন করুন"
        onPress={() => router.push('/(auth)/login')}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.darkBg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockIcon: { fontSize: 34 },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: { width: '100%' },
});
