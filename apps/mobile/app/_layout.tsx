import { Stack } from "expo-router";
import { useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AnalyticsProvider } from "../src/contexts/AnalyticsProvider";
import { AuthProvider, useAuthContext } from "../src/contexts/AuthProvider";
import { View, ActivityIndicator, Text } from "react-native";
import "../global.css";
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
    <Stack>
      <Stack.Screen name="index" options={{ title: "Flaresmith" }} />
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
          presentation: "modal" 
        }} 
      />
    </Stack>
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
          <RootLayoutNav />
      </AnalyticsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
