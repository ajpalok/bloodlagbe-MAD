import { apiClient } from './client';
import { storage } from '@/lib/storage';
import type { ApiResponse, BloodRequestItem, BloodRequestListResponse } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8000';

export const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const requestsApi = {
  /** Public blood needs feed: GET /blood-requests/needs
   *  Backend returns { donor_needs, districts, summary } — no pagination.
   *  Blood group filtering is done client-side after fetching.
   */
  async getFeed(bloodGroup?: string) {
    const res = await apiClient.get<ApiResponse<{ donor_needs: BloodRequestItem[] }>>('/blood-requests/needs');
    const all: BloodRequestItem[] = res.data.messages?.donor_needs ?? [];
    return bloodGroup ? all.filter(r => r.blood_group === bloodGroup) : all;
  },

  /** Authenticated user's requests: GET /auth/blood-requests */
  async getMyRequests(page = 1, status: 'all' | 'active' | 'completed' = 'all') {
    const res = await apiClient.get<ApiResponse<BloodRequestListResponse>>('/auth/blood-requests', {
      params: { page, status },
    });
    return res.data.messages;
  },

  /** Public detail: GET /blood-requests/{id}
   *  Backend returns { messages: { request: BloodRequestItem } }
   */
  async getDetail(id: number | string) {
    const res = await apiClient.get<ApiResponse<{ request: BloodRequestItem }>>(`/blood-requests/${id}`);
    return res.data.messages?.request ?? null;
  },

  /** Create request: POST /blood-requests (sends device_token in body) */
  async create(data: {
    // Patient
    blood_group: string;
    blood_bags_needed: number;
    gender: 'male' | 'female' | 'other';
    patient_problem: string;
    // Contact
    phone: string;
    phone_secondary?: string;
    fb_id?: string;
    whatsapp?: string;
    telegram?: string;
    // Hospital & location
    hospital_name: string;
    latitude: number;
    longitude: number;
    is_urgent: boolean;
    blood_need_time?: string;
    // Extra
    hemoglobin?: string;
    description?: string;
  }) {
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) {
      throw new Error('Device token not found. Please reload the app.');
    }
    const res = await apiClient.post<ApiResponse<BloodRequestItem>>('/blood-requests', {
      ...data,
      device_token: deviceToken,
    });
    return res.data.messages;
  },

  /** Authenticated bag collection: PATCH /blood-requests/{id} (requires auth.user + ownership) */
  async collectBag(id: number) {
    const res = await apiClient.patch<ApiResponse<{ blood_bags_remaining: number }>>(`/blood-requests/${id}`);
    return res.data.messages;
  },

  /** Device-token bag collection: PATCH /blood-requests/{id}/collect */
  async collectBagByDevice(id: number) {
    const deviceToken = await storage.getDeviceToken();
    const res = await fetch(`${BASE_URL}/api/v1/blood-requests/${id}/collect`, {
      method: 'PATCH',
      headers: {
        'X-Device-Token': deviceToken ?? '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const body = await res.json();
    if (!res.ok) return { ok: false as const, error: body.message ?? 'Collection failed' };
    return { ok: true as const, remaining: body.messages?.blood_bags_remaining as number };
  },

  /** Device's own requests: GET /blood-requests/mine */
  async getDeviceRequests() {
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) return [];
    try {
      const res = await fetch(`${BASE_URL}/api/v1/blood-requests/mine`, {
        headers: { 'X-Device-Token': deviceToken, Accept: 'application/json' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.messages?.requests ?? []) as BloodRequestItem[];
    } catch {
      return [];
    }
  },

  /** Outreach preview: POST /auth/blood-requests/{id}/outreach/preview */
  async previewOutreach(id: number) {
    const res = await apiClient.post<ApiResponse<{ donor_count: number; can_send: boolean }>>(`/auth/blood-requests/${id}/outreach/preview`);
    return res.data.messages;
  },

  /** Outreach send: POST /auth/blood-requests/{id}/outreach/send */
  async sendOutreach(id: number) {
    const res = await apiClient.post<ApiResponse<{ queued: number; already_sent: number }>>(`/auth/blood-requests/${id}/outreach/send`);
    return res.data.messages;
  },
};
