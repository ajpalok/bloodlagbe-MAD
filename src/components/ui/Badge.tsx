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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  crimson: { backgroundColor: Colors.crimsonBg },
  gold: { backgroundColor: '#2D2400' },
  success: { backgroundColor: Colors.successBg },
  warning: { backgroundColor: Colors.warningBg },
  muted: { backgroundColor: Colors.surfaceElevated },
  text: { fontSize: 12, fontWeight: '600' },
  crimsonText: { color: Colors.crimson },
  goldText: { color: Colors.gold },
  successText: { color: Colors.success },
  warningText: { color: Colors.warning },
  mutedText: { color: Colors.textSecondary },
});
