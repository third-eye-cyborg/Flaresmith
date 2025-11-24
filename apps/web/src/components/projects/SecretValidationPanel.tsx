"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CloudMakeClient } from "@flaresmith/api-client/src/client"; // Adjust path if barrel export exists
import { GitHubResource } from "@flaresmith/api-client/src/resources/github";
import type { SecretValidationResponse } from "@flaresmith/types";

/**
 * T055: SecretValidationPanel Component
 * Displays secret validation status (missing, conflicts) with remediation guidance.
 * Color coding:
 *  - Green: valid (no missing/conflicts)
 *  - Yellow: conflicts only
 *  - Red: missing secrets present
 */
export interface SecretValidationPanelProps {
  projectId: string;
  /** Optional initial list of required secrets to validate */
  initialRequiredSecrets?: string[];
  /** Base URL for API (defaults to /api) */
  apiBaseUrl?: string;
}

interface ValidationState {
  loading: boolean;
  error: string | null;
  data: SecretValidationResponse | null;
}

export const SecretValidationPanel: React.FC<SecretValidationPanelProps> = ({
  projectId,
  initialRequiredSecrets = [],
  apiBaseUrl = "/api",
}) => {
  const [requiredSecretsInput, setRequiredSecretsInput] = useState(
    initialRequiredSecrets.join(",")
  );
  const [state, setState] = useState<ValidationState>({
    loading: false,
    error: null,
    data: null,
  });
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  // Instantiate API client lazily
  const client = React.useMemo(
    () => new CloudMakeClient({ baseUrl: apiBaseUrl }),
    [apiBaseUrl]
  );
  const github = React.useMemo(() => new GitHubResource(client), [client]);

  const parseRequiredSecrets = useCallback((): string[] => {
    return requiredSecretsInput
      .split(/[,\n]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
  }, [requiredSecretsInput]);

  const validate = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const requiredSecrets = parseRequiredSecrets();
      const data = await github.validateSecrets({ projectId, requiredSecrets });
      setState({ loading: false, error: null, data });
      setLastValidatedAt(new Date().toISOString());
    } catch (err: any) {
      setState({ loading: false, error: err.message || "Validation failed", data: null });
    }
  }, [github, projectId, parseRequiredSecrets]);

  // Auto-run first validation if initial list provided
  useEffect(() => {
    if (initialRequiredSecrets.length > 0) {
      void validate();
    }
  }, [validate, initialRequiredSecrets.length]);

  const statusColor = (() => {
    if (!state.data) return "bg-gray-100 text-gray-600";
    const { missingCount, conflictCount } = state.data.summary;
    if (missingCount === 0 && conflictCount === 0) return "bg-green-100 text-green-800";
    if (missingCount === 0 && conflictCount > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  })();

  return (
    <div className="rounded-lg border border-gray-200 p-6 space-y-6 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Secret Validation</h2>
        <div
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusColor}`}
        >
          {state.data
            ? state.data.valid
              ? "Valid"
              : state.data.summary.missingCount > 0
              ? "Missing Secrets"
              : "Conflicts Detected"
            : "Idle"}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="required-secrets">
          Required Secrets (comma or newline separated)
        </label>
        <textarea
          id="required-secrets"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-24"
          placeholder="DATABASE_URL, API_KEY, JWT_SECRET"
          value={requiredSecretsInput}
          onChange={(e) => setRequiredSecretsInput(e.target.value)}
        />
        <button
          type="button"
          onClick={() => validate()}
          disabled={state.loading}
          className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {state.loading ? "Validating..." : "Validate"}
        </button>
        {lastValidatedAt && (
          <p className="text-xs text-gray-500">Last validated: {lastValidatedAt}</p>
        )}
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {state.data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col p-3 rounded bg-gray-50">
              <span className="text-xs text-gray-500">Total Secrets</span>
              <span className="font-semibold">{state.data.summary.totalSecrets}</span>
            </div>
            <div className="flex flex-col p-3 rounded bg-gray-50">
              <span className="text-xs text-gray-500">Valid</span>
              <span className="font-semibold">{state.data.summary.validCount}</span>
            </div>
            <div className="flex flex-col p-3 rounded bg-gray-50">
              <span className="text-xs text-gray-500">Missing</span>
              <span className="font-semibold text-red-600">
                {state.data.summary.missingCount}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded bg-gray-50">
              <span className="text-xs text-gray-500">Conflicts</span>
              <span className="font-semibold text-yellow-600">
                {state.data.summary.conflictCount}
              </span>
            </div>
          </div>

            {/* Missing */}
            {state.data.missing.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2">Missing Secrets</h3>
                <ul className="space-y-1 text-xs">
                  {state.data.missing.map((m, idx) => (
                    <li
                      key={`${m.secretName}-${m.scope}-${idx}`}
                      className="px-2 py-1 rounded bg-red-50 text-red-800 flex justify-between"
                    >
                      <span>{m.secretName}</span>
                      <span className="opacity-70">{m.scope}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflicts */}
            {state.data.conflicts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-yellow-700 mb-2">Conflicts</h3>
                <ul className="space-y-1 text-xs">
                  {state.data.conflicts.map((c, idx) => (
                    <li
                      key={`${c.secretName}-${idx}`}
                      className="px-2 py-1 rounded bg-yellow-50 text-yellow-800"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{c.secretName}</span>
                        <span className="opacity-70">{c.scopes.join(", ")}</span>
                      </div>
                      <div className="mt-1 text-[10px] font-mono break-all opacity-70">
                        {Object.entries(c.valueHashes)
                          .map(([scope, hash]) => `${scope}: ${hash.slice(0, 12)}…`)
                          .join(" | ")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Remediation Steps */}
            {state.data.remediationSteps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Remediation Steps</h3>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  {state.data.remediationSteps.map((step, idx) => (
                    <li key={idx} className="text-gray-700">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SecretValidationPanel;
