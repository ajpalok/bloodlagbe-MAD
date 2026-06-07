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
    // staleTime comes from the global QueryClient default (2 min)
  });

  /** Pre-populate the detail cache with feed data so the detail screen renders
   *  instantly without a loading spinner, then background-refetches for accuracy. */
  function handleCardPress(request: BloodRequestItem) {
    qc.setQueryData(['request-detail', String(request.id)], request);
    router.push({ pathname: '/request/[id]', params: { id: request.id } });
  }

  const requests = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>🩸 ব্লাড লাগবে</Text>
        {requests.length > 0 && (
          <Text style={styles.count}>{requests.length}টি সক্রিয়</Text>
        )}
      </View>

      {/* Blood group filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
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

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.crimson} size="large" />
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
  safe:    { flex: 1, backgroundColor: Colors.darkBg },
  topBar:  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  logo:    { color: Colors.crimson, fontSize: 20, fontWeight: '700' },
  count:   { color: Colors.textMuted, fontSize: 12 },

  filters:        { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  filterActive:     { backgroundColor: Colors.crimson, borderColor: Colors.crimson },
  filterText:       { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: Colors.white },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  empty:      { color: Colors.textMuted, fontSize: 15, textAlign: 'center' },

  retryBtn:  { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  retryText: { color: Colors.gold, fontSize: 14 },

  list: { padding: 16, paddingBottom: 32 },
});
