// ─── API Envelope ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = Record<string, unknown>> {
  code: number;
  status: string;
  message: string;
  messages: T;
}

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  uuid: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  division: string | null;
  onboarding_complete: boolean;
  is_donor: boolean;
  contact_methods: ContactMethod[];
}

export interface ContactMethod {
  id: number;
  type: 'email' | 'phone';
  value: string;
  is_primary: boolean;
  verified_at: string | null;
}

export interface OtpInitResponse {
  is_new_user: boolean;
  recipient_type: 'phone' | 'email';
  verification_id: string;
  expires_at: string;
  can_resend_at: string;
}

export interface AuthVerifyResponse {
  token: string;
  is_new_user: boolean;
  onboarding_complete: boolean;
  user_uuid: string;
}

// ─── Blood Requests ───────────────────────────────────────────────────────────

export interface BloodRequestItem {
  id: number;
  blood_group: string;
  blood_bags_needed: number;
  blood_bags_remaining: number;
  hospital_name: string;
  hospital_address?: string;
  district: string | null;
  division: string | null;
  is_urgent: boolean;
  blood_need_time: string | null;
  description: string | null;
  patient_problem: string | null;
  hemoglobin: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_methods?: {
    can_contact: boolean;
    phone_count: number;
    has_whatsapp: boolean;
    has_telegram: boolean;
    has_facebook: boolean;
  };
  created_at: string;
  updated_at: string;
  is_mine?: boolean;
  is_mine_as_user?: boolean;
  _auth?: 'user' | 'device' | null;
}

export interface BloodRequestListResponse {
  requests: BloodRequestItem[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}

// ─── Donor ────────────────────────────────────────────────────────────────────

export interface DonorRequestItem {
  request_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'fulfilled';
  highlight: boolean;
  requested_at: string;
  lock_until: string | null;
  blood_group: string;
  hospital_name: string;
  district: string;
  blood_bags_remaining: number;
  blood_need_time: string | null;
  description: string | null;
  patient_problem: string | null;
}

export interface DonorMatchingItem {
  id: number;
  blood_group: string;
  blood_bags_remaining: number;
  blood_bags_needed: number;
  hospital_name: string;
  district: string | null;
  division: string | null;
  is_urgent: boolean;
  blood_need_time: string | null;
  description: string | null;
  patient_problem: string | null;
  created_at: string;
  requester_name: string;
}

export interface DonorProfile {
  blood_group: string;
  is_eligible: boolean;
  is_active: boolean;
  last_donated_at: string | null;
  total_donations: number;
  weight_kg: number | null;
  pause_notifications_until: string | null;
  is_profile_public: boolean;
  show_blood_group: boolean;
  show_location: boolean;
  show_donation_count: boolean;
  show_last_donated_at: boolean;
  screening_questions: DonorQuestion[];
  screening_responses: Record<string, string>;
}

export interface DonorQuestion {
  id: number;
  question_bn: string;
  question_en: string;
  type: string;
  options: string[] | null;
  gender: string | null;
  min_age: number | null;
  max_age: number | null;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: number;
  device_name: string;
  ip_address: string;
  last_active_at: string;
  is_current: boolean;
}

// ─── Post Claims ──────────────────────────────────────────────────────────────

export interface PostClaimItem {
  id: number;
  blood_group: string;
  hospital_name: string;
  created_at: string;
}
