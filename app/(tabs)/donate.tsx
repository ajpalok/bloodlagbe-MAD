import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { donorApi } from '@/api/donor';
import { BloodGroupBadge } from '@/components/BloodGroupBadge';
import { LoginGate } from '@/components/LoginGate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';
import type { DonorRequestItem, DonorMatchingItem } from '@/types';

// ── Donor Request Card (inbox) ───────────────────────────────────────────────

function DonorRequestCard({ item }: { item: DonorRequestItem }) {
  const [loading, setLoading] = useState<'accept' | 'reject' | 'fulfill' | null>(null);
  const qc = useQueryClient();

  async function handle(action: 'accept' | 'reject' | 'fulfill') {
    setLoading(action);
    try {
      if (action === 'accept') await donorApi.acceptRequest(item.request_id);
      else if (action === 'reject') await donorApi.rejectRequest(item.request_id);
      else await donorApi.fulfillRequest(item.request_id);
      qc.invalidateQueries({ queryKey: ['donor-requests'] });
    } catch {
      Alert.alert('ত্রুটি', 'কিছু একটা সমস্যা হয়েছে');
    } finally {
      setLoading(null);
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'অপেক্ষারত',
    accepted: 'গৃহীত',
    rejected: 'প্রত্যাখ্যাত',
    fulfilled: 'পূরণ',
  };
  const statusVariants: Record<string, 'crimson' | 'success' | 'warning' | 'muted'> = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'muted',
    fulfilled: 'success',
  };

  return (
    <Card style={styles.reqCard}>
      <View style={styles.cardHeader}>
        <BloodGroupBadge group={item.blood_group} />
        <Badge
          label={statusLabels[item.status] ?? item.status}
          variant={statusVariants[item.status] ?? 'muted'}
        />
      </View>
      <Text style={styles.hospital}>{item.hospital_name}</Text>
      <Text style={styles.location}>{item.district}</Text>
      {item.blood_need_time && (
        <Text style={styles.needTime}>
          ⏰ {new Date(item.blood_need_time).toLocaleDateString('bn-BD')}
        </Text>
      )}
      {item.patient_problem && (
        <Text style={styles.problemText}>🩺 {item.patient_problem}</Text>
      )}
      <Text style={styles.bagsInfo}>
        {item.blood_bags_remaining} ব্যাগ বাকি
      </Text>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="গ্রহণ"
            onPress={() => handle('accept')}
            loading={loading === 'accept'}
            size="sm"
            style={styles.flex1}
          />
          <Button
            title="না"
            onPress={() => handle('reject')}
            loading={loading === 'reject'}
            variant="outline"
            size="sm"
            style={styles.flex1}
          />
        </View>
      )}
      {item.status === 'accepted' && (
        <Button
          title="✓ রক্তদান সম্পন্ন"
          onPress={() => handle('fulfill')}
          loading={loading === 'fulfill'}
          size="sm"
          style={{ marginTop: 10 }}
        />
      )}
    </Card>
  );
}

// ── Matching Request Card ────────────────────────────────────────────────────

function MatchingRequestCard({ item }: { item: DonorMatchingItem }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
    >
      <Card style={styles.reqCard}>
        <View style={styles.cardHeader}>
          <BloodGroupBadge group={item.blood_group} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {item.is_urgent && <Badge label="🚨 জরুরি" variant="crimson" />}
            <Badge
              label={`${item.blood_bags_remaining}/${item.blood_bags_needed}`}
              variant="warning"
            />
          </View>
        </View>
        <Text style={styles.hospital}>{item.hospital_name}</Text>
        {(item.district || item.division) && (
          <Text style={styles.location}>
            {[item.district, item.division].filter(Boolean).join(', ')}
          </Text>
        )}
        {item.requester_name && (
          <Text style={styles.requester}>পোস্টকারী: {item.requester_name}</Text>
        )}
      </Card>
    </Pressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function DonateScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'inbox' | 'matching'>('inbox');

  // Donor inbox: direct requests
  const inboxQuery = useQuery({
    queryKey: ['donor-requests'],
    queryFn: () => donorApi.getRequests('all', 1),
    enabled: !!user?.is_donor,
  });

  // Matching requests (based on blood group)
  const matchQuery = useQuery({
    queryKey: ['donor-matching'],
    queryFn: () => donorApi.getMatchingRequests(1),
    enabled: !!user?.is_donor,
  });

  const isLoading = activeTab === 'inbox' ? inboxQuery.isLoading : matchQuery.isLoading;
  const isRefetching = activeTab === 'inbox' ? inboxQuery.isRefetching : matchQuery.isRefetching;

  function handleRefresh() {
    if (activeTab === 'inbox') inboxQuery.refetch();
    else matchQuery.refetch();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>রক্তদান</Text>
      </View>

      <LoginGate message="রক্তদানের অনুরোধ দেখতে ও সাড়া দিতে লগইন করুন।">
        {!user?.is_donor ? (
          <ScrollView contentContainerStyle={styles.centerContent}>
            <Text style={styles.bigEmoji}>💉</Text>
            <Text style={styles.emptyTitle}>আপনি ডোনার নন</Text>
            <Text style={styles.emptyDesc}>
              ডোনার হিসেবে নিবন্ধন করুন এবং রক্তের প্রয়োজনে মানুষকে সাহায্য করুন।
            </Text>
            <Button
              title="ডোনার হিসেবে নিবন্ধন করুন"
              onPress={() => router.push('/(tabs)/profile')}
              style={{ marginTop: 16, width: '100%' }}
            />
          </ScrollView>
        ) : (
          <>
            {/* Tabs */}
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
                onPress={() => setActiveTab('inbox')}
              >
                <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
                  ইনবক্স
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'matching' && styles.tabActive]}
                onPress={() => setActiveTab('matching')}
              >
                <Text style={[styles.tabText, activeTab === 'matching' && styles.tabTextActive]}>
                  ম্যাচিং পোস্ট
                </Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.crimson} />
              </View>
            ) : activeTab === 'inbox' ? (
              <FlatList
                data={inboxQuery.data?.requests ?? []}
                keyExtractor={(item) => String(item.request_id)}
                renderItem={({ item }) => <DonorRequestCard item={item} />}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.crimson} />
                }
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.empty}>কোনো নতুন অনুরোধ নেই</Text>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={matchQuery.data?.requests ?? []}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <MatchingRequestCard item={item} />}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={Colors.crimson} />
                }
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={styles.empty}>আপনার গ্রুপের কোনো পোস্ট নেই</Text>
                  </View>
                }
              />
            )}
          </>
        )}
      </LoginGate>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  pageTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.crimson },
  tabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: Colors.crimson },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  empty: { color: Colors.textMuted, fontSize: 15 },
  list: { padding: 16, paddingBottom: 32 },
  reqCard: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  hospital: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  location: { color: Colors.textSecondary, fontSize: 13, marginBottom: 4 },
  needTime: { color: Colors.gold, fontSize: 12, marginBottom: 4 },
  problemText: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  bagsInfo: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  requester: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  flex1: { flex: 1 },
});
