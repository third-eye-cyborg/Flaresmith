import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { View } from 'react-native';

function TabLabel({ label }: { label: string }) {
  return <Text style={{ fontSize: 11 }}>{label}</Text>;
}

export default function UserMobileLayout() {
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
        <Tabs.Screen name="subscription" options={{ title: 'Subscription', tabBarLabel: () => <TabLabel label="Plan" /> }} />
        <Tabs.Screen name="login" options={{ title: 'Login', tabBarLabel: () => <TabLabel label="Login" /> }} />
      </Tabs>
    </View>
  );
}
