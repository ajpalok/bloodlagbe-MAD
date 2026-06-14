import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'crimson' | 'gold' | 'success' | 'warning' | 'muted';
}

export function Badge({ label, variant = 'muted' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  crimson: { backgroundColor: Colors.crimsonBg, borderColor: 'rgba(255,71,73,0.30)' },
  gold: { backgroundColor: Colors.goldBg, borderColor: 'rgba(226,199,133,0.30)' },
  success: { backgroundColor: Colors.successBg, borderColor: 'rgba(76,175,80,0.30)' },
  warning: { backgroundColor: Colors.warningBg, borderColor: 'rgba(255,152,0,0.30)' },
  muted: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.surfaceBorder },
  text: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  crimsonText: { color: Colors.crimson },
  goldText: { color: Colors.gold },
  successText: { color: Colors.success },
  warningText: { color: Colors.warning },
  mutedText: { color: Colors.textSecondary },
});
