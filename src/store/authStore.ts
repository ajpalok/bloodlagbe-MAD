import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  jwt: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  jwt: null,
  isInitialized: false,
  isAuthenticated: false,

  async initialize() {
    const token = await storage.getAuthToken();
    if (token) {
      try {
        const user = await authApi.me();
        set({ jwt: token, user, isAuthenticated: true, isInitialized: true });
      } catch {
        await storage.clearAuthToken();
        set({ jwt: null, user: null, isAuthenticated: false, isInitialized: true });
      }
    } else {
      set({ isInitialized: true, isAuthenticated: false });
    }
  },

  async setAuth(token, user) {
    await storage.setAuthToken(token);
    set({ jwt: token, user, isAuthenticated: true });
  },

  async clearAuth() {
    await authApi.logout();
    await storage.clearAuthToken();
    set({ jwt: null, user: null, isAuthenticated: false });
  },

  async refreshUser() {
    const user = await authApi.me();
    set({ user });
  },
}));
