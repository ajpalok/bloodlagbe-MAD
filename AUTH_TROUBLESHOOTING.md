# Mobile App Authentication Troubleshooting Guide

## Common Issues and Solutions

### Error: 422 Unprocessable Content on `/auth/initiate`

**Symptom**: Login screen shows error after entering phone/email

**Root Cause**: The backend is rejecting the request because it's missing the `device_token` in the request body.

**Why This Happens**:
- Device identification hasn't completed before user attempts login
- Device token wasn't stored properly
- Device token wasn't included in the request body

**Root Cause Analysis (v2.0 Fix)**:
Previously, the app would allow users to navigate to the login screen while device identification was still in progress. The fix ensures:
- ✅ Device identification MUST complete before the login screen appears
- ✅ The splash screen stays visible until device token is stored
- ✅ Device token is guaranteed to be available when user tries to login

**Solution**:

1. **Ensure Device Token is in Request Body** ✅
   - The mobile app includes `device_token` in the POST body for auth requests
   - Endpoints that need it: `/auth/initiate`, `/auth/verify`
   - The axios interceptor ALSO sends it as `X-Device-Token` header for all requests

2. **Verify Device Identification Completes** ✅
   - Device identification happens automatically in `app/_layout.tsx` during app bootstrap
   - The app waits for device identification to complete before showing the login screen
   - Check browser console (if using Expo web) for: `[Device] Successfully identified device and stored token`
   - The splash screen will hide after device identification succeeds

3. **Clear Storage and Reload the App**
   - Close the app completely (swipe away or kill process)
   - For native apps: uninstall and reinstall to clear SecureStore
   - For Expo web: open DevTools → Application → Storage → clear Local Storage
   - Reopen the app - this will trigger fresh device identification
   - Device identification retries up to 2 times on failure

### App Bootstrap Sequence (v2.0)

The app now ensures device identification completes before the user can login:

```
App Starts
  ↓
SplashScreen.preventAutoHideAsync() → Splash screen stays visible
  ↓
AppBootstrap runs in parallel:
  ├─ auth initialization (fetch stored JWT, restore session if exists)
  ├─ locale loading (load user's language preference)
  └─ [NOT YET] device identification
  ↓
Once auth + locale complete, device identification begins
  ↓
Fetch device info (Device.modelName, OS, app version, etc.)
  ↓
POST /api/v1/device/identify with device details
  ↓
Backend generates UUID and encrypts it
  ↓
Returns encrypted device_token in response.messages.device_token
  ↓
App stores device_token in SecureStore (native) or AsyncStorage (web)
  ↓
SplashScreen.hideAsync() → Splash screen disappears
  ↓
AppBootstrap sets isDeviceIdentified = true
  ↓
App renders (login screen or dashboard)
  ↓
Device token is guaranteed available for auth requests
```

**Key Timing Guarantees**:
- ✅ Splash screen stays visible during device identification
- ✅ App won't render until device_token is stored
- ✅ User sees login screen only when device is ready
- ✅ First login attempt will have device_token available

### How Device Identification Works (Technical Details)

1. **Device Info Collection** (in `src/lib/device.ts`):
   - Collect device model, OS version, app version
   - Build device identifier and user agent string
   - Include existing device_token if already stored

2. **Backend Device Creation**:
   - POST to `/api/v1/device/identify` with device payload
   - Backend looks up or creates device record in `device_details` table
   - Generates UUID `encrypt($uuid)` for this device
   - Returns encrypted token in `response.messages.device_token`

3. **Token Storage & Availability**:
   - App stores token using `storage.setDeviceToken()`
   - Native apps: SecureStore (encrypted by OS)
   - Web: AsyncStorage (browser storage)
   - Token persists across app sessions
   - Available immediately for auth requests

## Auth Flow with Device Token

### Step 1: User Enters Phone/Email and Taps "OTP পাঠান"

```javascript
// app/(auth)/login.tsx
await authApi.initiate(trimmed); // trimmed = "01XXXXXXXXX" or "email@example.com"
```

**What Happens**:
1. Get device_token from storage
2. Send POST `/auth/initiate` with:
   ```json
   {
     "recipient": "01XXXXXXXXX",
     "device_token": "encrypted_token_from_backend"
   }
   ```
3. Backend validates device_token by decrypting it and looking up the device
4. If device_token is invalid or missing → 422 error

### Step 2: User Receives OTP and Enters Code

```javascript
// app/(auth)/verify.tsx
await authApi.verify(contact, code);
```

**What Happens**:
1. Get device_token from storage
2. Send POST `/auth/verify` with:
   ```json
   {
     "recipient": "01XXXXXXXXX",
     "code": "123456",
     "device_token": "encrypted_token_from_backend"
   }
   ```
3. Backend validates device_token and OTP code
4. Returns JWT token for authenticated requests

### Step 3: Subsequent Requests Include Both Tokens

**HTTP Headers** (set by axios interceptor):
```
X-Auth-Token: eyJhbGc...JWT_TOKEN...
X-Device-Token: encrypted_device_token_here
```

**Request Body** (for endpoints that need it):
```json
{
  "blood_group": "O+",
  "device_token": "encrypted_device_token_here"
}
```

## Required Environment Setup

### Mobile App Configuration

`.env` file (or environment variables):
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
# For production:
EXPO_PUBLIC_API_BASE_URL=https://bloodlagbe_api.2haas.com
```

### Backend Configuration

`.env` file:
```env
# Must support mobile origins
ALLOWED_FRONTEND_ORIGINS=http://localhost:4321,http://localhost:8081,https://bloodlagbe.2haas.com
```

## Testing Device Token Flow

### 1. Check Device Token is Stored

**In Expo web**:
- Open DevTools → Application → Local Storage
- Look for `bl-device-token` entry
- Should contain a long encrypted string

**In native app**:
- Use Xcode (iOS) or Android Studio debugger
- Check SecureStore for `bl-device-token`

### 2. Check Device Token is Sent

**In Expo web**:
- Open DevTools → Network tab
- Make a request to `/auth/initiate`
- Check Request body: should have `device_token` field
- Check Headers: should have `X-Device-Token: ...`

### 3. Check Backend Receives Token

**Run backend in debug mode**:
```bash
php artisan serve --debug
```

**Look for logs**:
```
[2026-05-14 10:30:45] local.DEBUG: Device identification
[2026-05-14 10:30:46] local.DEBUG: Device token created: xyz...
```

## Common Scenarios

### Scenario 1: First-Time App Launch
1. App boots → `AppBootstrap` calls `identifyDevice()`
2. Backend creates device in `device_details` table
3. Device token stored in SecureStore
4. User opens login screen → device token available
5. User can login ✅

### Scenario 2: Device Token Expires or Lost
1. SecureStore cleared (app reinstall or storage loss)
2. User opens app → `identifyDevice()` called again
3. Backend creates new device
4. New device token stored
5. User can login ✅

### Scenario 3: Network Error During Device Identification
1. `identifyDevice()` tries to reach backend
2. Network error or timeout
3. Device identification fails silently (non-critical)
4. User tries to login → gets "Device token not found" error
5. **Solution**: Close and reopen app (retry logic will try again)

### Scenario 4: Backend Changed API
1. Device identification succeeds
2. `/auth/initiate` response structure changed
3. App can't parse `response.messages.device_token`
4. Token not stored
5. **Solution**: Check backend response format matches expected

## Code Changes Summary

### v2.0 (CURRENT FIX - Device Identification Timing)

**Problem Solved**: Device identification was running in parallel with auth initialization, allowing users to reach the login screen before device_token was stored.

**Changes**:

#### `app/_layout.tsx`
- ✅ Added `isDeviceIdentified` state to track device identification completion
- ✅ Changed bootstrap sequence: run auth+locale first, THEN device identification
- ✅ App only renders when BOTH `isInitialized` AND `isDeviceIdentified` are true
- ✅ Device identification must complete before user sees any screen
- ✅ Splash screen stays visible during device identification

#### `src/lib/device.ts`
- ✅ Enhanced logging to track each step of device identification
- ✅ Log BASE_URL configuration check
- ✅ Log attempt number and response status
- ✅ Log token reception and storage
- ✅ Log detailed error messages for debugging

### v1.0 (Initial Fix - Request Body)

#### `src/lib/device.ts`
- ✅ Added retry logic (2 attempts)
- ✅ Added timeout (5 seconds)
- ✅ Added console logging for debugging
- ✅ Improved error handling

#### `src/api/auth.ts`
- ✅ Added validation: device_token must exist before auth calls
- ✅ Added helpful error messages
- ✅ Ensured device_token sent in request body

#### `src/api/requests.ts`
- ✅ Added validation: device_token must exist for create requests
- ✅ Ensured device_token sent in request body

#### `app/(auth)/login.tsx`
- ✅ Better error messages for device token issues
- ✅ Handles "Device token not found" errors

## Debug Logging (v2.0)

The app now includes comprehensive device identification logging. Check the console for these messages:

**Successful Device Identification**:
```
[Device] Starting device identification...
[Device] Attempt 1 of 2
[Device] Sending identify request to: http://10.0.2.2:8000/api/v1/device/identify
[Device] Response status: 200
[Device] Response received: {messages: {device_token: "..."}}
[Device] Token received, storing...
[Device] Successfully identified device and stored token
```

**Network Error During Identification**:
```
[Device] Attempt 1 of 2
[Device] Sending identify request to: http://10.0.2.2:8000/api/v1/device/identify
[Device] Request failed: Error: Device identification failed: 500 Internal Server Error
[Device] Retrying on first failure...
[Device] Attempt 2 of 2
```

**No Backend URL**:
```
[Device] BASE_URL not configured, skipping device identification
```

### How to View Logs

**In Expo web** (browser):
- Press `Cmd+J` (Mac) or `Ctrl+J` (Windows/Linux) to open DevTools
- Go to the "Console" tab
- Look for messages starting with `[Device]`

**In native app** (iOS):
- Use Xcode Console: Xcode → Window → Devices and Simulators → Console
- Filter for `[Device]` messages

**In native app** (Android):
- Use Android Studio Logcat: Android Studio → View → Tool Windows → Logcat
- Filter for `[Device]` messages

### Additional API Call Logging

To enable detailed logging of all API calls, add this to your app bootstrap:

```typescript
// app/_layout.tsx - inside AppBootstrap or RootLayout useEffect
if (__DEV__) {
  // Log all API calls
  apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data?.device_token) {
      console.log(`[API] Device token: ${config.data.device_token.substring(0, 20)}...`);
    }
    return config;
  });
  
  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[API] Response ${response.status}:`, response.data);
      return response;
    },
    (error) => {
      console.error(`[API] Error ${error.response?.status}:`, error.response?.data);
      return Promise.reject(error);
    }
  );
}
```

## Still Having Issues? (v2.0 Troubleshooting)

### Step 1: Check Splash Screen Timing
1. Close the app completely
2. Reopen the app
3. **Watch the splash screen duration** - it should be visible for 2-5 seconds while device identification completes
4. If splash screen closes immediately, device identification may have failed silently

### Step 2: Check Device Identification Logs
1. Open the app and keep the browser DevTools (or native debugger) open
2. Look for `[Device]` prefixed messages in the console
3. **Expected log sequence**:
   ```
   [Device] Starting device identification...
   [Device] Attempt 1 of 2
   [Device] Sending identify request to: http://10.0.2.2:8000/api/v1/device/identify
   [Device] Response status: 200
   [Device] Successfully identified device and stored token
   ```

### Step 3: Diagnose Common Issues

**If you see**: `[Device] BASE_URL not configured, skipping device identification`
- ✅ Device identification is optional (app will still work)
- Check if `EXPO_PUBLIC_API_BASE_URL` is set in your `.env`

**If you see**: `[Device] Request failed: 404 Not Found`
- ❌ Backend doesn't have `/api/v1/device/identify` endpoint
- Verify backend is running and API is accessible
- Check `EXPO_PUBLIC_API_BASE_URL` is correct (e.g., `http://10.0.2.2:8000` for Android emulator)

**If you see**: `[Device] Request failed: 500 Internal Server Error`
- ❌ Backend error during device identification
- Check backend logs: `php artisan serve --debug`
- Verify database is accessible
- Look for errors in `storage/logs/laravel-*.log`

**If you see**: `[Device] No device token in response`
- ❌ Backend responded but didn't return device_token
- Check backend response format in logs
- Verify `DeviceController::identify()` is returning correct response structure

**If device identification fails completely**:
- Attempt 1 fails → app retries
- Attempt 2 fails → app shows login screen anyway (device identification is non-critical)
- User will get 422 error on login if device_token is still missing

### Step 4: Nuclear Option - Clear Everything

1. **For Expo web**:
   - Open DevTools → Application → Storage
   - Delete `bl-device-token` from Local Storage
   - Delete `bl-auth-token` from Local Storage
   - Refresh the page
   - Device identification will run again

2. **For native app**:
   - Uninstall the app completely
   - Reinstall (fresh build)
   - App will go through device identification on first launch
   - SecureStore will be empty, no cached tokens

3. **Backend** (if needed):
   - Check `php artisan tinker` → `DB::table('device_details')->count()`
   - Clear device table if corrupted: `DB::table('device_details')->truncate()`
   - Device identification will create new records on next app startup

### Step 5: Enable API Call Logging

Add this to `app/_layout.tsx` in the AppBootstrap useEffect to see all API calls:

```typescript
if (__DEV__) {
  apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
  
  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[API] ${response.status}`, response.data);
      return response;
    },
    (error) => {
      console.error(`[API] ${error.response?.status}`, error.response?.data);
      return Promise.reject(error);
    }
  );
}
```

### Step 6: Contact Support with Logs

If still having issues, collect:
1. Full console output (all `[Device]` and `[API]` messages)
2. Backend logs: `tail -f storage/logs/laravel-*.log`
3. Backend request details: response status, response body
4. `.env` configuration (without secrets): API_BASE_URL setting
5. Device type: native iOS, native Android, or Expo web

## References

- [Device Identification Flow](./src/lib/device.ts)
- [Auth API Documentation](./src/api/auth.ts)
- [CORS Configuration](../backend/CORS_MOBILE_SETUP.md)
- [Backend Auth Endpoints](../backend/app/Http/Controllers/Auth/AuthController.php)

---

**Last Updated**: 2026-05-14 (v2.0)
**Status**: ✓ v2.0 - Fixed device identification timing (device_token guaranteed before login)
**Previous**: v1.0 - Fixed device_token in request body

**Version History**:
- **v2.0** (2026-05-14): Fixed timing issue - device identification now completes before user sees login screen. Added comprehensive logging and updated bootstrap sequence.
- **v1.0** (2026-05-14): Initial fix - ensured device_token is sent in POST body for `/auth/initiate` and `/auth/verify`. Added retry logic and timeout.

**Expected Behavior After v2.0**:
1. App starts → splash screen visible
2. Device identification runs (2-5 seconds)
3. Device_token stored in SecureStore/AsyncStorage
4. Splash screen hides
5. Login screen appears with device_token ready
6. User can login without 422 errors
