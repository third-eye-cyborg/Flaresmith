import React from "react";
import { View } from "./View";
import { Text } from "./Text";

/**
 * T072: EnvironmentCard Component
 * 
 * Displays single environment status (dev/staging/prod)
 * Shows integration statuses, deployment info, and actions
 */

export interface EnvironmentCardProps {
  name: "dev" | "staging" | "prod";
  status: "active" | "provisioning" | "updating" | "error" | "archived";
  github?: {
    branch: string;
    lastCommit: {
      sha: string;
      message: string;
      author: string;
      timestamp: string;
    };
    status: "active" | "stale" | "error";
  };
  cloudflare?: {
    deploymentId?: string;
    url?: string;
    status: "deployed" | "deploying" | "failed" | "none";
  };
  neon?: {
    branchId?: string;
    computeStatus: "active" | "idle" | "suspended" | "error";
  };
  postman?: {
    environmentId?: string;
    lastSyncedAt?: string;
    status: "synced" | "outdated" | "error";
  };
  lastDeployment?: {
    id: string;
    timestamp: string;
    status: "succeeded" | "failed" | "running";
    commitSha: string;
  };
  lastBuild?: {
    id: string;
    timestamp: string;
    status: "succeeded" | "failed" | "running";
  };
  onPromote?: () => void;
  canPromote?: boolean;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "active":
    case "deployed":
    case "synced":
    case "succeeded":
      return "text-green-600";
    case "provisioning":
    case "updating":
    case "deploying":
    case "running":
      return "text-yellow-600";
    case "error":
    case "failed":
      return "text-red-600";
    case "stale":
    case "outdated":
      return "text-orange-600";
    case "idle":
    case "suspended":
      return "text-gray-600";
    default:
      return "text-gray-400";
  }
};

const getEnvironmentBadgeColor = (name: string): string => {
  switch (name) {
    case "dev":
      return "bg-blue-100 text-blue-800";
    case "staging":
      return "bg-yellow-100 text-yellow-800";
    case "prod":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const EnvironmentCard: React.FC<EnvironmentCardProps> = ({
  name,
  status,
  github,
  cloudflare,
  neon,
  postman,
  lastDeployment,
  lastBuild,
  onPromote,
  canPromote,
}) => {
  return (
    <View className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Header */}
      <View className="flex flex-row items-center justify-between mb-4">
        <View className="flex flex-row items-center gap-2">
          <Text
            className={`px-3 py-1 rounded-full text-sm font-medium ${getEnvironmentBadgeColor(
              name
            )}`}
          >
            {name.toUpperCase()}
          </Text>
          <Text className={`text-sm font-medium ${getStatusColor(status)}`}>
            {status}
          </Text>
        </View>
        {canPromote && onPromote && (
          <button
            onClick={onPromote}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            Promote →
          </button>
        )}
      </View>

      {/* Integration Statuses */}
      <View className="space-y-3">
        {/* GitHub */}
        {github && (
          <View className="flex flex-row items-start gap-2">
            <Text className="text-sm font-medium text-gray-500 w-24">
              GitHub:
            </Text>
            <View className="flex-1">
              <Text className="text-sm font-medium">{github.branch}</Text>
              <Text className="text-xs text-gray-500 truncate">
                {github.lastCommit.message}
              </Text>
              <Text className={`text-xs ${getStatusColor(github.status)}`}>
                {github.status} • {github.lastCommit.author}
              </Text>
            </View>
          </View>
        )}

        {/* Cloudflare */}
        {cloudflare && (
          <View className="flex flex-row items-start gap-2">
            <Text className="text-sm font-medium text-gray-500 w-24">
              Cloudflare:
            </Text>
            <View className="flex-1">
              {cloudflare.url ? (
                <a
                  href={cloudflare.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {cloudflare.url}
                </a>
              ) : (
                <Text className="text-sm text-gray-400">No deployment</Text>
              )}
              <Text
                className={`text-xs ${getStatusColor(cloudflare.status)}`}
              >
                {cloudflare.status}
              </Text>
            </View>
          </View>
        )}

        {/* Neon */}
        {neon && (
          <View className="flex flex-row items-start gap-2">
            <Text className="text-sm font-medium text-gray-500 w-24">Neon:</Text>
            <View className="flex-1">
              <Text className="text-sm font-mono text-xs">
                {neon.branchId || "No branch"}
              </Text>
              <Text className={`text-xs ${getStatusColor(neon.computeStatus)}`}>
                {neon.computeStatus}
              </Text>
            </View>
          </View>
        )}

        {/* Postman */}
        {postman && (
          <View className="flex flex-row items-start gap-2">
            <Text className="text-sm font-medium text-gray-500 w-24">
              Postman:
            </Text>
            <View className="flex-1">
              <Text className="text-sm">
                {postman.environmentId ? "Environment synced" : "Not configured"}
              </Text>
              {postman.lastSyncedAt && (
                <Text className={`text-xs ${getStatusColor(postman.status)}`}>
                  {postman.status} • Last synced:{" "}
                  {new Date(postman.lastSyncedAt).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Last Deployment/Build */}
      {(lastDeployment || lastBuild) && (
        <View className="mt-4 pt-4 border-t">
          {lastDeployment && (
            <View className="flex flex-row items-center justify-between mb-2">
              <Text className="text-xs text-gray-500">Last Deployment:</Text>
              <Text
                className={`text-xs font-medium ${getStatusColor(
                  lastDeployment.status
                )}`}
              >
                {lastDeployment.status} •{" "}
                {new Date(lastDeployment.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
          {lastBuild && (
            <View className="flex flex-row items-center justify-between">
              <Text className="text-xs text-gray-500">Last Build:</Text>
              <Text
                className={`text-xs font-medium ${getStatusColor(
                  lastBuild.status
                )}`}
              >
                {lastBuild.status} •{" "}
                {new Date(lastBuild.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
