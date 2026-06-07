import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'bl-auth-token';
const DEVICE_TOKEN_KEY = 'bl-device-token';

export const storage = {
  async getAuthToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(AUTH_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async setAuthToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },
  async clearAuthToken(): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
  async getDeviceToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(DEVICE_TOKEN_KEY);
  },
  async setDeviceToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
  },
};
