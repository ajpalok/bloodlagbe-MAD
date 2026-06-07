import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Colors } from '@/theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.crimson} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, flexDirection: 'row' },
  primary: { backgroundColor: Colors.crimson },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.crimson },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.crimsonDark },
  sm: { paddingHorizontal: 14, paddingVertical: 8 },
  md: { paddingHorizontal: 20, paddingVertical: 13 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  text: { fontWeight: '600', letterSpacing: 0.3 },
  primaryText: { color: Colors.white },
  outlineText: { color: Colors.crimson },
  ghostText: { color: Colors.textSecondary },
  dangerText: { color: Colors.white },
  smText: { fontSize: 13 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 16 },
});
