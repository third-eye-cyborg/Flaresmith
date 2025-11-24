/**
 * Drift Detection Service
 * Feature: 004-design-system
 * Task: T069
 * 
 * Detects divergence between baseline token specification and current implementation
 * - FR-013: Drift detection blocks merges when tokens diverge from spec
 * - SC-008: 100% of merges with config divergence are blocked
 * - Decision D-004: Category-grouped diff for clarity
 * 
 * Methods:
 * - detectDrift(): Entry point - compare current tokens to baseline
 * - compareWithBaseline(): Load baseline snapshot and compute hash diff
 * - categorizeDiff(): Group token changes by category
 */

import { db } from '../../../db/connection';
import { designTokens, designTokenVersions, designDriftEvents } from '../../../db/schema/designSystem';
import { eq, desc } from 'drizzle-orm';
import type { DesignTokenCategory, DriftCategoryDiff } from '@flaresmith/types';
import { normalizeTokenSet } from '@flaresmith/types';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Types
// =============================================================================

interface DriftResult {
  baselineVersion: number;
  currentVersion: number;
  drift: Record<DesignTokenCategory, DriftCategoryDiff>;
  hasDrift: boolean;
}

// =============================================================================
// Drift Detection Service
// =============================================================================

/**
 * Detect drift between baseline and current tokens
 */
export async function detectDrift(baselineVersion?: number): Promise<DriftResult> {
  // Load baseline version (default to latest)
  const baseline = baselineVersion
    ? await db.select().from(designTokenVersions).where(eq(designTokenVersions.version, baselineVersion)).limit(1)
    : await db.select().from(designTokenVersions).orderBy(desc(designTokenVersions.version)).limit(1);

  if (baseline.length === 0) {
    throw new Error('No baseline token version found');
  }

  const baselineRecord = baseline[0]!;
  const baselineSnapshot = baselineRecord.snapshot as Record<string, unknown>;

  // Load current tokens
  const currentTokens = await db.select().from(designTokens);

  if (currentTokens.length === 0) {
    throw new Error('No current tokens found');
  }

  // Normalize and hash current tokens
  const currentNormalized = normalizeTokenSet(
    currentTokens.map((t: typeof currentTokens[number]) => ({
      id: t.id,
      name: t.name,
      category: t.category as DesignTokenCategory,
      value: t.value,
      version: t.version,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
    }))
  );

  const currentHash = computeHash(currentNormalized);

  // Compare hashes
  const hasDrift = currentHash !== baselineRecord.hash;

  // If no drift, return early
  if (!hasDrift) {
    return {
      baselineVersion: baselineRecord.version,
      currentVersion: currentTokens[0]!.version,
      drift: {} as Record<DesignTokenCategory, DriftCategoryDiff>,
      hasDrift: false,
    };
  }

  // Compute category-grouped diff
  const drift = categorizeDiff(baselineSnapshot, currentNormalized);

  // Persist drift event
  await db.insert(designDriftEvents).values({
    id: uuidv4(),
    baselineVersion: baselineRecord.version,
    currentHash,
    diff: drift as any, // JSONB field
  });

  console.warn(`⚠️  Drift detected: baseline v${baselineRecord.version} → current (hash ${currentHash.substring(0, 8)}...)`);

  return {
    baselineVersion: baselineRecord.version,
    currentVersion: currentTokens[0]!.version,
    drift,
    hasDrift: true,
  };
}

/**
 * Compare baseline snapshot with current normalized tokens
 */
export function compareWithBaseline(
  baselineSnapshot: Record<string, unknown>,
  currentNormalized: Record<string, unknown>
): { baselineHash: string; currentHash: string; hasDrift: boolean } {
  const baselineHash = computeHash(baselineSnapshot);
  const currentHash = computeHash(currentNormalized);
  return {
    baselineHash,
    currentHash,
    hasDrift: baselineHash !== currentHash,
  };
}

/**
 * Group token changes by category
 */
export function categorizeDiff(
  baseline: Record<string, unknown>,
  current: Record<string, unknown>
): Record<DesignTokenCategory, DriftCategoryDiff> {
  const categories: DesignTokenCategory[] = ['color', 'spacing', 'typography', 'radius', 'elevation', 'glass', 'semantic'];
  const drift: Record<DesignTokenCategory, DriftCategoryDiff> = {} as any;

  for (const category of categories) {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: Array<{ name: string; old: unknown; current: unknown }> = [];

    // Find tokens in this category
    const baselineNames = new Set(
      Object.entries(baseline)
        .filter(([name]) => inferCategory(name) === category)
        .map(([name]) => name)
    );

    const currentNames = new Set(
      Object.entries(current)
        .filter(([name]) => inferCategory(name) === category)
        .map(([name]) => name)
    );

    // Detect added tokens
    for (const name of currentNames) {
      if (!baselineNames.has(name)) {
        added.push(name);
      }
    }

    // Detect removed tokens
    for (const name of baselineNames) {
      if (!currentNames.has(name)) {
        removed.push(name);
      }
    }

    // Detect changed tokens
    for (const name of currentNames) {
      if (baselineNames.has(name)) {
        const baselineEntry = baseline[name] as { value: unknown };
        const currentEntry = current[name] as { value: unknown };

        if (JSON.stringify(baselineEntry.value) !== JSON.stringify(currentEntry.value)) {
          changed.push({
            name,
            old: baselineEntry.value,
            current: currentEntry.value,
          });
        }
      }
    }

    // Only include category if there are changes
    if (added.length > 0 || removed.length > 0 || changed.length > 0) {
      drift[category] = { added, removed, changed: changed as any };
    }
  }

  return drift;
}

/**
 * Infer category from token name
 * Uses naming convention: category.name[.scale]
 */
function inferCategory(name: string): DesignTokenCategory {
  if (name.startsWith('primary.') || name.startsWith('accent.')) return 'color';
  if (name.startsWith('spacing.')) return 'spacing';
  if (name.startsWith('typography.')) return 'typography';
  if (name.startsWith('radius.')) return 'radius';
  if (name.startsWith('elevation.')) return 'elevation';
  if (name.startsWith('glass.')) return 'glass';
  if (name.startsWith('semantic.')) return 'semantic';
  return 'color'; // Default fallback
}

/**
 * Compute SHA-256 hash of normalized token set
 */
function computeHash(normalized: Record<string, unknown>): string {
  const json = JSON.stringify(normalized, Object.keys(normalized).sort());
  return createHash('sha256').update(json).digest('hex');
}

export const driftDetectionService = {
  detectDrift,
  compareWithBaseline,
  categorizeDiff,
};
