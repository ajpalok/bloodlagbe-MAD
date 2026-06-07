import { apiClient } from './client';
import { storage } from '@/lib/storage';
import type {
  ApiResponse,
  AuthVerifyResponse,
  OtpInitResponse,
  User,
  DonorProfile,
  DonorQuestion,
  Session,
  PostClaimItem,
} from '@/types';

export const authApi = {
  // ── OTP Auth ────────────────────────────────────────────────────────────────
  // IMPORTANT: Device token MUST be sent in request body, not just headers
  // The backend validates device_token from the request body

  async initiate(recipient: string) {
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) {
      throw new Error('Device token not found. Please reload the app.');
    }
    const res = await apiClient.post<ApiResponse<OtpInitResponse>>('/auth/initiate', {
      recipient,
      device_token: deviceToken,
    });
    return res.data.messages;
  },

  async verify(recipient: string, code: string) {
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) {
      throw new Error('Device token not found. Please reload the app.');
    }
    const res = await apiClient.post<ApiResponse<AuthVerifyResponse>>('/auth/verify', {
      recipient,
      code,
      device_token: deviceToken,
    });
    return res.data.messages;
  },

  // ── User Profile ────────────────────────────────────────────────────────────

  async me() {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.messages;
  },

  async updateProfile(data: { first_name?: string; last_name?: string; date_of_birth?: string; gender?: string }) {
    const res = await apiClient.patch<ApiResponse<Record<string, unknown>>>('/auth/profile', data);
    return res.data.messages;
  },

  // ── Onboarding (3 steps) ───────────────────────────────────────────────────

  async saveProfile(data: { first_name: string; last_name?: string; gender: string; date_of_birth: string }) {
    const res = await apiClient.post<ApiResponse<User>>('/auth/onboarding/profile', data);
    return res.data.messages;
  },

  async saveLocation(data: { latitude: number; longitude: number }) {
    const res = await apiClient.post<ApiResponse<User>>('/auth/onboarding/location', data);
    return res.data.messages;
  },

  async completeOnboarding() {
    const res = await apiClient.post<ApiResponse<User>>('/auth/onboarding/complete');
    return res.data.messages;
  },

  // ── Post Claims ─────────────────────────────────────────────────────────────

  async getPostClaims() {
    const res = await apiClient.get<ApiResponse<{ needs_confirmation: PostClaimItem[] }>>('/auth/post-claims');
    return res.data.messages;
  },

  async resolvePostClaims(requestIds: number[], claim: boolean) {
    const res = await apiClient.post<ApiResponse>('/auth/post-claims/resolve', {
      request_ids: requestIds,
      claim,
    });
    return res.data;
  },

  // ── Contacts ────────────────────────────────────────────────────────────────

  async addContact(type: string, value: string) {
    const deviceToken = await storage.getDeviceToken();
    const res = await apiClient.post<ApiResponse<{ verification_id: string; expires_at: string }>>('/auth/contacts/add', {
      type,
      value,
      device_token: deviceToken,
    });
    return res.data.messages;
  },

  async verifyContact(verificationId: string, code: string) {
    const deviceToken = await storage.getDeviceToken();
    const res = await apiClient.post<ApiResponse<{ id: number; type: string; value: string }>>('/auth/contacts/verify', {
      verification_id: verificationId,
      code,
      device_token: deviceToken,
    });
    return res.data.messages;
  },

  async removeContact(contactId: number) {
    const res = await apiClient.delete<ApiResponse>(`/auth/contacts/${contactId}`);
    return res.data;
  },

  // ── Donor ───────────────────────────────────────────────────────────────────

  async getDonorQuestions(gender?: string, age?: number) {
    const params: Record<string, unknown> = {};
    if (gender) params.gender = gender;
    if (age) params.age = age;
    const res = await apiClient.get<ApiResponse<{ questions: DonorQuestion[] }>>('/auth/donor/questions', { params });
    return res.data.messages;
  },

  async registerAsDonor(bloodGroup: string, responses: Record<string, string>) {
    const res = await apiClient.post<ApiResponse<{ blood_group: string; is_eligible: boolean; ineligibility_messages: string[] }>>('/auth/donor/register', {
      blood_group: bloodGroup,
      responses,
    });
    return res.data.messages;
  },

  async updateDonorScreening(bloodGroup: string, responses: Record<string, string>) {
    const res = await apiClient.patch<ApiResponse>('/auth/donor/update', {
      blood_group: bloodGroup,
      responses,
    });
    return res.data.messages;
  },

  async getDonorProfile() {
    const res = await apiClient.get<ApiResponse<DonorProfile>>('/auth/donor/profile');
    return res.data.messages;
  },

  // ── Settings ────────────────────────────────────────────────────────────────

  async updateSettings(data: Record<string, unknown>) {
    const res = await apiClient.patch<ApiResponse>('/auth/settings', data);
    return res.data.messages;
  },

  async pauseNotifications() {
    const res = await apiClient.post<ApiResponse>('/auth/settings/pause-notifications');
    return res.data.messages;
  },

  async resumeNotifications() {
    const res = await apiClient.post<ApiResponse>('/auth/settings/resume-notifications');
    return res.data.messages;
  },

  // ── Sessions ────────────────────────────────────────────────────────────────

  async getSessions() {
    const res = await apiClient.get<ApiResponse<{ sessions: Session[] }>>('/auth/sessions');
    return res.data.messages;
  },

  async terminateSession(sessionId: number) {
    const res = await apiClient.delete<ApiResponse>(`/auth/sessions/${sessionId}`);
    return res.data;
  },

  async terminateAllSessions() {
    const res = await apiClient.delete<ApiResponse>('/auth/sessions');
    return res.data;
  },

  // ── Logout ──────────────────────────────────────────────────────────────────

  async logout() {
    await apiClient.delete('/auth/session').catch(() => {});
  },
};
