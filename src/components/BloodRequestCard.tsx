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
  onPress?: (request: BloodRequestItem) => void;
}

function BagDots({ remaining, needed }: { remaining: number; needed: number }) {
  const total = Math.min(needed, 10);
  const filled = Math.min(remaining, total);
  return (
    <View style={dots.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dots.dot, i < filled ? dots.filled : dots.empty]}
        />
      ))}
      <Text style={dots.label}>
        {remaining}/{needed} ব্যাগ বাকি
      </Text>
    </View>
  );
}

const dots = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  filled: { backgroundColor: Colors.crimson },
  empty: { backgroundColor: Colors.surfaceBorder },
  label: { color: Colors.textMuted, fontSize: 11, marginLeft: 6, fontWeight: '500' },
});

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
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card style={styles.card}>
        {/* Main row: blood group badge + content */}
        <View style={styles.mainRow}>
          <BloodGroupBadge group={request.blood_group} size="lg" />

          <View style={styles.content}>
            {/* Status row */}
            <View style={styles.statusRow}>
              {request.is_urgent && <Badge label="🚨 জরুরি" variant="crimson" />}
              {!isActive && <Badge label="✓ পূর্ণ" variant="success" />}
            </View>

            <Text style={styles.hospital} numberOfLines={2}>
              {request.hospital_name}
            </Text>

            {(request.district || request.division) && (
              <Text style={styles.location} numberOfLines={1}>
                📍 {[request.district, request.division].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Footer row: dots progress + date */}
        <View style={styles.footer}>
          <BagDots
            remaining={request.blood_bags_remaining}
            needed={request.blood_bags_needed}
          />
          {request.blood_need_time && (
            <Text style={styles.needTime}>
              {new Date(request.blood_need_time).toLocaleDateString('bn-BD')}
            </Text>
          )}
        </View>

        {showCollect && isActive && onCollect && (
          <Pressable
            style={styles.collectBtn}
            onPress={(e) => { e.stopPropagation?.(); onCollect(request.id); }}
          >
            <Text style={styles.collectText}>১ ব্যাগ পেয়েছি</Text>
          </Pressable>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: 12 },
  pressed: { opacity: 0.88 },
  card: { padding: 14 },

  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  content: { flex: 1, gap: 4 },

  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },

  hospital: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  location: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  needTime: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  collectBtn: {
    marginTop: 12,
    backgroundColor: Colors.crimson,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  collectText: { color: Colors.white, fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
});
