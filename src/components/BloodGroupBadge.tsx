import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/theme/colors';

interface BloodGroupBadgeProps {
  group: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BloodGroupBadge({ group, size = 'md' }: BloodGroupBadgeProps) {
  return (
    <View style={[styles.badge, styles[size]]}>
      <Text style={[styles.text, styles[`${size}Text`]]}>{group}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: Colors.crimsonBg, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sm: { paddingHorizontal: 8, paddingVertical: 4 },
  md: { paddingHorizontal: 12, paddingVertical: 8 },
  lg: { paddingHorizontal: 18, paddingVertical: 12 },
  text: { color: Colors.crimson, fontWeight: '700' },
  smText: { fontSize: 12 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 22 },
});
