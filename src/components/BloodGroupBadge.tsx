import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/theme/colors';

interface BloodGroupBadgeProps {
  group: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { dimension: 32, fontSize: 11, borderRadius: 10 },
  md: { dimension: 46, fontSize: 14, borderRadius: 14 },
  lg: { dimension: 58, fontSize: 18, borderRadius: 18 },
};

export function BloodGroupBadge({ group, size = 'md' }: BloodGroupBadgeProps) {
  const { dimension, fontSize, borderRadius } = SIZE_MAP[size];
  return (
    <View
      style={[
        styles.badge,
        {
          width: dimension,
          height: dimension,
          borderRadius,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize }]} numberOfLines={1} adjustsFontSizeToFit>
        {group}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.white,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
