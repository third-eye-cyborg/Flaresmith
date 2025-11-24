import React from "react";
import { ScrollView, RefreshControl } from "react-native";
import { View, Text } from "@flaresmith/ui";
import { usePollingStatus } from "@flaresmith/utils";
import { useLocalSearchParams } from "expo-router";

/**
 * T077: Mobile Environment Monitoring View
 * 
 * Mobile screen for viewing environment status
 */

export default function EnvironmentsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [refreshing, setRefreshing] = React.useState(false);

  const fetcher = React.useCallback(async () => {
    // TODO: Replace with actual API endpoint once auth is configured
    const response = await fetch(`/api/projects/${projectId}/environments`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }, [projectId]);

  const { data, isLoading, error } = usePollingStatus({
    fetcher,
    interval: 15000, // Poll every 15 seconds on mobile
    enabled: !refreshing,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetcher();
    } finally {
      setRefreshing(false);
    }
  }, [fetcher]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-600 font-medium mb-2">Error Loading Environments</Text>
        <Text className="text-gray-600 text-sm text-center">{error.message}</Text>
      </View>
    );
  }

  const environments = data?.environments || [];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-4 space-y-4">
        <Text className="text-2xl font-bold mb-2">Environments</Text>
        <Text className="text-sm text-gray-500 mb-4">
          Project: {projectId}
        </Text>

        {isLoading && environments.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-gray-500">Loading environments...</Text>
          </View>
        ) : (
          environments.map((env: any) => (
            <View
              key={env.name}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              {/* Environment Name */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold uppercase">{env.name}</Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    env.status === "active"
                      ? "bg-green-100"
                      : env.status === "error"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      env.status === "active"
                        ? "text-green-800"
                        : env.status === "error"
                        ? "text-red-800"
                        : "text-yellow-800"
                    }`}
                  >
                    {env.status}
                  </Text>
                </View>
              </View>

              {/* GitHub Status */}
              {env.github && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500">GitHub</Text>
                  <Text className="text-sm font-medium">{env.github.branch}</Text>
                  <Text className="text-xs text-gray-600 truncate">
                    {env.github.lastCommit.message}
                  </Text>
                </View>
              )}

              {/* Cloudflare Status */}
              {env.cloudflare && env.cloudflare.url && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500">Cloudflare</Text>
                  <Text className="text-sm text-blue-600" numberOfLines={1}>
                    {env.cloudflare.url}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {env.cloudflare.status}
                  </Text>
                </View>
              )}

              {/* Last Deployment */}
              {env.lastDeployment && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">Last Deployment</Text>
                  <Text
                    className={`text-xs font-medium ${
                      env.lastDeployment.status === "succeeded"
                        ? "text-green-600"
                        : env.lastDeployment.status === "failed"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {env.lastDeployment.status} •{" "}
                    {new Date(env.lastDeployment.timestamp).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
