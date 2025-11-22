"use client";

import React from "react";
import { EnvironmentCard, type EnvironmentCardProps } from "@cloudmake/ui";

/**
 * T073: EnvironmentDashboard Component
 * 
 * Displays all environments (dev/staging/prod) with promotion controls
 */

export interface EnvironmentDashboardProps {
  projectId: string;
  environments: Omit<EnvironmentCardProps, "onPromote" | "canPromote">[];
  onPromote?: (sourceEnv: "dev" | "staging", targetEnv: "staging" | "prod") => void;
  loading?: boolean;
}

export const EnvironmentDashboard: React.FC<EnvironmentDashboardProps> = ({
  projectId,
  environments,
  onPromote,
  loading = false,
}) => {
  const devEnv = environments.find((e) => e.name === "dev");
  const stagingEnv = environments.find((e) => e.name === "staging");
  const prodEnv = environments.find((e) => e.name === "prod");

  const canPromoteToStaging =
    devEnv?.lastDeployment?.status === "succeeded" && !loading;
  const canPromoteToProd =
    stagingEnv?.lastDeployment?.status === "succeeded" && !loading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading environments...</div>
      </div>
    );
  }

  if (environments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">No environments found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Environment Status</h2>
        <div className="text-sm text-gray-500">Project: {projectId}</div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Dev Environment */}
        {devEnv && (
          <EnvironmentCard
            {...devEnv}
            canPromote={canPromoteToStaging}
            onPromote={
              onPromote && canPromoteToStaging
                ? () => onPromote("dev", "staging")
                : undefined
            }
          />
        )}

        {/* Staging Environment */}
        {stagingEnv && (
          <EnvironmentCard
            {...stagingEnv}
            canPromote={canPromoteToProd}
            onPromote={
              onPromote && canPromoteToProd
                ? () => onPromote("staging", "prod")
                : undefined
            }
          />
        )}

        {/* Prod Environment */}
        {prodEnv && <EnvironmentCard {...prodEnv} />}
      </div>

      {/* Promotion Flow Diagram */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Promotion Flow
        </h3>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div
            className={`px-4 py-2 rounded ${
              canPromoteToStaging
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            dev
          </div>
          <div className="text-gray-400">→</div>
          <div
            className={`px-4 py-2 rounded ${
              canPromoteToProd
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            staging
          </div>
          <div className="text-gray-400">→</div>
          <div className="px-4 py-2 rounded bg-gray-100 text-gray-400">prod</div>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Promotions require successful deployment in source environment
        </p>
      </div>
    </div>
  );
};
