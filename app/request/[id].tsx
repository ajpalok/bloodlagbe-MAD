import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsApi } from '@/api/requests';
import { BloodGroupBadge } from '@/components/BloodGroupBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, t } from '@/store/settingsStore';
import { Colors } from '@/theme/colors';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8000';

// ── Outreach Modal ───────────────────────────────────────────────────────────

function OutreachModal({
  visible,
  requestId,
  onClose,
}: {
  visible: boolean;
  requestId: number;
  onClose: () => void;
}) {
  const [previewData, setPreviewData] = useState<{ donor_count: number; can_send: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentResult, setSentResult] = useState<{ queued: number; already_sent: number } | null>(null);

  React.useEffect(() => {
    if (visible) {
      loadPreview();
    }
  }, [visible]);

  async function loadPreview() {
    setLoading(true);
    try {
      const result = await requestsApi.previewOutreach(requestId);
      setPreviewData(result);
    } catch {
      Alert.alert('ত্রুটি', 'প্রিভিউ লোড করা যায়নি');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const result = await requestsApi.sendOutreach(requestId);
      setSentResult(result);
    } catch {
      Alert.alert('ত্রুটি', 'পাঠানো যায়নি');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.outreachModal}>
          <Text style={styles.outreachTitle}>ডোনার আউটরিচ</Text>

          {loading ? (
            <ActivityIndicator color={Colors.crimson} style={{ marginVertical: 20 }} />
          ) : sentResult ? (
            <View>
              <Text style={styles.outreachResult}>✓ {sentResult.queued} জনকে জানানো হয়েছে</Text>
              {sentResult.already_sent > 0 && (
                <Text style={styles.outreachNote}>
                  {sentResult.already_sent} জনকে আগেই জানানো হয়েছিল
                </Text>
              )}
              <Button title="বন্ধ করুন" onPress={onClose} style={{ marginTop: 16 }} />
            </View>
          ) : previewData ? (
            <View>
              <Text style={styles.outreachInfo}>
                {previewData.donor_count} জন ম্যাচিং ডোনার পাওয়া গেছে
              </Text>
              {previewData.can_send ? (
                <Button
                  title="📤 ডোনারদের জানান"
                  onPress={handleSend}
                  loading={sending}
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Text style={styles.outreachNote}>এখন পাঠানো সম্ভব নয়</Text>
              )}
              <Button
                title="বাতিল"
                onPress={onClose}
                variant="ghost"
                style={{ marginTop: 8 }}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ── Main Detail Screen ───────────────────────────────────────────────────────

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { locale } = useSettingsStore();
  const qc = useQueryClient();
  const [showOutreach, setShowOutreach] = useState(false);

  const { data: req, isLoading, isFetching } = useQuery({
    queryKey: ['request-detail', id],
    queryFn: () => requestsApi.getDetail(id),
    enabled: !!id,
    // Always background-refetch so blood_bags_remaining and is_mine stay
    // accurate, but show pre-populated cache data immediately (staleTime: 0
    // means the cache entry set by the card press is considered stale at once,
    // triggering a background fetch without blocking the render).
    staleTime: 0,
  });

  // Collect via user auth
  const collectAuth = useMutation({
    mutationFn: () => requestsApi.collectBag(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['request-detail', id] });
      qc.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });

  // Collect via device token
  const collectDevice = useMutation({
    mutationFn: () => requestsApi.collectBagByDevice(Number(id)),
    onSuccess: (result) => {
      if (!result.ok) {
        Alert.alert('ত্রুটি', result.error);
      } else {
        qc.invalidateQueries({ queryKey: ['request-detail', id] });
        qc.invalidateQueries({ queryKey: ['device-requests'] });
      }
    },
  });

  // Only show full-screen spinner on a cold load (no cached data at all).
  // When navigating from a card the cache is pre-populated, so isLoading is
  // false immediately and we render the cached data while refetching in bg.
  if (isLoading && !req)
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.crimson} size="large" />
        </View>
      </SafeAreaView>
    );

  if (!req)
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>পোস্টটি পাওয়া যায়নি</Text>
        </View>
      </SafeAreaView>
    );

  const isActive = req.blood_bags_remaining > 0;
  const isMine = req.is_mine || req.is_mine_as_user;
  const canCollect = isActive && isMine;

  function handleCollect() {
    if (req?.is_mine_as_user || req?._auth === 'user') {
      collectAuth.mutate();
    } else {
      collectDevice.mutate();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('bloodPost', locale)}</Text>
        {/* Small spinner shown during background refresh (data already visible) */}
        <View style={{ width: 40, alignItems: 'center' }}>
          {isFetching && !isLoading && (
            <ActivityIndicator color={Colors.textMuted} size="small" />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Blood group + urgency */}
        <View style={styles.topRow}>
          <BloodGroupBadge group={req.blood_group} size="lg" />
          <View style={styles.badges}>
            {req.is_urgent && <Badge label="🚨 জরুরি" variant="crimson" />}
            {!isActive && <Badge label="✓ পূর্ণ" variant="success" />}
          </View>
        </View>

        {/* Bags progress */}
        <Card>
          <Text style={styles.bagsLabel}>রক্তের ব্যাগ</Text>
          <View style={styles.bagsRow}>
            <Text style={styles.bagsRemaining}>{req.blood_bags_remaining}</Text>
            <Text style={styles.bagsSep}>/</Text>
            <Text style={styles.bagsNeeded}>{req.blood_bags_needed}</Text>
            <Text style={styles.bagsUnit}> ব্যাগ বাকি</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((req.blood_bags_needed - req.blood_bags_remaining) / req.blood_bags_needed) * 100}%`,
                },
              ]}
            />
          </View>
        </Card>

        {/* Hospital info */}
        <Card>
          <InfoItem icon="🏥" label="হাসপাতাল" value={req.hospital_name} />
          {req.hospital_address && (
            <InfoItem icon="📍" label="ঠিকানা" value={req.hospital_address} />
          )}
          {(req.district || req.division) && (
            <InfoItem
              icon="🗺️"
              label="জেলা/বিভাগ"
              value={[req.district, req.division].filter(Boolean).join(', ')}
            />
          )}
          {req.blood_need_time && (
            <InfoItem
              icon="⏰"
              label="প্রয়োজনের সময়"
              value={new Date(req.blood_need_time).toLocaleDateString('bn-BD')}
            />
          )}
          {req.patient_problem && (
            <InfoItem icon="🩺" label="রোগীর সমস্যা" value={req.patient_problem} />
          )}
          {req.hemoglobin && (
            <InfoItem icon="🔬" label="হিমোগ্লোবিন" value={req.hemoglobin} />
          )}
          {req.gender && (
            <InfoItem icon="👤" label="রোগীর লিঙ্গ" value={req.gender} />
          )}
          {req.description && (
            <InfoItem icon="📝" label="বিবরণ" value={req.description} />
          )}
        </Card>

        {/* Collect button */}
        {canCollect && (
          <Button
            title="১ ব্যাগ পেয়েছি"
            onPress={handleCollect}
            loading={collectAuth.isPending || collectDevice.isPending}
            style={styles.collectBtn}
          />
        )}

        {/* Outreach (for authenticated owner) */}
        {isMine && isActive && isAuthenticated && (
          <Button
            title="📤 ডোনারদের জানান"
            onPress={() => setShowOutreach(true)}
            variant="outline"
            style={{ marginTop: 8 }}
          />
        )}

        {/* Contact via server-side redirect */}
        <Card>
          <Text style={styles.contactTitle}>যোগাযোগ করুন</Text>
          {req.contact_methods?.can_contact ? (
            <>
              <Text style={styles.contactDesc}>
                {req.contact_methods.phone_count > 0
                  ? `${req.contact_methods.phone_count}টি ফোন নম্বর আছে`
                  : ''}
                {req.contact_methods.has_whatsapp ? ' • WhatsApp' : ''}
                {req.contact_methods.has_telegram ? ' • Telegram' : ''}
                {req.contact_methods.has_facebook ? ' • Facebook' : ''}
              </Text>
              <Button
                title="📞 যোগাযোগ করুন"
                variant="outline"
                onPress={() => {
                  Linking.openURL(`${BASE_URL}/api/v1/contacts?request_id=${req.id}`);
                }}
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <Text style={styles.contactDesc}>
              গোপনীয়তার কারণে সরাসরি যোগাযোগের তথ্য দেখানো হচ্ছে না।
            </Text>
          )}
        </Card>

        {/* Timestamps */}
        <View style={styles.timestamps}>
          <Text style={styles.timestamp}>
            পোস্ট: {new Date(req.created_at).toLocaleDateString('bn-BD')}
          </Text>
          {req.updated_at !== req.created_at && (
            <Text style={styles.timestamp}>
              আপডেট: {new Date(req.updated_at).toLocaleDateString('bn-BD')}
            </Text>
          )}
        </View>
      </ScrollView>

      <OutreachModal
        visible={showOutreach}
        requestId={Number(id)}
        onClose={() => setShowOutreach(false)}
      />
    </SafeAreaView>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Colors.gold, fontSize: 22 },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badges: { flexDirection: 'row', gap: 8 },

  // Bags
  bagsLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  bagsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  bagsRemaining: { color: Colors.crimson, fontSize: 36, fontWeight: '700' },
  bagsSep: { color: Colors.textMuted, fontSize: 24, marginHorizontal: 4 },
  bagsNeeded: { color: Colors.textSecondary, fontSize: 24 },
  bagsUnit: { color: Colors.textMuted, fontSize: 14 },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: Colors.crimson, borderRadius: 3 },

  // Info
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: { fontSize: 16 },
  infoContent: { flex: 1 },
  infoLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 2 },
  infoValue: { color: Colors.textPrimary, fontSize: 15 },

  collectBtn: { marginVertical: 4 },

  // Contact
  contactTitle: { color: Colors.gold, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  contactDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },

  // Timestamps
  timestamps: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  timestamp: { color: Colors.textMuted, fontSize: 11 },

  // Outreach modal
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  outreachModal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  outreachTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  outreachInfo: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  outreachResult: { color: Colors.success, fontSize: 16, fontWeight: '600' },
  outreachNote: { color: Colors.textMuted, fontSize: 13, marginTop: 8 },
});
