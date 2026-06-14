import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useSettingsStore, t } from '@/store/settingsStore';

export default function TabLayout() {
  const { locale } = useSettingsStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.surfaceBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
            android: {
              elevation: 16,
            },
          }),
        },
        tabBarActiveTintColor: Colors.crimson,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home', locale),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('myRequests', locale),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="article" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="donate"
        options={{
          title: t('donate', locale),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="volunteer-activism" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile', locale),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size + 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
