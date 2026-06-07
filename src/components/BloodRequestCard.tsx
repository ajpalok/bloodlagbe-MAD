import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BloodGroupBadge } from './BloodGroupBadge';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Colors } from '@/theme/colors';
import type { BloodRequestItem } from '@/types';

interface BloodRequestCardProps {
  request: BloodRequestItem;
  onCollect?: (id: number) => void;
  showCollect?: boolean;
  /** Override the default navigation handler — used by callers that want to
   *  pre-populate the React Query detail cache before pushing the route. */
  onPress?: (request: BloodRequestItem) => void;
}

export function BloodRequestCard({ request, onCollect, showCollect, onPress }: BloodRequestCardProps) {
  const isActive = request.blood_bags_remaining > 0;

  function handlePress() {
    if (onPress) {
      onPress(request);
    } else {
      router.push({ pathname: '/request/[id]', params: { id: request.id } });
    }
  }

  return (
    <Pressable onPress={handlePress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <BloodGroupBadge group={request.blood_group} />
          <View style={styles.headerRight}>
            {request.is_urgent && <Badge label="🚨 জরুরি" variant="crimson" />}
            {!isActive && <Badge label="✓ পূর্ণ" variant="success" />}
          </View>
        </View>

        <Text style={styles.hospital} numberOfLines={1}>{request.hospital_name}</Text>
        {(request.district || request.division) && (
          <Text style={styles.location}>{[request.district, request.division].filter(Boolean).join(', ')}</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.bags}>
            <Text style={styles.bagsNum}>{request.blood_bags_remaining}</Text>/{request.blood_bags_needed} ব্যাগ বাকি
          </Text>
          {request.blood_need_time && (
            <Text style={styles.needTime}>
              {new Date(request.blood_need_time).toLocaleDateString('bn-BD')}
            </Text>
          )}
        </View>

        {showCollect && isActive && onCollect && (
          <Pressable style={styles.collectBtn} onPress={(e) => { e.stopPropagation?.(); onCollect(request.id); }}>
            <Text style={styles.collectText}>১ ব্যাগ পেয়েছি</Text>
          </Pressable>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerRight: { flexDirection: 'row', gap: 6 },
  hospital: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  location: { color: Colors.textSecondary, fontSize: 13, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bags: { color: Colors.textSecondary, fontSize: 13 },
  bagsNum: { color: Colors.crimson, fontWeight: '700' },
  needTime: { color: Colors.textMuted, fontSize: 12 },
  collectBtn: { marginTop: 12, backgroundColor: Colors.crimson, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  collectText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
});
