import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsApi, bloodGroupOptions } from '@/api/requests';
import { BloodRequestCard } from '@/components/BloodRequestCard';
import { Colors } from '@/theme/colors';
import type { BloodRequestItem } from '@/types';

export default function HomeScreen() {
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const qc = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['feed', selectedGroup],
    queryFn: () => requestsApi.getFeed(selectedGroup),
    staleTime: 2 * 60_000,
  });

  function handleCardPress(request: BloodRequestItem) {
    qc.setQueryData(['request-detail', String(request.id)], request);
    router.push({ pathname: '/request/[id]', params: { id: request.id } });
  }

  const requests = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View>
            <Text style={styles.logoName}>Blood Lagbe</Text>
            <Text style={styles.logoTagline}>ব্লাড লাগবে</Text>
          </View>
        </View>
        {requests.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{requests.length} সক্রিয়</Text>
          </View>
        )}
      </View>

      {/* Blood group filter chips */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          <Pressable
            style={[styles.filterChip, !selectedGroup && styles.filterActive]}
            onPress={() => setSelectedGroup(undefined)}
          >
            <Text style={[styles.filterText, !selectedGroup && styles.filterTextActive]}>সব</Text>
          </Pressable>
          {bloodGroupOptions.map((bg) => (
            <Pressable
              key={bg}
              style={[styles.filterChip, selectedGroup === bg && styles.filterActive]}
              onPress={() => setSelectedGroup(prev => prev === bg ? undefined : bg)}
            >
              <Text style={[styles.filterText, selectedGroup === bg && styles.filterTextActive]}>
                {bg}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.crimson} size="large" />
          <Text style={styles.loadingText}>লোড হচ্ছে...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.empty}>ডেটা লোড করা যায়নি</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>আবার চেষ্টা করুন</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BloodRequestCard request={item} onPress={handleCardPress} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.crimson}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>🩸</Text>
              <Text style={styles.empty}>
                {selectedGroup
                  ? `${selectedGroup} রক্তের কোনো সক্রিয় পোস্ট নেই`
                  : 'কোনো সক্রিয় পোস্ট নেই'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  logoName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  logoTagline: {
    color: Colors.crimson,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 15,
  },
  countBadge: {
    backgroundColor: Colors.crimsonSubtle,
    borderWidth: 1,
    borderColor: 'rgba(255,71,73,0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: Colors.crimson,
    fontSize: 12,
    fontWeight: '600',
  },

  filtersWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  filterActive: {
    backgroundColor: Colors.crimson,
    borderColor: Colors.crimson,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: { color: Colors.white },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 14 },
  empty: { color: Colors.textMuted, fontSize: 15, textAlign: 'center' },
  loadingText: { color: Colors.textMuted, fontSize: 13, marginTop: 12 },

  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  retryText: { color: Colors.gold, fontSize: 14, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 32 },
});
