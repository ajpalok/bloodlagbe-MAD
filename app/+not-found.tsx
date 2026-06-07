import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/theme/colors';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>পৃষ্ঠাটি পাওয়া যায়নি</Text>
        <Link href="/" style={styles.link}><Text style={styles.linkText}>হোমে ফিরুন</Text></Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '600', marginBottom: 20 },
  link: { padding: 12 },
  linkText: { color: Colors.crimson, fontSize: 16 },
});
