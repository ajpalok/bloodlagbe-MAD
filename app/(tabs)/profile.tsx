import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { donorApi } from '@/api/donor';
import { BloodGroupBadge } from '@/components/BloodGroupBadge';
import { LoginGate } from '@/components/LoginGate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Colors } from '@/theme/colors';
import type { DonorProfile, DonorQuestion, Session } from '@/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ── Profile Edit Modal ───────────────────────────────────────────────────────

function ProfileEditModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, refreshUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [gender, setGender] = useState(user?.gender ?? '');
  const [dob, setDob] = useState(user?.date_of_birth ?? '');
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        date_of_birth: dob,
      });
      await refreshUser();
      Alert.alert('সফল', 'প্রোফাইল আপডেট হয়েছে');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'আপডেট করা যায়নি';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>প্রোফাইল সম্পাদনা</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Input label="প্রথম নাম" value={firstName} onChangeText={setFirstName} />
          <Input label="শেষ নাম" value={lastName} onChangeText={setLastName} />
          <Text style={styles.fieldLabel}>লিঙ্গ</Text>
          <View style={styles.genderRow}>
            {[
              { value: 'male', label: 'পুরুষ' },
              { value: 'female', label: 'মহিলা' },
              { value: 'other', label: 'অন্যান্য' },
            ].map((g) => (
              <Pressable
                key={g.value}
                style={[styles.genderBtn, gender === g.value && styles.genderSelected]}
                onPress={() => setGender(g.value)}
              >
                <Text style={[styles.genderText, gender === g.value && styles.genderTextSelected]}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input label="জন্ম তারিখ (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
          <Button title="সংরক্ষণ করুন" onPress={save} loading={loading} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Donor Registration Modal ─────────────────────────────────────────────────

function DonorRegModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuthStore();
  const [bloodGroup, setBloodGroup] = useState('');
  const [questions, setQuestions] = useState<DonorQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  React.useEffect(() => {
    if (visible && !questionsLoaded) {
      loadQuestions();
    }
  }, [visible]);

  async function loadQuestions() {
    try {
      const age = user?.date_of_birth ? calculateAge(user.date_of_birth) : undefined;
      const result = await donorApi.getQuestions(user?.gender ?? undefined, age);
      setQuestions(result.questions ?? []);
      setQuestionsLoaded(true);
    } catch {
      // Silently handle
    }
  }

  function calculateAge(dobStr: string): number {
    const birthDate = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  async function handleRegister() {
    if (!bloodGroup) {
      Alert.alert('ত্রুটি', 'রক্তের গ্রুপ নির্বাচন করুন।');
      return;
    }
    setLoading(true);
    try {
      const result = await donorApi.register(bloodGroup, responses);
      if (!result.is_eligible) {
        Alert.alert('অযোগ্য', 'আপনার উত্তরের ভিত্তিতে আপনি এখন রক্তদানের জন্য যোগ্য নন।');
      } else {
        Alert.alert('সফল', 'ডোনার হিসেবে নিবন্ধিত হয়েছেন!');
      }
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'নিবন্ধন করা যায়নি';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>ডোনার নিবন্ধন</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>রক্তের গ্রুপ *</Text>
          <View style={styles.bloodGrid}>
            {BLOOD_GROUPS.map((bg) => (
              <Pressable
                key={bg}
                style={[styles.bloodOption, bloodGroup === bg && styles.bloodSelected]}
                onPress={() => setBloodGroup(bg)}
              >
                <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextSelected]}>
                  {bg}
                </Text>
              </Pressable>
            ))}
          </View>

          {questions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>স্ক্রিনিং প্রশ্ন</Text>
              {questions.map((q) => (
                <Card key={q.id} style={styles.questionCard}>
                  <Text style={styles.questionText}>{q.question_bn}</Text>
                  {q.question_en ? <Text style={styles.questionEn}>{q.question_en}</Text> : null}
                  <View style={styles.answerRow}>
                    {(q.options ?? ['হ্যাঁ', 'না']).map((opt) => (
                      <Pressable
                        key={opt}
                        style={[
                          styles.answerBtn,
                          responses[String(q.id)] === opt && styles.answerSelected,
                        ]}
                        onPress={() =>
                          setResponses((prev) => ({ ...prev, [String(q.id)]: opt }))
                        }
                      >
                        <Text
                          style={[
                            styles.answerText,
                            responses[String(q.id)] === opt && styles.answerTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              ))}
            </>
          )}

          <Button
            title="নিবন্ধন করুন"
            onPress={handleRegister}
            loading={loading}
            disabled={!bloodGroup}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Contact Add Modal ────────────────────────────────────────────────────────

function AddContactModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [contactType, setContactType] = useState<'phone' | 'email'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!contactValue.trim()) return;
    setLoading(true);
    try {
      const result = await authApi.addContact(contactType, contactValue.trim());
      setVerificationId(result.verification_id);
      setStep('verify');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'OTP পাঠানো যায়নি';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!otpCode.trim()) return;
    setLoading(true);
    try {
      await authApi.verifyContact(verificationId, otpCode.trim());
      Alert.alert('সফল', 'যোগাযোগ পদ্ধতি যোগ হয়েছে');
      onDone();
      // Reset
      setStep('input');
      setContactValue('');
      setOtpCode('');
      setVerificationId('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'যাচাই করা যায়নি';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>যোগাযোগ যোগ করুন</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.modalBody}>
          {step === 'input' ? (
            <>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeBtn, contactType === 'phone' && styles.typeSelected]}
                  onPress={() => setContactType('phone')}
                >
                  <Text style={[styles.typeText, contactType === 'phone' && styles.typeTextSelected]}>
                    📱 ফোন
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, contactType === 'email' && styles.typeSelected]}
                  onPress={() => setContactType('email')}
                >
                  <Text style={[styles.typeText, contactType === 'email' && styles.typeTextSelected]}>
                    ✉️ ইমেইল
                  </Text>
                </Pressable>
              </View>
              <Input
                label={contactType === 'phone' ? 'ফোন নম্বর' : 'ইমেইল'}
                value={contactValue}
                onChangeText={setContactValue}
                placeholder={contactType === 'phone' ? '01XXXXXXXXX' : 'email@example.com'}
                keyboardType={contactType === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />
              <Button title="OTP পাঠান" onPress={sendOtp} loading={loading} disabled={!contactValue.trim()} />
            </>
          ) : (
            <>
              <Text style={styles.verifyDesc}>
                {contactValue} তে পাঠানো OTP কোড দিন
              </Text>
              <Input
                label="OTP কোড"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                placeholder="123456"
              />
              <Button title="যাচাই করুন" onPress={verify} loading={loading} disabled={!otpCode.trim()} />
              <Button
                title="← ফিরে যান"
                onPress={() => setStep('input')}
                variant="ghost"
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Session Manager Modal ────────────────────────────────────────────────────

function SessionManagerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  React.useEffect(() => {
    if (visible) loadSessions();
  }, [visible]);

  async function loadSessions() {
    setLoading(true);
    try {
      const result = await authApi.getSessions();
      setSessions(result?.sessions ?? []);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }

  async function terminate(id: number) {
    setActionLoading(id);
    try {
      await authApi.terminateSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      Alert.alert('ত্রুটি', 'সেশন বন্ধ করা যায়নি');
    } finally {
      setActionLoading(null);
    }
  }

  async function terminateAll() {
    Alert.alert('নিশ্চিত করুন', 'সব সেশন বন্ধ করতে চান?', [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.terminateAllSessions();
            await loadSessions();
          } catch {
            Alert.alert('ত্রুটি', 'সেশন বন্ধ করা যায়নি');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>সেশন ম্যানেজার</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          {loading ? (
            <ActivityIndicator color={Colors.crimson} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {sessions.map((s) => (
                <Card key={s.id} style={[styles.sessionCard, s.is_current && styles.sessionCurrent]}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDevice}>
                      {s.device_name || 'অজানা ডিভাইস'}
                    </Text>
                    <Text style={styles.sessionIp}>{s.ip_address}</Text>
                    <Text style={styles.sessionTime}>
                      {s.last_active_at
                        ? new Date(s.last_active_at).toLocaleString('bn-BD')
                        : '—'}
                    </Text>
                    {s.is_current && (
                      <Badge label="বর্তমান" variant="success" />
                    )}
                  </View>
                  {!s.is_current && (
                    <Button
                      title="বন্ধ করুন"
                      onPress={() => terminate(s.id)}
                      loading={actionLoading === s.id}
                      variant="danger"
                      size="sm"
                    />
                  )}
                </Card>
              ))}

              {sessions.filter((s) => !s.is_current).length > 1 && (
                <Button
                  title="অন্য সব সেশন বন্ধ করুন"
                  onPress={terminateAll}
                  variant="danger"
                  style={{ marginTop: 12 }}
                />
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Donor Settings Section ───────────────────────────────────────────────────

function DonorSettingsSection() {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const result = await donorApi.getProfile();
      setProfile(result);
    } catch {
      // Not a donor or error
    } finally {
      setLoading(false);
    }
  }

  async function toggleSetting(key: string, value: boolean) {
    setSaving(true);
    try {
      await authApi.updateSettings({ [key]: value });
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    } catch {
      Alert.alert('ত্রুটি', 'সেটিং আপডেট করা যায়নি');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator color={Colors.crimson} style={{ marginVertical: 20 }} />;
  if (!profile) return null;

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>ডোনার তথ্য</Text>

      <View style={styles.donorInfoRow}>
        <BloodGroupBadge group={profile.blood_group} size="sm" />
        <Badge
          label={profile.is_eligible ? '✓ যোগ্য' : '✗ অযোগ্য'}
          variant={profile.is_eligible ? 'success' : 'crimson'}
        />
        <Badge
          label={profile.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
          variant={profile.is_active ? 'success' : 'muted'}
        />
      </View>

      {profile.total_donations > 0 && (
        <Text style={styles.donationCount}>
          মোট রক্তদান: {profile.total_donations} বার
        </Text>
      )}
      {profile.last_donated_at && (
        <Text style={styles.lastDonation}>
          সর্বশেষ: {new Date(profile.last_donated_at).toLocaleDateString('bn-BD')}
        </Text>
      )}

      <Text style={styles.subsectionTitle}>গোপনীয়তা সেটিংস</Text>

      <SettingToggle
        label="প্রোফাইল পাবলিক"
        value={profile.is_profile_public}
        onToggle={(v) => toggleSetting('is_profile_public', v)}
        disabled={saving}
      />
      <SettingToggle
        label="রক্তের গ্রুপ দেখান"
        value={profile.show_blood_group}
        onToggle={(v) => toggleSetting('show_blood_group', v)}
        disabled={saving}
      />
      <SettingToggle
        label="অবস্থান দেখান"
        value={profile.show_location}
        onToggle={(v) => toggleSetting('show_location', v)}
        disabled={saving}
      />
      <SettingToggle
        label="রক্তদানের সংখ্যা দেখান"
        value={profile.show_donation_count}
        onToggle={(v) => toggleSetting('show_donation_count', v)}
        disabled={saving}
      />
    </Card>
  );
}

function SettingToggle({
  label,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.surfaceBorder, true: Colors.crimson }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

// ── Main Profile Screen ──────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, clearAuth, refreshUser } = useAuthStore();
  const { locale, setLocale } = useSettingsStore();
  const qc = useQueryClient();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDonorReg, setShowDonorReg] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [removingContact, setRemovingContact] = useState<number | null>(null);

  async function handleRemoveContact(id: number) {
    Alert.alert('নিশ্চিত করুন', 'এই যোগাযোগ পদ্ধতি মুছে ফেলতে চান?', [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: async () => {
          setRemovingContact(id);
          try {
            await authApi.removeContact(id);
            await refreshUser();
          } catch {
            Alert.alert('ত্রুটি', 'মুছে ফেলা যায়নি');
          } finally {
            setRemovingContact(null);
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert('লগআউট', 'আপনি কি লগআউট করতে চান?', [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(tabs)');
        },
      },
    ]);
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoginGate message="প্রোফাইল ও সেটিংস দেখতে লগইন করুন।">
          <View />
        </LoginGate>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar & name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.first_name?.[0] ?? '?'}</Text>
          </View>
          <Text style={styles.name}>
            {user.first_name} {user.last_name}
          </Text>
          <Button
            title="সম্পাদনা"
            onPress={() => setShowEditProfile(true)}
            variant="outline"
            size="sm"
          />
        </View>

        {/* Info card */}
        <Card style={styles.section}>
          <InfoRow label="জেলা" value={user.district ?? '—'} />
          <InfoRow label="বিভাগ" value={user.division ?? '—'} />
          <InfoRow
            label="ডোনার"
            value={user.is_donor ? '✓ হ্যাঁ' : '✗ না'}
            valueColor={user.is_donor ? Colors.success : Colors.textMuted}
          />
          {user.gender && (
            <InfoRow
              label="লিঙ্গ"
              value={user.gender === 'male' ? 'পুরুষ' : user.gender === 'female' ? 'মহিলা' : 'অন্যান্য'}
            />
          )}
          {user.date_of_birth && <InfoRow label="জন্ম তারিখ" value={user.date_of_birth} />}
        </Card>

        {/* Contact methods */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>যোগাযোগ পদ্ধতি</Text>
            <Button title="+ যোগ" onPress={() => setShowAddContact(true)} size="sm" variant="outline" />
          </View>
          {user.contact_methods?.length > 0 ? (
            user.contact_methods.map((c) => (
              <View key={c.id} style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactIcon}>{c.type === 'phone' ? '📱' : '✉️'}</Text>
                  <View>
                    <Text style={styles.contactValue}>{c.value}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {c.is_primary && <Badge label="প্রাথমিক" variant="gold" />}
                      {c.verified_at ? (
                        <Badge label="✓ যাচাইকৃত" variant="success" />
                      ) : (
                        <Badge label="অযাচাইকৃত" variant="warning" />
                      )}
                    </View>
                  </View>
                </View>
                {!c.is_primary && (
                  <Pressable onPress={() => handleRemoveContact(c.id)}>
                    {removingContact === c.id ? (
                      <ActivityIndicator color={Colors.crimson} size="small" />
                    ) : (
                      <Text style={styles.removeText}>✕</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyHint}>কোনো যোগাযোগ পদ্ধতি নেই</Text>
          )}
        </Card>

        {/* Donor section */}
        {user.is_donor ? (
          <DonorSettingsSection />
        ) : (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>রক্তদাতা</Text>
            <Text style={styles.donorDesc}>
              রক্তদাতা হিসেবে নিবন্ধন করুন এবং রক্তের প্রয়োজনে পাশে থাকুন।
            </Text>
            <Button
              title="ডোনার হিসেবে যোগ দিন"
              onPress={() => setShowDonorReg(true)}
              variant="outline"
              size="sm"
              style={{ marginTop: 10 }}
            />
          </Card>
        )}

        {/* Language */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>ভাষা</Text>
          <View style={styles.langRow}>
            <Pressable
              style={[styles.langBtn, locale === 'bn' && styles.langActive]}
              onPress={() => setLocale('bn')}
            >
              <Text style={[styles.langText, locale === 'bn' && styles.langTextActive]}>বাংলা</Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, locale === 'en' && styles.langActive]}
              onPress={() => setLocale('en')}
            >
              <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>English</Text>
            </Pressable>
          </View>
        </Card>

        {/* Sessions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>সেশন</Text>
          <Button
            title="সেশন ম্যানেজ করুন"
            onPress={() => setShowSessions(true)}
            variant="outline"
            size="sm"
          />
        </Card>

        <Button title="লগআউট" onPress={handleLogout} variant="danger" style={styles.logoutBtn} />
        <Text style={styles.version}>BloodLagbe Mobile v1.0</Text>
      </ScrollView>

      {/* Modals */}
      <ProfileEditModal visible={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <DonorRegModal
        visible={showDonorReg}
        onClose={() => setShowDonorReg(false)}
        onDone={() => {
          setShowDonorReg(false);
          refreshUser();
        }}
      />
      <AddContactModal
        visible={showAddContact}
        onClose={() => setShowAddContact(false)}
        onDone={() => {
          setShowAddContact(false);
          refreshUser();
        }}
      />
      <SessionManagerModal visible={showSessions} onClose={() => setShowSessions(false)} />
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  container: { padding: 20, paddingBottom: 40 },
  modal: { flex: 1, backgroundColor: Colors.darkBg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  closeBtn: { color: Colors.textSecondary, fontSize: 20 },
  modalBody: { padding: 20, paddingBottom: 48 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 36, fontWeight: '800' },
  name: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },

  // Sections
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  subsectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  infoLabel: { color: Colors.textSecondary, fontSize: 14 },
  infoValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },

  // Contact methods
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  contactIcon: { fontSize: 18 },
  contactValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  removeText: { color: Colors.crimson, fontSize: 16, fontWeight: '700', padding: 4 },
  emptyHint: { color: Colors.textMuted, fontSize: 13 },

  // Donor
  donorDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  donorInfoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  donationCount: { color: Colors.textSecondary, fontSize: 13, marginTop: 8 },
  lastDonation: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: { color: Colors.textSecondary, fontSize: 14, flex: 1 },

  // Language
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  langActive: { borderColor: Colors.gold, backgroundColor: '#2D2400' },
  langText: { color: Colors.textSecondary, fontWeight: '600' },
  langTextActive: { color: Colors.gold },

  // Sessions
  sessionCard: { marginBottom: 10 },
  sessionCurrent: { borderColor: Colors.success },
  sessionInfo: { gap: 4, marginBottom: 8 },
  sessionDevice: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sessionIp: { color: Colors.textMuted, fontSize: 12 },
  sessionTime: { color: Colors.textMuted, fontSize: 12 },

  // Profile edit
  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  genderSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  genderText: { color: Colors.textSecondary, fontWeight: '500' },
  genderTextSelected: { color: Colors.crimson },
  verifyDesc: { color: Colors.textSecondary, fontSize: 14, marginBottom: 16 },

  // Contact add
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  typeSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  typeText: { color: Colors.textSecondary, fontWeight: '500' },
  typeTextSelected: { color: Colors.crimson },

  // Donor registration
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  bloodOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  bloodSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  bloodText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 16 },
  bloodTextSelected: { color: Colors.crimson },
  questionCard: { marginBottom: 10 },
  questionText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 4 },
  questionEn: { color: Colors.textMuted, fontSize: 12, marginBottom: 10 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  answerSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  answerText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },
  answerTextSelected: { color: Colors.crimson },

  // Bottom
  logoutBtn: { marginTop: 8, marginBottom: 12 },
  version: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});
