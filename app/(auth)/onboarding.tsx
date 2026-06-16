import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { donorApi } from '@/api/donor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';
import type { DonorQuestion, PostClaimItem } from '@/types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { value: 'male', label: 'পুরুষ' },
  { value: 'female', label: 'মহিলা' },
  { value: 'other', label: 'অন্যান্য' },
];

// Steps: 1=Profile, 2=Location, 3=Donor opt-in, 4=Donor screening, 5=Post-claims
const TOTAL_STEPS = 4; // Visual progress shows 4 steps (screening is sub-step of opt-in)

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuthStore();

  // Step 1: Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');

  // Step 2: Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Step 3/4: Donor
  const [wantsDonor, setWantsDonor] = useState<boolean | null>(null);
  const [bloodGroup, setBloodGroup] = useState('');
  const [questions, setQuestions] = useState<DonorQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Step 5: Post claims
  const [claims, setClaims] = useState<PostClaimItem[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<Set<number>>(new Set());
  const [claimsLoading, setClaimsLoading] = useState(false);

  // Calculate age from DOB
  function getAge(): number | undefined {
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  // Load donor questions when entering step 4
  useEffect(() => {
    if (step === 4) {
      loadQuestions();
    }
  }, [step]);

  async function loadQuestions() {
    setQuestionsLoading(true);
    try {
      const age = getAge();
      const result = await donorApi.getQuestions(gender || undefined, age);
      setQuestions(result.questions ?? []);
    } catch {
      // Silently handle
    } finally {
      setQuestionsLoading(false);
    }
  }

  // Step 1: Save profile
  async function handleSaveProfile() {
    if (!firstName.trim() || !gender || !dob) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য দিন।');
      return;
    }
    setLoading(true);
    try {
      await authApi.saveProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        gender,
        date_of_birth: dob,
      });
      setStep(2);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'সমস্যা হয়েছে';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Get & save location
  async function requestLocation() {
    setLocationLoading(true);
    setLocationStatus('অনুমতি নেওয়া হচ্ছে...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('লোকেশন অনুমতি দেওয়া হয়নি');
        setLocationLoading(false);
        return;
      }
      setLocationStatus('অবস্থান নেওয়া হচ্ছে...');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setLocationStatus('✓ অবস্থান পাওয়া গেছে');
    } catch {
      setLocationStatus('অবস্থান নেওয়া যায়নি');
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSaveLocation() {
    if (latitude == null || longitude == null) {
      Alert.alert('ত্রুটি', 'অনুগ্রহ করে আপনার অবস্থান দিন।');
      return;
    }
    setLoading(true);
    try {
      await authApi.saveLocation({ latitude, longitude });
      setStep(3);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'সমস্যা হয়েছে';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Donor opt-in or skip
  function handleDonorOptIn(wants: boolean) {
    setWantsDonor(wants);
    if (wants) {
      setStep(4); // Go to screening
    } else {
      handleCompleteOnboarding(); // Skip donor, finalize
    }
  }

  // Step 4: Register as donor
  async function handleDonorRegister() {
    if (!bloodGroup) {
      Alert.alert('ত্রুটি', 'রক্তের গ্রুপ নির্বাচন করুন।');
      return;
    }
    setLoading(true);
    try {
      const result = await donorApi.register(bloodGroup, responses);
      if (!result.is_eligible) {
        Alert.alert(
          'অযোগ্য',
          'আপনার উত্তরের ভিত্তিতে আপনি এখন রক্তদানের জন্য যোগ্য নন। চিন্তা করবেন না, পরে আবার চেষ্টা করতে পারবেন।',
        );
      }
      await handleCompleteOnboarding();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'সমস্যা হয়েছে';
      Alert.alert('ত্রুটি', msg);
    } finally {
      setLoading(false);
    }
  }

  // Complete onboarding and check for post-claims
  async function handleCompleteOnboarding() {
    setLoading(true);
    try {
      await authApi.completeOnboarding();
      // Check for post-claims
      const claimsResult = await authApi.getPostClaims();
      const needsConfirmation = claimsResult?.needs_confirmation ?? [];
      if (needsConfirmation.length > 0) {
        setClaims(needsConfirmation);
        setStep(5);
      } else {
        await finalize();
      }
    } catch {
      // Even if claims check fails, finalize
      await finalize();
    } finally {
      setLoading(false);
    }
  }

  // Step 5: Resolve post-claims
  async function handleResolveClaims() {
    setClaimsLoading(true);
    try {
      const claimedIds = Array.from(selectedClaims);
      const rejectedIds = claims.filter((c) => !selectedClaims.has(c.id)).map((c) => c.id);

      if (claimedIds.length > 0) {
        await authApi.resolvePostClaims(claimedIds, true);
      }
      if (rejectedIds.length > 0) {
        await authApi.resolvePostClaims(rejectedIds, false);
      }
    } catch {
      // Non-critical
    } finally {
      setClaimsLoading(false);
      await finalize();
    }
  }

  async function finalize() {
    await refreshUser();
    router.replace('/(tabs)');
  }

  function toggleClaim(id: number) {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visualStep = step <= 4 ? Math.min(step, TOTAL_STEPS) : TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Progress header */}
        <View style={styles.header}>
          <Text style={styles.stepText}>
            ধাপ {visualStep}/{TOTAL_STEPS}
          </Text>
          <View style={styles.progress}>
            <View style={[styles.progressBar, { width: `${(visualStep / TOTAL_STEPS) * 100}%` }]} />
          </View>
        </View>

        {/* Step 1: Profile */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>আপনার পরিচয়</Text>
            <Text style={styles.desc}>আপনার নাম ও বেসিক তথ্য দিন</Text>

            <Input
              label="প্রথম নাম *"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="আপনার প্রথম নাম"
            />
            <Input
              label="শেষ নাম"
              value={lastName}
              onChangeText={setLastName}
              placeholder="আপনার শেষ নাম"
            />

            <Text style={styles.sectionLabel}>লিঙ্গ *</Text>
            <View style={styles.optionRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g.value}
                  style={[styles.option, gender === g.value && styles.optionSelected]}
                  onPress={() => setGender(g.value)}
                >
                  <Text style={[styles.optionText, gender === g.value && styles.optionTextSelected]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="জন্ম তারিখ * (YYYY-MM-DD)"
              value={dob}
              onChangeText={setDob}
              placeholder="2000-01-01"
            />

            <Button
              title="পরবর্তী →"
              onPress={handleSaveProfile}
              loading={loading}
              disabled={!firstName.trim() || !gender || !dob}
            />
          </View>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>আপনার অবস্থান</Text>
            <Text style={styles.desc}>
              আপনার কাছাকাছি রক্তের প্রয়োজন জানাতে আমাদের আপনার অবস্থান প্রয়োজন।
            </Text>

            <Card style={styles.locationCard}>
              {latitude != null && longitude != null ? (
                <View>
                  <Text style={styles.locationOk}>✓ অবস্থান সেট করা হয়েছে</Text>
                  <Text style={styles.coordText}>
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.locationPrompt}>📍 আপনার বর্তমান অবস্থান শেয়ার করুন</Text>
                  {locationStatus ? (
                    <Text style={styles.locationStatus}>{locationStatus}</Text>
                  ) : null}
                </View>
              )}

              <Button
                title={latitude != null ? '📍 আবার নিন' : '📍 অবস্থান নিন'}
                onPress={requestLocation}
                loading={locationLoading}
                variant={latitude != null ? 'outline' : 'primary'}
                size="sm"
                style={{ marginTop: 12 }}
              />
            </Card>

            <Text style={styles.orText}>অথবা ম্যানুয়ালি দিন</Text>
            <View style={styles.coordRow}>
              <Input
                label="অক্ষাংশ"
                value={latitude?.toString() ?? ''}
                onChangeText={(t) => setLatitude(t ? parseFloat(t) : null)}
                keyboardType="decimal-pad"
                placeholder="23.8103"
                style={{ flex: 1 }}
              />
              <Input
                label="দ্রাঘিমাংশ"
                value={longitude?.toString() ?? ''}
                onChangeText={(t) => setLongitude(t ? parseFloat(t) : null)}
                keyboardType="decimal-pad"
                placeholder="90.4125"
                style={{ flex: 1 }}
              />
            </View>

            <View style={styles.navRow}>
              <Button title="< পিছনে" onPress={() => setStep(1)} variant="outline" style={styles.flex1} />
              <Button
                title="পরবর্তী →"
                onPress={handleSaveLocation}
                loading={loading}
                disabled={latitude == null || longitude == null}
                style={styles.flex2}
              />
            </View>
          </View>
        )}

        {/* Step 3: Donor opt-in */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>রক্তদাতা হতে চান?</Text>
            <Text style={styles.desc}>
              রক্তদাতা হিসেবে নিবন্ধন করলে আপনার কাছাকাছি কেউ রক্তের প্রয়োজনে আপনাকে জানানো হবে।
            </Text>

            <View style={styles.donorOptions}>
              <Pressable
                style={[styles.donorCard, { borderColor: Colors.crimson }]}
                onPress={() => handleDonorOptIn(true)}
              >
                <Text style={styles.donorCardEmoji}>💉</Text>
                <Text style={styles.donorCardTitle}>হ্যাঁ, আমি ডোনার হতে চাই</Text>
                <Text style={styles.donorCardDesc}>স্ক্রিনিং প্রশ্নের উত্তর দিন</Text>
              </Pressable>

              <Pressable
                style={[styles.donorCard, { borderColor: Colors.surfaceBorder }]}
                onPress={() => handleDonorOptIn(false)}
              >
                <Text style={styles.donorCardEmoji}>⏭️</Text>
                <Text style={styles.donorCardTitle}>পরে করব</Text>
                <Text style={styles.donorCardDesc}>যেকোনো সময় প্রোফাইল থেকে নিবন্ধন করতে পারবেন</Text>
              </Pressable>
            </View>

            {loading && (
              <ActivityIndicator color={Colors.crimson} style={{ marginTop: 20 }} />
            )}
          </View>
        )}

        {/* Step 4: Donor screening */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>ডোনার স্ক্রিনিং</Text>
            <Text style={styles.desc}>আপনার রক্তের গ্রুপ নির্বাচন করুন এবং স্ক্রিনিং প্রশ্নের উত্তর দিন।</Text>

            <Text style={styles.sectionLabel}>রক্তের গ্রুপ *</Text>
            <View style={styles.bloodGrid}>
              {BLOOD_GROUPS.map((bg) => (
                <Pressable
                  key={bg}
                  style={[styles.bloodOption, bloodGroup === bg && styles.bloodSelected]}
                  onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                >
                  <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextSelected]}>
                    {bg}
                  </Text>
                </Pressable>
              ))}
            </View>

            {questionsLoading ? (
              <ActivityIndicator color={Colors.crimson} style={{ marginVertical: 20 }} />
            ) : (
              questions.map((q) => (
                <Card key={q.id} style={styles.questionCard}>
                  <Text style={styles.questionText}>{q.question_bn}</Text>
                  {q.question_en ? (
                    <Text style={styles.questionEn}>{q.question_en}</Text>
                  ) : null}
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
              ))
            )}

            <View style={styles.navRow}>
              <Button title="< পিছনে" onPress={() => setStep(3)} variant="outline" style={styles.flex1} />
              <Button
                title="নিবন্ধন করুন"
                onPress={handleDonorRegister}
                loading={loading}
                disabled={!bloodGroup}
                style={styles.flex2}
              />
            </View>
          </View>
        )}

        {/* Step 5: Post claims */}
        {step === 5 && (
          <View>
            <Text style={styles.title}>আপনার পোস্ট</Text>
            <Text style={styles.desc}>
              নিচের রক্তের পোস্টগুলো আপনার ফোন/ইমেইলের সাথে মিলেছে। আপনার পোস্টগুলো সিলেক্ট করুন:
            </Text>

            {claims.map((claim) => (
              <Pressable
                key={claim.id}
                style={[styles.claimCard, selectedClaims.has(claim.id) && styles.claimSelected]}
                onPress={() => toggleClaim(claim.id)}
              >
                <View style={styles.claimCheck}>
                  <Text style={styles.checkmark}>
                    {selectedClaims.has(claim.id) ? '✓' : '○'}
                  </Text>
                </View>
                <View style={styles.claimInfo}>
                  <Text style={styles.claimGroup}>{claim.blood_group}</Text>
                  <Text style={styles.claimHospital}>{claim.hospital_name}</Text>
                  <Text style={styles.claimDate}>
                    {new Date(claim.created_at).toLocaleDateString('bn-BD')}
                  </Text>
                </View>
              </Pressable>
            ))}

            <View style={styles.navRow}>
              <Button
                title="এড়িয়ে যান"
                onPress={() => finalize()}
                variant="outline"
                style={styles.flex1}
              />
              <Button
                title="নিশ্চিত করুন"
                onPress={handleResolveClaims}
                loading={claimsLoading}
                style={styles.flex2}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.darkBg },
  container: { flexGrow: 1, padding: 24 },
  header: { marginBottom: 32 },
  stepText: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },
  progress: { height: 4, backgroundColor: Colors.surface, borderRadius: 2 },
  progressBar: { height: '100%', backgroundColor: Colors.crimson, borderRadius: 2 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  desc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  optionSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  optionText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },
  optionTextSelected: { color: Colors.crimson },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },

  // Location
  locationCard: { alignItems: 'center', paddingVertical: 24 },
  locationOk: { color: Colors.success, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  coordText: { color: Colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  locationPrompt: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },
  locationStatus: { color: Colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  orText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 16 },
  coordRow: { flexDirection: 'row', gap: 12 },

  // Donor opt-in
  donorOptions: { gap: 16 },
  donorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
  },
  donorCardEmoji: { fontSize: 36, marginBottom: 10 },
  donorCardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  donorCardDesc: { color: Colors.textSecondary, fontSize: 13 },

  // Blood group grid
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

  // Questions
  questionCard: { marginBottom: 12 },
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

  // Post claims
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  },
  claimSelected: { borderColor: Colors.crimson, backgroundColor: Colors.crimsonBg },
  claimCheck: { width: 32, alignItems: 'center' },
  checkmark: { color: Colors.crimson, fontSize: 18, fontWeight: '700' },
  claimInfo: { flex: 1, marginLeft: 10 },
  claimGroup: { color: Colors.crimson, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  claimHospital: { color: Colors.textPrimary, fontSize: 14 },
  claimDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
