import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsApi, bloodGroupOptions } from '@/api/requests';
import { BloodGroupBadge } from '@/components/BloodGroupBadge';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, t } from '@/store/settingsStore';
import { Colors } from '@/theme/colors';
import type { BloodRequestItem } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD in Asia/Dhaka timezone */
function todayDhaka(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

type Gender = 'male' | 'female' | 'other';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male',   label: 'পুরুষ' },
  { value: 'female', label: 'মহিলা' },
  { value: 'other',  label: 'অন্যান্য' },
];

// ── Create Request Modal ─────────────────────────────────────────────────────

function CreateRequestModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  // ─ Patient
  const [bloodGroup, setBloodGroup] = useState('');
  const [bags, setBags] = useState('1');
  const [gender, setGender] = useState<Gender | ''>('');
  const [patientProblem, setPatientProblem] = useState('');

  // ─ Contact
  const [phone, setPhone] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [fbId, setFbId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');

  // ─ Hospital & location
  const [hospitalName, setHospitalName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [needTime, setNeedTime] = useState(todayDhaka());

  // ─ Extra
  const [hemoglobin, setHemoglobin] = useState('');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setBloodGroup(''); setBags('1'); setGender(''); setPatientProblem('');
    setPhone(''); setPhoneSecondary(''); setFbId(''); setWhatsapp(''); setTelegram('');
    setHospitalName(''); setLatitude(null); setLongitude(null); setLocationLabel('');
    setIsUrgent(false); setNeedTime(todayDhaka());
    setHemoglobin(''); setDescription('');
    setErrors({});
  }

  async function pickLocation() {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('অনুমতি নেই', 'অবস্থান ব্যবহার করতে অ্যাপকে অনুমতি দিন।');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      // Reverse geocode to give a human-readable label
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.name, place.street, place.subregion, place.region].filter(Boolean);
        setLocationLabel(parts.join(', '));
      } else {
        setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
      setErrors(prev => { const n = { ...prev }; delete n.location; return n; });
    } catch {
      Alert.alert('ত্রুটি', 'অবস্থান পাওয়া যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setGettingLocation(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!bloodGroup)                     e.blood_group      = 'রক্তের গ্রুপ প্রয়োজন';
    if (!bags || parseInt(bags) < 1)     e.bags             = 'কমপক্ষে ১ ব্যাগ';
    if (parseInt(bags) > 10)             e.bags             = 'সর্বোচ্চ ১০ ব্যাগ';
    if (!gender)                         e.gender           = 'লিঙ্গ প্রয়োজন';
    if (!patientProblem.trim())          e.patient_problem  = 'রোগীর সমস্যা প্রয়োজন';
    if (!phone.trim())                   e.phone            = 'প্রাথমিক ফোন নম্বর প্রয়োজন';
    if (!hospitalName.trim())            e.hospital_name    = 'হাসপাতালের নাম প্রয়োজন';
    if (latitude === null || longitude === null) e.location = 'অবস্থান নির্বাচন করুন';
    if (!isUrgent && !needTime.trim())   e.blood_need_time  = 'তারিখ প্রয়োজন';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) {
      Alert.alert('ত্রুটি', 'সব প্রয়োজনীয় তথ্য পূরণ করুন।');
      return;
    }
    setLoading(true);
    try {
      await requestsApi.create({
        blood_group:      bloodGroup,
        blood_bags_needed: parseInt(bags, 10) || 1,
        gender:           gender as Gender,
        patient_problem:  patientProblem.trim(),
        phone:            phone.trim(),
        phone_secondary:  phoneSecondary.trim() || undefined,
        fb_id:            fbId.trim() || undefined,
        whatsapp:         whatsapp.trim() || undefined,
        telegram:         telegram.trim() || undefined,
        hospital_name:    hospitalName.trim(),
        latitude:         latitude!,
        longitude:        longitude!,
        is_urgent:        isUrgent,
        blood_need_time:  isUrgent ? undefined : needTime.trim() || undefined,
        hemoglobin:       hemoglobin.trim() || undefined,
        description:      description.trim() || undefined,
      });
      resetForm();
      onDone();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(axiosErr.response.data.errors)) {
          mapped[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setErrors(mapped);
        Alert.alert('ত্রুটি', 'ফর্মে কিছু সমস্যা আছে।');
      } else {
        const msg = axiosErr.response?.data?.message ?? 'পোস্ট তৈরি করা যায়নি';
        Alert.alert('ত্রুটি', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!bloodGroup && !!gender && !!phone.trim() && !!hospitalName.trim() && latitude !== null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>নতুন রক্তের পোস্ট</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

          {/* ── Section 1: রোগীর তথ্য ── */}
          <SectionHeader title="রোগীর তথ্য" />

          {/* Blood group */}
          <FieldLabel label="রক্তের গ্রুপ" required error={errors.blood_group} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {bloodGroupOptions.map((bg) => (
              <Pressable
                key={bg}
                style={[styles.chip, bloodGroup === bg && styles.chipSelected]}
                onPress={() => { setBloodGroup(bg); setErrors(p => del(p, 'blood_group')); }}
              >
                <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextSelected]}>{bg}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Bags needed */}
          <FieldLabel label="ব্যাগের সংখ্যা" required error={errors.bags} />
          <TextInput
            style={[styles.input, errors.bags ? styles.inputError : null]}
            value={bags}
            onChangeText={v => { setBags(v); setErrors(p => del(p, 'bags')); }}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Gender */}
          <FieldLabel label="রোগীর লিঙ্গ" required error={errors.gender} />
          <View style={styles.radioRow}>
            {GENDER_OPTIONS.map(o => (
              <Pressable
                key={o.value}
                style={[styles.radioBtn, gender === o.value && styles.radioBtnSelected]}
                onPress={() => { setGender(o.value); setErrors(p => del(p, 'gender')); }}
              >
                <Text style={[styles.radioBtnText, gender === o.value && styles.radioBtnTextSelected]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Patient problem */}
          <FieldLabel label="রোগীর সমস্যা" required error={errors.patient_problem} />
          <TextInput
            style={[styles.input, styles.textarea, errors.patient_problem ? styles.inputError : null]}
            value={patientProblem}
            onChangeText={v => { setPatientProblem(v); setErrors(p => del(p, 'patient_problem')); }}
            placeholder="যেমন: অপারেশন, দুর্ঘটনা, ক্যান্সার..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* ── Section 2: যোগাযোগ ── */}
          <SectionHeader title="যোগাযোগ" subtitle="রক্তদাতারা এই তথ্য দেখতে পাবেন" />

          <FieldLabel label="প্রাথমিক ফোন নম্বর" required error={errors.phone} />
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            value={phone}
            onChangeText={v => { setPhone(v); setErrors(p => del(p, 'phone')); }}
            keyboardType="phone-pad"
            placeholder="+880 1XXXXXXXXX"
            placeholderTextColor={Colors.textMuted}
          />

          <FieldLabel label="দ্বিতীয় ফোন নম্বর (ঐচ্ছিক)" />
          <TextInput
            style={styles.input}
            value={phoneSecondary}
            onChangeText={setPhoneSecondary}
            keyboardType="phone-pad"
            placeholder="+880 1XXXXXXXXX"
            placeholderTextColor={Colors.textMuted}
          />

          <FieldLabel label="ফেসবুক প্রোফাইল লিংক (ঐচ্ছিক)" />
          <TextInput
            style={styles.input}
            value={fbId}
            onChangeText={setFbId}
            keyboardType="url"
            placeholder="https://facebook.com/yourprofile"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />

          <FieldLabel label="হোয়াটসঅ্যাপ (ঐচ্ছিক)" />
          <TextInput
            style={styles.input}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            placeholder="+880 1XXXXXXXXX"
            placeholderTextColor={Colors.textMuted}
          />

          <FieldLabel label="টেলিগ্রাম (ঐচ্ছিক)" />
          <TextInput
            style={styles.input}
            value={telegram}
            onChangeText={setTelegram}
            placeholder="+880... অথবা @username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />

          {/* ── Section 3: হাসপাতাল ও অবস্থান ── */}
          <SectionHeader title="হাসপাতাল ও অবস্থান" />

          {/* Urgent toggle */}
          <View style={styles.urgentBox}>
            <View style={styles.urgentText}>
              <Text style={styles.urgentTitle}>জরুরি হিসেবে চিহ্নিত করুন</Text>
              <Text style={styles.urgentHint}>জরুরি হলে তারিখ লাগবে না</Text>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={v => { setIsUrgent(v); if (v) setErrors(p => del(p, 'blood_need_time')); }}
              trackColor={{ false: Colors.surfaceBorder, true: Colors.crimson }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Blood need time (hidden when urgent) */}
          {!isUrgent && (
            <>
              <FieldLabel label="রক্তের প্রয়োজনের তারিখ" required error={errors.blood_need_time} hint="YYYY-MM-DD ফরম্যাটে লিখুন" />
              <TextInput
                style={[styles.input, errors.blood_need_time ? styles.inputError : null]}
                value={needTime}
                onChangeText={v => { setNeedTime(v); setErrors(p => del(p, 'blood_need_time')); }}
                placeholder={todayDhaka()}
                placeholderTextColor={Colors.textMuted}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              />
            </>
          )}

          {/* Hospital name */}
          <FieldLabel label="হাসপাতালের নাম" required error={errors.hospital_name} />
          <TextInput
            style={[styles.input, errors.hospital_name ? styles.inputError : null]}
            value={hospitalName}
            onChangeText={v => { setHospitalName(v); setErrors(p => del(p, 'hospital_name')); }}
            placeholder="যেমন: সোহরাওয়ার্দী হাসপাতাল"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Location picker — interactive map */}
          <FieldLabel label="হাসপাতালের অবস্থান" required error={errors.location} />
          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            locationLabel={locationLabel}
            onLocationChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
              setErrors(p => del(p, 'location'));
            }}
            onGpsPress={pickLocation}
            gpsLoading={gettingLocation}
            height={250}
          />

          {/* ── Section 4: অতিরিক্ত তথ্য ── */}
          <SectionHeader title="অতিরিক্ত তথ্য" />

          <FieldLabel label="হিমোগ্লোবিন (ঐচ্ছিক)" hint="যেমন: 8.5" />
          <TextInput
            style={styles.input}
            value={hemoglobin}
            onChangeText={setHemoglobin}
            keyboardType="decimal-pad"
            placeholder="8.5"
            placeholderTextColor={Colors.textMuted}
          />

          <FieldLabel label="বিবরণ (ঐচ্ছিক)" hint="অতিরিক্ত কোনো তথ্য" />
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="রোগীর অতিরিক্ত তথ্য..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Submit */}
          <Button
            title="পোস্ট করুন"
            onPress={submit}
            loading={loading}
            disabled={!canSubmit || loading}
            style={styles.submitBtn}
          />

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function del(obj: Record<string, string>, key: string): Record<string, string> {
  const n = { ...obj }; delete n[key]; return n;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function FieldLabel({ label, required, error, hint }: { label: string; required?: boolean; error?: string; hint?: string }) {
  return (
    <>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: Colors.crimson }}> *</Text>}
      </Text>
      {hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </>
  );
}

// ── Request Card ──────────────────────────────────────────────────────────────

function MyRequestCard({
  item,
  onCollect,
  collecting,
  onPress,
}: {
  item: BloodRequestItem;
  onCollect: (id: number) => void;
  collecting: boolean;
  onPress: (item: BloodRequestItem) => void;
}) {
  const isActive = item.blood_bags_remaining > 0;

  return (
    <Pressable onPress={() => onPress(item)} style={styles.cardPressable}>
    <Card style={styles.reqCard}>
      <View style={styles.cardHeader}>
        <BloodGroupBadge group={item.blood_group} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {item.is_urgent && <Badge label="🚨 জরুরি" variant="crimson" />}
          <Badge
            label={isActive ? `${item.blood_bags_remaining}/${item.blood_bags_needed} বাকি` : '✓ পূর্ণ'}
            variant={isActive ? 'warning' : 'success'}
          />
        </View>
      </View>
      <Text style={styles.hospital}>{item.hospital_name}</Text>
      {(item.district || item.division) && (
        <Text style={styles.location}>
          {[item.district, item.division].filter(Boolean).join(', ')}
        </Text>
      )}
      {item.patient_problem && (
        <Text style={styles.problemText}>🩺 {item.patient_problem}</Text>
      )}
      {item._auth && (
        <Badge
          label={item._auth === 'user' ? '👤 অ্যাকাউন্ট' : '📱 ডিভাইস'}
          variant={item._auth === 'user' ? 'gold' : 'muted'}
        />
      )}
      {isActive && (
        <Pressable
          style={[styles.collectBtn, collecting && styles.collectDisabled]}
          onPress={(e) => { e.stopPropagation?.(); !collecting && onCollect(item.id); }}
        >
          {collecting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.collectText}>১ ব্যাগ পেয়েছি</Text>
          )}
        </Pressable>
      )}
    </Card>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MyRequestsScreen() {
  const { isAuthenticated } = useAuthStore();
  const { locale } = useSettingsStore();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [showNew, setShowNew] = useState(false);
  const [collectingId, setCollectingId] = useState<number | null>(null);
  const qc = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['my-requests', tab],
    queryFn: () => requestsApi.getMyRequests(1, tab),
    enabled: isAuthenticated,
    staleTime: 60_000, // user's own posts: 1 min
  });

  const deviceQuery = useQuery({
    queryKey: ['device-requests'],
    queryFn: () => requestsApi.getDeviceRequests(),
    staleTime: 2 * 60_000, // device posts: 2 min (matches global default)
  });

  const allRequests = React.useMemo(() => {
    const userRequests = userQuery.data?.requests ?? [];
    const deviceRequests = deviceQuery.data ?? [];
    const merged = new Map<number, BloodRequestItem>();
    for (const r of deviceRequests) merged.set(r.id, { ...r, _auth: 'device' as const });
    for (const r of userRequests)   merged.set(r.id, { ...r, _auth: 'user'   as const });
    let result = Array.from(merged.values());
    if (tab === 'active')    result = result.filter(r => r.blood_bags_remaining > 0);
    if (tab === 'completed') result = result.filter(r => r.blood_bags_remaining === 0);
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [userQuery.data, deviceQuery.data, tab]);

  async function handleCollect(id: number) {
    const item = allRequests.find(r => r.id === id);
    if (!item) return;
    setCollectingId(id);
    try {
      if (item._auth === 'user' || item.is_mine_as_user) {
        await requestsApi.collectBag(id);
      } else {
        const result = await requestsApi.collectBagByDevice(id);
        if (!result.ok) { Alert.alert('ত্রুটি', result.error); return; }
      }
      qc.invalidateQueries({ queryKey: ['my-requests'] });
      qc.invalidateQueries({ queryKey: ['device-requests'] });
    } catch {
      Alert.alert('ত্রুটি', 'ব্যাগ কালেক্ট করা যায়নি');
    } finally {
      setCollectingId(null);
    }
  }

  const isLoading = (isAuthenticated ? userQuery.isLoading : false) || deviceQuery.isLoading;
  const isRefetching = userQuery.isRefetching || deviceQuery.isRefetching;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{t('myRequests', locale)}</Text>
        <Button title={t('newPost', locale)} onPress={() => setShowNew(true)} size="sm" />
      </View>

      <View style={styles.tabs}>
        {(['active', 'completed'] as const).map(tabKey => (
          <Pressable key={tabKey} style={[styles.tab, tab === tabKey && styles.tabActive]} onPress={() => setTab(tabKey)}>
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'active' ? t('active', locale) : t('completed', locale)}
            </Text>
          </Pressable>
        ))}
      </View>

      {!isAuthenticated && (
        <View style={styles.loginHint}>
          <Text style={styles.loginHintText}>💡 লগইন করলে আপনার সব পোস্ট একসাথে দেখতে পারবেন</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.crimson} />
        </View>
      ) : (
        <FlatList
          data={allRequests}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <MyRequestCard
              item={item}
              onCollect={handleCollect}
              collecting={collectingId === item.id}
              onPress={(req) => {
                // Pre-populate detail cache so the screen renders instantly
                qc.setQueryData(['request-detail', String(req.id)], req);
                router.push({ pathname: '/request/[id]', params: { id: req.id } });
              }}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => { userQuery.refetch(); deviceQuery.refetch(); }} tintColor={Colors.crimson} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.empty}>কোনো পোস্ট নেই</Text>
              <Text style={styles.emptyHint}>উপরের "নতুন" বাটনে ট্যাপ করে পোস্ট তৈরি করুন</Text>
            </View>
          }
        />
      )}

      <CreateRequestModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onDone={() => {
          setShowNew(false);
          qc.invalidateQueries({ queryKey: ['my-requests'] });
          qc.invalidateQueries({ queryKey: ['device-requests'] });
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  safe:     { flex: 1, backgroundColor: Colors.darkBg },
  flex:     { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  // Top bar
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  pageTitle:{ color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },

  // Tabs
  tabs:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab:          { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: Colors.crimson },
  tabText:      { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive:{ color: Colors.crimson },

  // Login hint
  loginHint:    { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  loginHintText:{ color: Colors.gold, fontSize: 12, textAlign: 'center' },

  // List
  list:         { padding: 16, paddingBottom: 32 },
  emptyEmoji:   { fontSize: 40, marginBottom: 12 },
  empty:        { color: Colors.textMuted, fontSize: 15, marginBottom: 4 },
  emptyHint:    { color: Colors.textMuted, fontSize: 12 },

  // Card
  cardPressable: { marginBottom: 12 },
  reqCard:      { marginBottom: 0 }, // outer Pressable already carries the margin
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  hospital:     { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  location:     { color: Colors.textSecondary, fontSize: 13, marginBottom: 6 },
  problemText:  { color: Colors.textSecondary, fontSize: 12, marginBottom: 8 },
  collectBtn:   { marginTop: 12, backgroundColor: Colors.crimson, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  collectDisabled: { opacity: 0.6 },
  collectText:  { color: Colors.white, fontWeight: '600', fontSize: 14 },

  // Modal
  modal:        { flex: 1, backgroundColor: Colors.darkBg },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  modalTitle:   { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  close:        { color: Colors.textSecondary, fontSize: 20, padding: 4 },
  modalBody:    { padding: 20, paddingBottom: 60 },

  // Section headers
  sectionHeader:  { marginTop: 24, marginBottom: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  sectionTitle:   { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  sectionSubtitle:{ color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Field labels
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 16, marginBottom: 4 },
  fieldHint:  { color: Colors.textMuted, fontSize: 11, marginBottom: 4 },
  fieldError: { color: Colors.crimson, fontSize: 11, marginBottom: 4 },

  // Input
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  inputError: { borderColor: Colors.crimson },
  textarea:   { minHeight: 80, paddingTop: 12 },

  // Blood group chips
  chipRow:       { gap: 8, paddingVertical: 4 },
  chip:          { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  chipSelected:  { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  chipText:      { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  chipTextSelected: { color: Colors.crimson },

  // Gender radio
  radioRow:           { flexDirection: 'row', gap: 8 },
  radioBtn:           { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface, alignItems: 'center' },
  radioBtnSelected:   { borderColor: Colors.gold, backgroundColor: 'rgba(226,199,133,0.12)' },
  radioBtnText:       { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  radioBtnTextSelected: { color: Colors.gold },

  // Urgent toggle
  urgentBox:  { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: `${Colors.crimson}33`, backgroundColor: `${Colors.crimson}0D` },
  urgentText: { flex: 1 },
  urgentTitle:{ color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  urgentHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Submit
  submitBtn: { marginTop: 28 },
});
