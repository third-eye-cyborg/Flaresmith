import { Stack } from "expo-router";
import { useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { AnalyticsProvider } from "../src/contexts/AnalyticsProvider";
import { AuthProvider, useAuthContext } from "../src/contexts/AuthProvider";
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import "../global.css";

// Theme context (T101) + latency tracking (T102)
type ThemeMode = 'light' | 'dark';
interface ThemeContextValue { mode: ThemeMode; toggleMode: () => void; }
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return ctx;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const toggleMode = useCallback(() => {
    const start = Date.now();
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    // Defer latency measurement until next frame
    setTimeout(() => {
      const latency = Date.now() - start;
      // eslint-disable-next-line no-console
      console.log(`[mobile-theme-switch] mode=${next} latencyMs=${latency}`);
      (global as any).__themeLatencyStats = (global as any).__themeLatencyStats || { mobile: [] };
      (global as any).__themeLatencyStats.mobile.push({ mode: next, latencyMs: latency, ts: Date.now() });
    }, 0);
  }, [mode]);
  return <ThemeContext.Provider value={{ mode, toggleMode }}>{children}</ThemeContext.Provider>;
}

function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={toggleMode}
      style={{ position: 'absolute', top: 16, right: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: mode === 'dark' ? 'rgba(38,38,38,0.9)' : 'rgba(250,250,250,0.9)' }}
    >
      <Text style={{ color: mode === 'dark' ? '#fafafa' : '#111827', fontWeight: '600' }}>{mode === 'dark' ? 'Light' : 'Dark'} Mode</Text>
    </Pressable>
  );
}
/**
 * Route protection logic
 * Redirects to signin if unauthenticated, to main app if authenticated
 */
function RootLayoutNav() {
  const { state } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading initial auth state
    if (state.isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!state.isAuthenticated && !inAuthGroup) {
      // Redirect to signin if not authenticated and not already in auth
      router.replace("/(auth)/signin");
    } else if (state.isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and in auth screens
      router.replace("/");
    }
  }, [state.isAuthenticated, state.isLoading, segments]);

  // Show loading screen while checking auth state
  if (state.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemeToggleButton />
      <Stack>
        <Stack.Screen name="index" options={{ title: "Flaresmith" }} />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack>
    </View>
  );
}


export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalyticsProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </AnalyticsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
