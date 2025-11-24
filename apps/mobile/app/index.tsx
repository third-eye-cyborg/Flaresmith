import { View, Text } from "@flaresmith/ui";
import { StatusBar } from "expo-status-bar";

export default function HomePage() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-4xl font-bold mb-4">Flaresmith</Text>
      <Text className="text-xl text-gray-600">
        Multi-Environment Orchestration
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}
