/**
 * Device identification for mobile.
 *
 * Mirrors the web frontend's deviceIdentify.ts:
 * - Collects device info
 * - Calls POST /api/v1/device/identify on the backend
 * - Backend returns an encrypted device token
 * - We store that token and send it as X-Device-Token on all API calls
 */
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform, Dimensions } from 'react-native';
import { storage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8000';

interface DevicePayload {
  device_token?: string;
  device_identifier?: string;
  platform: string;
  browser: string;
  os: string;
  timezone: string;
  language: string;
  screen_resolution?: string;
  user_agent: string;
}

function buildPayload(existingToken: string | null): DevicePayload {
  const { width, height } = Dimensions.get('screen');
  const deviceName = Device.deviceName ?? Device.modelName ?? 'Unknown';
  const osName = Device.osName ?? Platform.OS;
  const osVersion = Device.osVersion ?? String(Platform.Version ?? '');
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';

  const userAgent = `BloodLagbe/${appVersion} (${osName} ${osVersion}; ${Device.modelName ?? 'Unknown'})`;

  // Map Expo/RN platform to the values the backend accepts: web | ios | android | desktop
  const platformValue = Platform.OS === 'ios'     ? 'ios'
    : Platform.OS === 'android' ? 'android'
    : Platform.OS === 'web'     ? 'web'
    : 'android'; // fallback

  // Only include screen_resolution if dimensions are valid numbers
  const w = Math.round(width);
  const h = Math.round(height);
  const screenResolution = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
    ? `${w}x${h}`
    : undefined;

  const payload: DevicePayload = {
    platform: platformValue,
    browser: `BloodLagbe-RN/${appVersion}`,
    os: `${osName} ${osVersion}`.trim(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'bn',
    user_agent: userAgent.slice(0, 512),
    device_identifier: `${deviceName}-${Device.modelName ?? ''}-${Device.brand ?? ''}`.slice(0, 255),
  };

  if (screenResolution) {
    payload.screen_resolution = screenResolution;
  }

  if (existingToken) {
    payload.device_token = existingToken;
  }

  return payload;
}

/**
 * Fetch with a manual timeout using AbortController.
 * More compatible than AbortSignal.timeout() across Hermes/Expo versions.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Identify this device with the backend.
 * Stores the backend-assigned encrypted token to SecureStore.
 * Returns true on success, false on failure.
 */
export async function identifyDevice(): Promise<boolean> {
  if (!BASE_URL) {
    console.warn('[Device] BASE_URL not configured, skipping device identification');
    return false;
  }

  console.log('[Device] Starting device identification...');

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[Device] Attempt ${attempt} of 2`);
      const existingToken = await storage.getDeviceToken();
      const payload = buildPayload(existingToken);

      console.log('[Device] Sending identify request to:', `${BASE_URL}/api/v1/device/identify`);
      const res = await fetchWithTimeout(
        `${BASE_URL}/api/v1/device/identify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        },
        8000, // 8 second timeout
      );

      console.log(`[Device] Response status: ${res.status}`);

      if (!res.ok) {
        const errorBody = await res.text();
        console.warn(`[Device] Attempt ${attempt} failed: ${res.status} - ${errorBody}`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        return false;
      }

      const data = await res.json();
      const token = data?.messages?.device_token;

      if (token) {
        await storage.setDeviceToken(token);
        console.log('[Device] Successfully identified device and stored token');
        return true;
      }

      console.warn('[Device] No device_token in response:', JSON.stringify(data));
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Device] Attempt ${attempt} error: ${msg}`);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return false;
    }
  }

  return false;
}

/**
 * Returns the encrypted device token assigned by the backend, or null if not yet identified.
 */
export async function getDeviceToken(): Promise<string | null> {
  return storage.getDeviceToken();
}
