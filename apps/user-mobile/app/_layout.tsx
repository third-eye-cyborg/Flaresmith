import { Stack } from 'expo-router';
import { Text } from 'react-native';

export default function UserMobileLayout() {
  return (
    <>
      {/* Placeholder user route group; subscription screen to be added (US2/US4) */}
      <Stack>
        <Stack.Screen name="index" options={{ title: 'User Home' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
      </Stack>
      <Text style={{ textAlign: 'center', padding: 8, fontSize: 12 }}>Flaresmith User Mobile</Text>
    </>
  );
}
