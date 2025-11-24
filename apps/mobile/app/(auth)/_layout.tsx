/**
 * Auth stack layout
 * Handles authentication-related screens (signin, signup, forgot password, etc.)
 */

import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="signin" />
    </Stack>
  );
}
