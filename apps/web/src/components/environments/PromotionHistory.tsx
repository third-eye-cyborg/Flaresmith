"use client";

import React from "react";

/**
 * T168: PromotionHistory Component
 * Visualizes promotion lineage across core environments (dev → staging → prod).
 * Derives promotion relationship heuristically by comparing lastDeployment commit SHAs.
 * Falls back gracefully when deployments are missing.
 */

export interface PromotionHistoryEnvironment {
  name: string;
  lastDeployment?: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed" | "rolledback";
    commitSha: string;
    createdAt: string; // ISO
  };
}

export interface PromotionHistoryProps {
  environments: PromotionHistoryEnvironment[];
  className?: string;
}

interface LineageNode {
  env: string;
  commitSha?: string;
  shortSha?: string;
  deployedAt?: string;
  status?: string;
  promotedFrom?: string; // source env if commit matches
}

function buildLineage(envs: PromotionHistoryEnvironment[]): LineageNode[] {
  const dev = envs.find((e) => e.name === "dev");
  const staging = envs.find((e) => e.name === "staging");
  const prod = envs.find((e) => e.name === "prod");

  const nodes: LineageNode[] = [];

  const devNode: LineageNode = {
    env: "dev",
    commitSha: dev?.lastDeployment?.commitSha,
    shortSha: dev?.lastDeployment?.commitSha?.slice(0, 7),
    deployedAt: dev?.lastDeployment?.createdAt,
    status: dev?.lastDeployment?.status,
  };
  nodes.push(devNode);

  const stagingNode: LineageNode = {
    env: "staging",
    commitSha: staging?.lastDeployment?.commitSha,
    shortSha: staging?.lastDeployment?.commitSha?.slice(0, 7),
    deployedAt: staging?.lastDeployment?.createdAt,
    status: staging?.lastDeployment?.status,
  };
  if (
    stagingNode.commitSha &&
    devNode.commitSha &&
    stagingNode.commitSha === devNode.commitSha
  ) {
    stagingNode.promotedFrom = "dev";
  }
  nodes.push(stagingNode);

  const prodNode: LineageNode = {
    env: "prod",
    commitSha: prod?.lastDeployment?.commitSha,
    shortSha: prod?.lastDeployment?.commitSha?.slice(0, 7),
    deployedAt: prod?.lastDeployment?.createdAt,
    status: prod?.lastDeployment?.status,
  };
  if (
    prodNode.commitSha &&
    stagingNode.commitSha &&
    prodNode.commitSha === stagingNode.commitSha
  ) {
    prodNode.promotedFrom = "staging";
  }
  nodes.push(prodNode);

  return nodes;
}

export const PromotionHistory: React.FC<PromotionHistoryProps> = ({
  environments,
  className = "",
}) => {
  const lineage = React.useMemo(
    () => buildLineage(environments),
    [environments]
  );

  const hasAnyDeployment = lineage.some((n) => n.commitSha);

  return (
    <div
      className={
        "mt-10 p-5 border rounded-lg bg-white shadow-sm space-y-4 " + className
      }
      aria-labelledby="promotion-history-title"
    >
      <div className="flex items-center justify-between">
        <h3
          id="promotion-history-title"
          className="text-sm font-semibold text-gray-700"
        >
          Promotion Lineage
        </h3>
        <span className="text-xs text-gray-400">
          dev → staging → prod flow
        </span>
      </div>
      {!hasAnyDeployment ? (
        <div className="text-xs text-gray-500">
          No deployments recorded yet. Deploy to dev to begin promotion chain.
        </div>
      ) : (
        <ol className="relative border-l border-gray-200 ml-2 pl-4">
          {lineage.map((node, idx) => {
            const isLast = idx === lineage.length - 1;
            return (
              <li key={node.env} className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border ${
                      node.commitSha
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                    aria-label={`${node.env} environment node`}
                  >
                    {node.env?.[0]?.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {node.env}
                  </span>
                  {node.promotedFrom && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                      promoted from {node.promotedFrom}
                    </span>
                  )}
                  {node.status && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border ${
                        node.status === "succeeded"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : node.status === "failed" || node.status === "rolledback"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {node.status}
                    </span>
                  )}
                </div>
                {node.commitSha ? (
                  <div className="ml-8 text-xs text-gray-600 space-y-0.5">
                    <div>
                      Commit: <span className="font-mono">{node.shortSha}</span>
                    </div>
                    {node.deployedAt && (
                      <div>
                        Deployed: {new Date(node.deployedAt).toLocaleString()}
                      </div>
                    )}
                    {node.promotedFrom && (
                      <div className="text-green-600">
                        Matches {node.promotedFrom} deployment
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ml-8 text-xs text-gray-400 italic">
                    No deployment yet
                  </div>
                )}
                {!isLast && (
                  <div className="ml-3 mt-4 mb-2 text-gray-300">↓</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-[10px] text-gray-400 mt-2">
        Promotion inference based on matching commit SHAs. Actual promotion
        events are triggered via the Promote action once source deployments
        succeed.
      </p>
    </div>
  );
};

export default PromotionHistory;