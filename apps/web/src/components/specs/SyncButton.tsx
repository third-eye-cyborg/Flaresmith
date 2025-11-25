"use client";

import { useState } from "react";
import { FlaresmithClient, SpecsResource } from "@flaresmith/api-client";
import type { ApplySpecResponse } from "@flaresmith/types";

type SyncButtonProps = {
  projectId: string;
  onResult?: (report: ApplySpecResponse) => void;
  className?: string;
  label?: string;
};

function makeClient() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api";
  return new FlaresmithClient({ baseUrl });
}

export function SyncButton({ projectId, onResult, className, label }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const client = makeClient();
      const specs = new SpecsResource(client);
      const report = await specs.apply({ projectId });
      onResult?.(report);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sync spec");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Syncing…" : label ?? "Sync Spec"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default SyncButton;
