import { z } from 'zod';

/**
 * Feature registry for platform capabilities.
 * Each entry should map to a spec document and controlling flag (if any).
 * Spec Reference: specs/006-design-sync-integration/spec.md
 */
export const FeatureKeyEnum = z.enum([
  'designSyncIntegration',
]);
export type FeatureKey = z.infer<typeof FeatureKeyEnum>;

interface FeatureMeta {
  key: FeatureKey;
  specRef: string;
  flag?: string; // Environment flag enabling feature
  mvpTasks?: { until: string }; // Last task ID included in MVP scope
  description: string;
}

export const FeatureRegistry: Record<FeatureKey, FeatureMeta> = {
  designSyncIntegration: {
    key: 'designSyncIntegration',
    specRef: 'specs/006-design-sync-integration/spec.md',
    flag: 'DESIGN_SYNC_ENABLED',
    mvpTasks: { until: 'T057' },
    description: 'Bidirectional design ↔ code sync, drift detection, undo, coverage, notifications.'
  },
};

export function getFeatureMeta(key: FeatureKey): FeatureMeta {
  return FeatureRegistry[key];
}

export function isFeatureEnabled(env: NodeJS.ProcessEnv, key: FeatureKey): boolean {
  const meta = getFeatureMeta(key);
  if (!meta.flag) return true;
  return env[meta.flag] === 'true';
}
