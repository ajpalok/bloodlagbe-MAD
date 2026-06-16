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
    // Tab labels
    home: 'হোম',
    myRequests: 'আমার পোস্ট',
    donate: 'রক্তদান',
    profile: 'প্রোফাইল',

    // Auth
    sendOtp: 'OTP পাঠান',
    enterOtp: 'OTP লিখুন',
    verify: 'যাচাই করুন',
    otpVerify: 'OTP যাচাই',
    otpSentTo: 'তে পাঠানো ৬ সংখ্যার OTP দিন',
    resendOtp: 'পুনরায় OTP পাঠান',
    resendIn: 'পুনরায় পাঠান',
    onboarding: 'নিবন্ধন',
    login: 'লগইন',
    logout: 'লগআউট',

    // Navigation
    back: 'ফিরে যান',
    prev: 'পিছনে',
    next: 'পরবর্তী',

    // Common
    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    retry: 'আবার চেষ্টা করুন',
    submit: 'জমা দিন',
    cancel: 'বাতিল',
    save: 'সংরক্ষণ করুন',
    yes: 'হ্যাঁ',
    no: 'না',
    active: 'সক্রিয়',
    completed: 'সম্পন্ন',
    urgent: 'জরুরি',
    normal: 'সাধারণ',

    // Blood / requests
    bloodNeeded: 'রক্ত প্রয়োজন',
    bags: 'ব্যাগ',
    remaining: 'বাকি',
    collected: '১ ব্যাগ পেয়েছি',
    newRequest: 'নতুন পোস্ট',
    newPost: '+ নতুন',
    noRequests: 'কোনো পোস্ট নেই',
    bloodPost: 'রক্তের পোস্ট',

    // Donate screen
    inbox: 'ইনবক্স',
    matchingPosts: 'ম্যাচিং পোস্ট',
    noDonorRequests: 'কোনো অনুরোধ নেই',
    noMatchingPosts: 'আপনার গ্রুপের কোনো পোস্ট নেই',
    notDonor: 'আপনি ডোনার নন',
    registerDonor: 'ডোনার হিসেবে নিবন্ধন করুন',
    donorRegDesc: 'ডোনার হিসেবে নিবন্ধন করুন এবং রক্তের প্রয়োজনে মানুষকে সাহায্য করুন।',

    // Profile / donor
    phone: 'ফোন নম্বর',
    bloodGroup: 'রক্তের গ্রুপ',
    gender: 'লিঙ্গ',
    male: 'পুরুষ',
    female: 'মহিলা',
    other: 'অন্যান্য',
    dob: 'জন্ম তারিখ',
    firstName: 'প্রথম নাম',
    lastName: 'শেষ নাম',
    hospital: 'হাসপাতাল',
    district: 'জেলা',
    contactInfo: 'যোগাযোগের তথ্য',
    loginRequired: 'এই ফিচার ব্যবহার করতে লগইন করুন',
    profileLoginRequired: 'প্রোফাইল ও সেটিংস দেখতে লগইন করুন।',

    // Profile screen
    editProfile: 'প্রোফাইল সম্পাদনা',
    edit: 'সম্পাদনা',
    saveChanges: 'সংরক্ষণ করুন',
    dobFormat: 'জন্ম তারিখ (YYYY-MM-DD)',
    success: 'সফল',
    profileUpdated: 'প্রোফাইল আপডেট হয়েছে',
    profileUpdateFailed: 'আপডেট করা যায়নি',
    contactMethods: 'যোগাযোগ পদ্ধতি',
    addContactBtn: '+ যোগ',
    bloodDonor: 'রক্তদাতা',
    joinAsDonor: 'ডোনার হিসেবে যোগ দিন',
    donorJoinDesc: 'রক্তদাতা হিসেবে নিবন্ধন করুন এবং রক্তের প্রয়োজনে পাশে থাকুন।',
    languageSection: 'ভাষা',
    sessions: 'সেশন',
    manageSessions: 'সেশন ম্যানেজ করুন',
    isDonorYes: '✓ হ্যাঁ',
    isDonorNo: '✗ না',
    division: 'বিভাগ',
    donor: 'ডোনার',
    primaryBadge: 'প্রাথমিক',
    verifiedBadge: '✓ যাচাইকৃত',
    unverifiedBadge: 'অযাচাইকৃত',
    noContacts: 'কোনো যোগাযোগ পদ্ধতি নেই',
    confirmTitle: 'নিশ্চিত করুন',
    removeContactConfirm: 'এই যোগাযোগ পদ্ধতি মুছে ফেলতে চান?',
    deleteBtn: 'মুছুন',
    logoutConfirmMsg: 'আপনি কি লগআউট করতে চান?',

    // Donor registration modal
    donorRegistration: 'ডোনার নিবন্ধন',
    bloodGroupLabel: 'রক্তের গ্রুপ *',
    screeningQuestions: 'স্ক্রিনিং প্রশ্ন',
    registerBtn: 'নিবন্ধন করুন',
    selectBloodGroup: 'রক্তের গ্রুপ নির্বাচন করুন।',
    ineligibleTitle: 'অযোগ্য',
    ineligibleMsg: 'আপনার উত্তরের ভিত্তিতে আপনি এখন রক্তদানের জন্য যোগ্য নন।',
    donorRegistered: 'ডোনার হিসেবে নিবন্ধিত হয়েছেন!',
    registrationFailed: 'নিবন্ধন করা যায়নি',

    // Add contact modal
    addContactTitle: 'যোগাযোগ যোগ করুন',
    phoneLabel: 'ফোন নম্বর',
    emailLabel: 'ইমেইল',
    sendOtpBtn: 'OTP পাঠান',
    otpCode: 'OTP কোড',
    contactAdded: 'যোগাযোগ পদ্ধতি যোগ হয়েছে',
    otpSendFailed: 'OTP পাঠানো যায়নি',
    verifyFailed: 'যাচাই করা যায়নি',

    // Session manager
    sessionManager: 'সেশন ম্যানেজার',
    unknownDevice: 'অজানা ডিভাইস',
    currentSession: 'বর্তমান',
    closeSession: 'বন্ধ করুন',
    closeAllSessions: 'অন্য সব সেশন বন্ধ করুন',
    sessionCloseFailed: 'সেশন বন্ধ করা যায়নি',
    confirmCloseAll: 'সব সেশন বন্ধ করতে চান?',

    // Donor settings section
    donorInfo: 'ডোনার তথ্য',
    eligible: '✓ যোগ্য',
    ineligible: '✗ অযোগ্য',
    activeDonor: 'সক্রিয়',
    inactiveDonor: 'নিষ্ক্রিয়',
    totalDonationsLabel: 'মোট রক্তদান:',
    timesUnit: 'বার',
    lastDonatedLabel: 'সর্বশেষ:',
    privacySettings: 'গোপনীয়তা সেটিংস',
    profilePublic: 'প্রোফাইল পাবলিক',
    showBloodGroup: 'রক্তের গ্রুপ দেখান',
    showLocation: 'অবস্থান দেখান',
    showDonationCount: 'রক্তদানের সংখ্যা দেখান',
    settingUpdateFailed: 'সেটিং আপডেট করা যায়নি',

    // Donor request statuses
    pending: 'অপেক্ষারত',
    accepted: 'গৃহীত',
    rejected: 'প্রত্যাখ্যাত',
    fulfilled: 'পূরণ হয়েছে',
    accept: 'গ্রহণ করুন',
    reject: 'প্রত্যাখ্যান করুন',
    fulfillAction: 'রক্তদান সম্পন্ন',
  },
  en: {
    // Tab labels
    home: 'Home',
    myRequests: 'My Posts',
    donate: 'Donate',
    profile: 'Profile',

    // Auth
    sendOtp: 'Send OTP',
    enterOtp: 'Enter OTP',
    verify: 'Verify',
    otpVerify: 'Verify OTP',
    otpSentTo: 'Enter the 6-digit OTP sent to',
    resendOtp: 'Resend OTP',
    resendIn: 'Resend in',
    onboarding: 'Register',
    login: 'Login',
    logout: 'Logout',

    // Navigation
    back: 'Go Back',
    prev: 'Back',
    next: 'Next',

    // Common
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    yes: 'Yes',
    no: 'No',
    active: 'Active',
    completed: 'Completed',
    urgent: 'Urgent',
    normal: 'Normal',

    // Blood / requests
    bloodNeeded: 'Blood Needed',
    bags: 'bags',
    remaining: 'remaining',
    collected: 'Got 1 bag',
    newRequest: 'New Post',
    newPost: '+ New',
    noRequests: 'No posts yet',
    bloodPost: 'Blood Request',

    // Donate screen
    inbox: 'Inbox',
    matchingPosts: 'Matching Posts',
    noDonorRequests: 'No requests',
    noMatchingPosts: 'No posts match your blood group',
    notDonor: 'You are not a donor',
    registerDonor: 'Register as a donor',
    donorRegDesc: 'Register as a donor and help people in need of blood.',

    // Profile / donor
    phone: 'Phone Number',
    bloodGroup: 'Blood Group',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    dob: 'Date of Birth',
    firstName: 'First Name',
    lastName: 'Last Name',
    hospital: 'Hospital',
    district: 'District',
    contactInfo: 'Contact Info',
    loginRequired: 'Please login to use this feature',
    profileLoginRequired: 'Login to view profile and settings.',

    // Profile screen
    editProfile: 'Edit Profile',
    edit: 'Edit',
    saveChanges: 'Save Changes',
    dobFormat: 'Date of Birth (YYYY-MM-DD)',
    success: 'Success',
    profileUpdated: 'Profile updated',
    profileUpdateFailed: 'Could not update',
    contactMethods: 'Contact Methods',
    addContactBtn: '+ Add',
    bloodDonor: 'Blood Donor',
    joinAsDonor: 'Join as Donor',
    donorJoinDesc: 'Register as a blood donor and be there when someone needs you.',
    languageSection: 'Language',
    sessions: 'Sessions',
    manageSessions: 'Manage Sessions',
    isDonorYes: '✓ Yes',
    isDonorNo: '✗ No',
    division: 'Division',
    donor: 'Donor',
    primaryBadge: 'Primary',
    verifiedBadge: '✓ Verified',
    unverifiedBadge: 'Unverified',
    noContacts: 'No contact methods',
    confirmTitle: 'Confirm',
    removeContactConfirm: 'Remove this contact method?',
    deleteBtn: 'Delete',
    logoutConfirmMsg: 'Are you sure you want to logout?',

    // Donor registration modal
    donorRegistration: 'Donor Registration',
    bloodGroupLabel: 'Blood Group *',
    screeningQuestions: 'Screening Questions',
    registerBtn: 'Register',
    selectBloodGroup: 'Please select a blood group.',
    ineligibleTitle: 'Ineligible',
    ineligibleMsg: 'Based on your answers, you are not eligible to donate blood right now.',
    donorRegistered: 'You are now registered as a donor!',
    registrationFailed: 'Registration failed',

    // Add contact modal
    addContactTitle: 'Add Contact',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email',
    sendOtpBtn: 'Send OTP',
    otpCode: 'OTP Code',
    contactAdded: 'Contact method added',
    otpSendFailed: 'Could not send OTP',
    verifyFailed: 'Verification failed',

    // Session manager
    sessionManager: 'Session Manager',
    unknownDevice: 'Unknown device',
    currentSession: 'Current',
    closeSession: 'Close',
    closeAllSessions: 'Close All Other Sessions',
    sessionCloseFailed: 'Could not close session',
    confirmCloseAll: 'Close all sessions?',

    // Donor settings section
    donorInfo: 'Donor Info',
    eligible: '✓ Eligible',
    ineligible: '✗ Ineligible',
    activeDonor: 'Active',
    inactiveDonor: 'Inactive',
    totalDonationsLabel: 'Total donations:',
    timesUnit: 'times',
    lastDonatedLabel: 'Last donated:',
    privacySettings: 'Privacy Settings',
    profilePublic: 'Public Profile',
    showBloodGroup: 'Show Blood Group',
    showLocation: 'Show Location',
    showDonationCount: 'Show Donation Count',
    settingUpdateFailed: 'Could not update setting',

    // Donor request statuses
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    fulfilled: 'Fulfilled',
    accept: 'Accept',
    reject: 'Reject',
    fulfillAction: 'Donation Done',
  },
};

export function t(key: string, locale: Locale = 'bn'): string {
  return strings[locale]?.[key] ?? strings['en']?.[key] ?? key;
}
