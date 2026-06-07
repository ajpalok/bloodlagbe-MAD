import { useAuthStore } from '@/store/authStore';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { Colors } from '@/theme/colors';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.darkBg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
