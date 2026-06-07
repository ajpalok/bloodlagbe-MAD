import { apiClient } from './client';
import type {
  ApiResponse,
  DonorProfile,
  DonorQuestion,
  DonorRequestItem,
  DonorMatchingItem,
} from '@/types';

export const donorApi = {
  /** GET /auth/donor/profile */
  async getProfile() {
    const res = await apiClient.get<ApiResponse<DonorProfile>>('/auth/donor/profile');
    return res.data.messages;
  },

  /** GET /auth/donor/questions?gender=X&age=Y */
  async getQuestions(gender?: string, age?: number) {
    const params: Record<string, unknown> = {};
    if (gender) params.gender = gender;
    if (age) params.age = age;
    const res = await apiClient.get<ApiResponse<{ questions: DonorQuestion[] }>>(
      '/auth/donor/questions',
      { params },
    );
    return res.data.messages;
  },

  /** POST /auth/donor/register */
  async register(bloodGroup: string, responses: Record<string, string>) {
    const res = await apiClient.post<
      ApiResponse<{ blood_group: string; is_eligible: boolean; ineligibility_messages: string[] }>
    >('/auth/donor/register', {
      blood_group: bloodGroup,
      responses,
    });
    return res.data.messages;
  },

  /** PATCH /auth/donor/update */
  async updateScreening(bloodGroup: string, responses: Record<string, string>) {
    const res = await apiClient.patch<ApiResponse>('/auth/donor/update', {
      blood_group: bloodGroup,
      responses,
    });
    return res.data.messages;
  },

  /** GET /auth/donor/requests?status=X&page=Y */
  async getRequests(status: 'all' | 'pending' | 'accepted' | 'rejected' | 'fulfilled' = 'all', page = 1) {
    const res = await apiClient.get<
      ApiResponse<{ requests: DonorRequestItem[]; meta: { current_page: number; last_page: number } }>
    >('/auth/donor/requests', { params: { status, page } });
    return res.data.messages;
  },

  /** GET /auth/donor/matches?page=Y */
  async getMatchingRequests(page = 1) {
    const res = await apiClient.get<
      ApiResponse<{ requests: DonorMatchingItem[]; meta: { current_page: number; last_page: number } }>
    >('/auth/donor/matches', { params: { page } });
    return res.data.messages;
  },

  /** POST /auth/donor/requests/{id}/accept */
  async acceptRequest(requestId: number) {
    const res = await apiClient.post<ApiResponse>(`/auth/donor/requests/${requestId}/accept`);
    return res.data;
  },

  /** POST /auth/donor/requests/{id}/reject */
  async rejectRequest(requestId: number, reason?: string) {
    const res = await apiClient.post<ApiResponse>(`/auth/donor/requests/${requestId}/reject`, { reason });
    return res.data;
  },

  /** POST /auth/donor/requests/{id}/fulfill */
  async fulfillRequest(requestId: number) {
    const res = await apiClient.post<ApiResponse>(`/auth/donor/requests/${requestId}/fulfill`);
    return res.data;
  },
};
