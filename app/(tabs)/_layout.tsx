import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useSettingsStore, t } from '@/store/settingsStore';

export default function TabLayout() {
  const { locale } = useSettingsStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.surfaceBorder, borderTopWidth: 1 },
        tabBarActiveTintColor: Colors.crimson,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home', locale), tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="requests" options={{ title: t('myRequests', locale), tabBarIcon: ({ color, size }) => <MaterialIcons name="list-alt" size={size} color={color} /> }} />
      <Tabs.Screen name="donate" options={{ title: t('donate', locale), tabBarIcon: ({ color, size }) => <MaterialIcons name="volunteer-activism" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile', locale), tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
