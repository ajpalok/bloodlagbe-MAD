import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { identifyDevice } from '@/lib/device';
import { Colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep data fresh for 2 min by default; detail screen overrides to 0
      // so it always background-refetches for accurate bag counts.
      staleTime: 2 * 60_000,
      // Keep unused cache entries in memory for 10 min (helps pre-populate
      // detail screen when navigating back from a deep link and returning).
      gcTime: 10 * 60_000,
    },
  },
});

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useAuthStore();
  const { loadLocale } = useSettingsStore();
  const [isDeviceIdentified, setIsDeviceIdentified] = React.useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Run auth and locale init in parallel
        await Promise.all([initialize(), loadLocale()]);
      } catch (err) {
        console.warn('[Bootstrap] Error during init:', err);
      }

      // Device identification MUST complete before we allow login.
      // identifyDevice() never throws — returns true on success, false on failure.
      const ok = await identifyDevice();
      if (!ok) {
        console.warn('[Bootstrap] Device identification failed. Login will require retry.');
      }
      setIsDeviceIdentified(true);
    };

    bootstrap().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Wait for BOTH auth init AND device identification before showing app
  if (!isInitialized || !isDeviceIdentified) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.darkBg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.darkBg} />
          <AppBootstrap>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.darkBg }, animation: 'fade' }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="request/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AppBootstrap>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
