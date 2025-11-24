"use client";

import React from "react";
import { EnvironmentDashboard } from "@/components/environments/EnvironmentDashboard";
import { PromotionHistory } from "@/components/environments/PromotionHistory";
import { usePollingStatus } from "@cloudmake/utils";
import { useParams, useRouter } from "next/navigation";

/**
 * T074: Environment Dashboard Page
 * 
 * Page component for /projects/[id]/environments
 */

export default function EnvironmentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const fetcher = React.useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/environments`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }, [projectId]);

  const { data, isLoading, error } = usePollingStatus({
    fetcher,
    interval: 10000, // Poll every 10 seconds
  });

  const handlePromote = async (
    sourceEnv: "dev" | "staging",
    targetEnv: "staging" | "prod"
  ) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceEnvironment: sourceEnv,
          targetEnvironment: targetEnv,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Promotion failed");
      }

      const result = await response.json();
      
      // Optionally show success toast
      console.log("Promotion successful:", result);
      
      // The polling will pick up the new deployment status
    } catch (err) {
      console.error("Promotion error:", err);
      alert(err instanceof Error ? err.message : "Failed to promote environment");
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Environments</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
          <button
            onClick={() => router.push("/projects")}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EnvironmentDashboard
        projectId={projectId}
        environments={data?.environments || []}
        onPromote={handlePromote}
        loading={isLoading}
      />
      <PromotionHistory environments={data?.environments || []} />
    </div>
  );
}
