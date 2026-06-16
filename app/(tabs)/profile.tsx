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
import { useSettingsStore, t } from '@/store/settingsStore';
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
  const { locale } = useSettingsStore();
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
      Alert.alert(t('success', locale), t('profileUpdated', locale));
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('profileUpdateFailed', locale);
      Alert.alert(t('error', locale), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('editProfile', locale)}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Input label={t('firstName', locale)} value={firstName} onChangeText={setFirstName} />
          <Input label={t('lastName', locale)} value={lastName} onChangeText={setLastName} />
          <Text style={styles.fieldLabel}>{t('gender', locale)}</Text>
          <View style={styles.genderRow}>
            {[
              { value: 'male', label: t('male', locale) },
              { value: 'female', label: t('female', locale) },
              { value: 'other', label: t('other', locale) },
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
          <Input label={t('dobFormat', locale)} value={dob} onChangeText={setDob} />
          <Button title={t('saveChanges', locale)} onPress={save} loading={loading} />
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
  const { locale } = useSettingsStore();
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
      Alert.alert(t('error', locale), t('selectBloodGroup', locale));
      return;
    }
    setLoading(true);
    try {
      const result = await donorApi.register(bloodGroup, responses);
      if (!result.is_eligible) {
        Alert.alert(t('ineligibleTitle', locale), t('ineligibleMsg', locale));
      } else {
        Alert.alert(t('success', locale), t('donorRegistered', locale));
      }
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('registrationFailed', locale);
      Alert.alert(t('error', locale), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('donorRegistration', locale)}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>{t('bloodGroupLabel', locale)}</Text>
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
              <Text style={styles.sectionTitle}>{t('screeningQuestions', locale)}</Text>
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
            title={t('registerBtn', locale)}
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
  const { locale } = useSettingsStore();
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
        t('otpSendFailed', locale);
      Alert.alert(t('error', locale), msg);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!otpCode.trim()) return;
    setLoading(true);
    try {
      await authApi.verifyContact(verificationId, otpCode.trim());
      Alert.alert(t('success', locale), t('contactAdded', locale));
      onDone();
      // Reset
      setStep('input');
      setContactValue('');
      setOtpCode('');
      setVerificationId('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('verifyFailed', locale);
      Alert.alert(t('error', locale), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('addContactTitle', locale)}</Text>
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
                    📱 {t('phone', locale)}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, contactType === 'email' && styles.typeSelected]}
                  onPress={() => setContactType('email')}
                >
                  <Text style={[styles.typeText, contactType === 'email' && styles.typeTextSelected]}>
                    ✉️ {t('emailLabel', locale)}
                  </Text>
                </Pressable>
              </View>
              <Input
                label={contactType === 'phone' ? t('phoneLabel', locale) : t('emailLabel', locale)}
                value={contactValue}
                onChangeText={setContactValue}
                placeholder={contactType === 'phone' ? '01XXXXXXXXX' : 'email@example.com'}
                keyboardType={contactType === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
              />
              <Button title={t('sendOtpBtn', locale)} onPress={sendOtp} loading={loading} disabled={!contactValue.trim()} />
            </>
          ) : (
            <>
              <Text style={styles.verifyDesc}>
                {contactValue} {t('otpSentTo', locale)}
              </Text>
              <Input
                label={t('otpCode', locale)}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                placeholder="123456"
              />
              <Button title={t('verify', locale)} onPress={verify} loading={loading} disabled={!otpCode.trim()} />
              <Button
                title={`< ${t('back', locale)}`}
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
  const { locale } = useSettingsStore();
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
      Alert.alert(t('error', locale), t('sessionCloseFailed', locale));
    } finally {
      setActionLoading(null);
    }
  }

  async function terminateAll() {
    Alert.alert(t('confirmTitle', locale), t('confirmCloseAll', locale), [
      { text: t('no', locale), style: 'cancel' },
      {
        text: t('yes', locale),
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.terminateAllSessions();
            await loadSessions();
          } catch {
            Alert.alert(t('error', locale), t('sessionCloseFailed', locale));
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('sessionManager', locale)}</Text>
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
                      {s.device_name || t('unknownDevice', locale)}
                    </Text>
                    <Text style={styles.sessionIp}>{s.ip_address}</Text>
                    <Text style={styles.sessionTime}>
                      {s.last_active_at
                        ? new Date(s.last_active_at).toLocaleString('bn-BD')
                        : '—'}
                    </Text>
                    {s.is_current && (
                      <Badge label={t('currentSession', locale)} variant="success" />
                    )}
                  </View>
                  {!s.is_current && (
                    <Button
                      title={t('closeSession', locale)}
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
                  title={t('closeAllSessions', locale)}
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
  const { locale } = useSettingsStore();
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
      Alert.alert(t('error', locale), t('settingUpdateFailed', locale));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator color={Colors.crimson} style={{ marginVertical: 20 }} />;
  if (!profile) return null;

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{t('donorInfo', locale)}</Text>

      <View style={styles.donorInfoRow}>
        <BloodGroupBadge group={profile.blood_group} size="sm" />
        <Badge
          label={profile.is_eligible ? t('eligible', locale) : t('ineligible', locale)}
          variant={profile.is_eligible ? 'success' : 'crimson'}
        />
        <Badge
          label={profile.is_active ? t('activeDonor', locale) : t('inactiveDonor', locale)}
          variant={profile.is_active ? 'success' : 'muted'}
        />
      </View>

      {profile.total_donations > 0 && (
        <Text style={styles.donationCount}>
          {t('totalDonationsLabel', locale)} {profile.total_donations} {t('timesUnit', locale)}
        </Text>
      )}
      {profile.last_donated_at && (
        <Text style={styles.lastDonation}>
          {t('lastDonatedLabel', locale)} {new Date(profile.last_donated_at).toLocaleDateString(locale === 'en' ? 'en-BD' : 'bn-BD')}
        </Text>
      )}

      <Text style={styles.subsectionTitle}>{t('privacySettings', locale)}</Text>

      <SettingToggle
        label={t('profilePublic', locale)}
        value={profile.is_profile_public}
        onToggle={(v) => toggleSetting('is_profile_public', v)}
        disabled={saving}
      />
      <SettingToggle
        label={t('showBloodGroup', locale)}
        value={profile.show_blood_group}
        onToggle={(v) => toggleSetting('show_blood_group', v)}
        disabled={saving}
      />
      <SettingToggle
        label={t('showLocation', locale)}
        value={profile.show_location}
        onToggle={(v) => toggleSetting('show_location', v)}
        disabled={saving}
      />
      <SettingToggle
        label={t('showDonationCount', locale)}
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
    Alert.alert(t('confirmTitle', locale), t('removeContactConfirm', locale), [
      { text: t('no', locale), style: 'cancel' },
      {
        text: t('deleteBtn', locale),
        style: 'destructive',
        onPress: async () => {
          setRemovingContact(id);
          try {
            await authApi.removeContact(id);
            await refreshUser();
          } catch {
            Alert.alert(t('error', locale), t('profileUpdateFailed', locale));
          } finally {
            setRemovingContact(null);
          }
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert(t('logout', locale), t('logoutConfirmMsg', locale), [
      { text: t('no', locale), style: 'cancel' },
      {
        text: t('yes', locale),
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
        <LoginGate message={t('profileLoginRequired', locale)}>
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
            title={t('edit', locale)}
            onPress={() => setShowEditProfile(true)}
            variant="outline"
            size="sm"
          />
        </View>

        {/* Info card */}
        <Card style={styles.section}>
          <InfoRow label={t('district', locale)} value={user.district ?? '—'} />
          <InfoRow label={t('division', locale)} value={user.division ?? '—'} />
          <InfoRow
            label={t('donor', locale)}
            value={user.is_donor ? t('isDonorYes', locale) : t('isDonorNo', locale)}
            valueColor={user.is_donor ? Colors.success : Colors.textMuted}
          />
          {user.gender && (
            <InfoRow
              label={t('gender', locale)}
              value={user.gender === 'male' ? t('male', locale) : user.gender === 'female' ? t('female', locale) : t('other', locale)}
            />
          )}
          {user.date_of_birth && <InfoRow label={t('dob', locale)} value={user.date_of_birth} />}
        </Card>

        {/* Contact methods */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('contactMethods', locale)}</Text>
            <Button title={t('addContactBtn', locale)} onPress={() => setShowAddContact(true)} size="sm" variant="outline" />
          </View>
          {user.contact_methods?.length > 0 ? (
            user.contact_methods.map((c) => (
              <View key={c.id} style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactIcon}>{c.type === 'phone' ? '📱' : '✉️'}</Text>
                  <View>
                    <Text style={styles.contactValue}>{c.value}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {c.is_primary && <Badge label={t('primaryBadge', locale)} variant="gold" />}
                      {c.verified_at ? (
                        <Badge label={t('verifiedBadge', locale)} variant="success" />
                      ) : (
                        <Badge label={t('unverifiedBadge', locale)} variant="warning" />
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
            <Text style={styles.emptyHint}>{t('noContacts', locale)}</Text>
          )}
        </Card>

        {/* Donor section */}
        {user.is_donor ? (
          <DonorSettingsSection />
        ) : (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('bloodDonor', locale)}</Text>
            <Text style={styles.donorDesc}>{t('donorJoinDesc', locale)}</Text>
            <Button
              title={t('joinAsDonor', locale)}
              onPress={() => setShowDonorReg(true)}
              variant="outline"
              size="sm"
              style={{ marginTop: 10 }}
            />
          </Card>
        )}

        {/* Language */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('languageSection', locale)}</Text>
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
          <Text style={styles.sectionTitle}>{t('sessions', locale)}</Text>
          <Button
            title={t('manageSessions', locale)}
            onPress={() => setShowSessions(true)}
            variant="outline"
            size="sm"
          />
        </Card>

        <Button title={t('logout', locale)} onPress={handleLogout} variant="danger" style={styles.logoutBtn} />
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
