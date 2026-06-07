import axios from 'axios';
import { storage } from '@/lib/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const [authToken, deviceToken] = await Promise.all([
    storage.getAuthToken(),
    storage.getDeviceToken(),
  ]);
  if (authToken) config.headers['X-Auth-Token'] = authToken;
  if (deviceToken) config.headers['X-Device-Token'] = deviceToken;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      storage.clearAuthToken();
    }
    return Promise.reject(error);
  }
);
