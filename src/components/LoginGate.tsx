import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/theme/colors';

interface LoginGateProps {
  children: React.ReactNode;
  /** Optional override message */
  message?: string;
}

/**
 * Wraps content that requires authentication.
 * Authenticated users see the children; unauthenticated users see an inline login prompt.
 */
export function LoginGate({ children, message }: LoginGateProps) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔐</Text>
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
  emoji: { fontSize: 52, marginBottom: 18 },
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
