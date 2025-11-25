import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

function TabLabel({ label }: { label: string }) {
  return <Text style={{ fontSize: 11 }}>{label}</Text>;
}

export default function AdminMobileLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#090909', borderTopColor: '#222' },
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#666'
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: () => <TabLabel label="Home" /> }} />
        <Tabs.Screen name="admin/dashboard" options={{ title: 'Dashboard', tabBarLabel: () => <TabLabel label="Dash" /> }} />
        <Tabs.Screen name="admin/login" options={{ title: 'Login', tabBarLabel: () => <TabLabel label="Login" /> }} />
        <Tabs.Screen name="admin/mfa/setup" options={{ title: 'MFA', tabBarLabel: () => <TabLabel label="MFA" /> }} />
      </Tabs>
    </View>
  );
}
