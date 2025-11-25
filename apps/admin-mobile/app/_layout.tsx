import { Stack } from 'expo-router';
import { Text } from 'react-native';

export default function AdminMobileLayout() {
  return (
    <>
      {/* Placeholder admin route group; screens will be added (US1) */}
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Admin Home' }} />
        <Stack.Screen name="login" options={{ title: 'Admin Login' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      {/* Simple footer placeholder to differentiate surface */}
      <Text style={{ textAlign: 'center', padding: 8, fontSize: 12 }}>Flaresmith Admin Mobile</Text>
    </>
  );
}
