import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type Locale = 'bn' | 'en';

interface SettingsState {
  locale: Locale;
  loadLocale: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: 'bn',

  async loadLocale() {
    const saved = await AsyncStorage.getItem('bl-locale');
    if (saved === 'bn' || saved === 'en') set({ locale: saved });
  },

  async setLocale(locale) {
    await AsyncStorage.setItem('bl-locale', locale);
    set({ locale });
  },
}));

// Simple translation helper
const strings: Record<string, Record<string, string>> = {
  bn: {
    home: 'হোম',
    myRequests: 'আমার পোস্ট',
    donate: 'রক্তদান',
    profile: 'প্রোফাইল',
    bloodNeeded: 'রক্ত প্রয়োজন',
    urgent: 'জরুরি',
    normal: 'সাধারণ',
    bags: 'ব্যাগ',
    remaining: 'বাকি',
    collected: '১ ব্যাগ পেয়েছি',
    login: 'লগইন',
    logout: 'লগআউট',
    phone: 'ফোন নম্বর',
    sendOtp: 'OTP পাঠান',
    enterOtp: 'OTP লিখুন',
    verify: 'যাচাই করুন',
    onboarding: 'নিবন্ধন',
    firstName: 'প্রথম নাম',
    lastName: 'শেষ নাম',
    bloodGroup: 'রক্তের গ্রুপ',
    gender: 'লিঙ্গ',
    male: 'পুরুষ',
    female: 'মহিলা',
    other: 'অন্যান্য',
    dob: 'জন্ম তারিখ',
    newRequest: 'নতুন পোস্ট',
    noRequests: 'কোনো পোস্ট নেই',
    noDonorRequests: 'কোনো অনুরোধ নেই',
    accept: 'গ্রহণ করুন',
    reject: 'প্রত্যাখ্যান করুন',
    fulfill: 'সম্পন্ন করুন',
    active: 'সক্রিয়',
    completed: 'সম্পন্ন',
    hospital: 'হাসপাতাল',
    district: 'জেলা',
    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    retry: 'আবার চেষ্টা করুন',
    submit: 'জমা দিন',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ করুন',
    notDonor: 'আপনি ডোনার নন',
    registerDonor: 'ডোনার হিসেবে নিবন্ধন করুন',
    pending: 'অপেক্ষারত',
    accepted: 'গৃহীত',
    rejected: 'প্রত্যাখ্যাত',
    fulfilled: 'পূরণ হয়েছে',
    contactInfo: 'যোগাযোগের তথ্য',
    loginRequired: 'এই ফিচার ব্যবহার করতে লগইন করুন',
  },
  en: {
    home: 'Home',
    myRequests: 'My Posts',
    donate: 'Donate',
    profile: 'Profile',
    bloodNeeded: 'Blood Needed',
    urgent: 'Urgent',
    normal: 'Normal',
    bags: 'bags',
    remaining: 'remaining',
    collected: 'Got 1 bag',
    login: 'Login',
    logout: 'Logout',
    phone: 'Phone Number',
    sendOtp: 'Send OTP',
    enterOtp: 'Enter OTP',
    verify: 'Verify',
    onboarding: 'Register',
    firstName: 'First Name',
    lastName: 'Last Name',
    bloodGroup: 'Blood Group',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    dob: 'Date of Birth',
    newRequest: 'New Post',
    noRequests: 'No posts yet',
    noDonorRequests: 'No requests',
    accept: 'Accept',
    reject: 'Reject',
    fulfill: 'Fulfilled',
    active: 'Active',
    completed: 'Completed',
    hospital: 'Hospital',
    district: 'District',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    notDonor: 'You are not a donor',
    registerDonor: 'Register as donor',
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    fulfilled: 'Fulfilled',
    contactInfo: 'Contact Info',
    loginRequired: 'Please login to use this feature',
  },
};

export function t(key: string, locale: Locale = 'bn'): string {
  return strings[locale]?.[key] ?? strings['en']?.[key] ?? key;
}
