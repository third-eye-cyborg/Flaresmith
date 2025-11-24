/**
 * T010: Drift Detection Algorithm
 * Feature: 004-design-system
 * Decision: D-004 (Category-grouped diff logic)
 * 
 * Detects drift between spec tokens and generated config
 * enabling CI blocking when hash mismatch present.
 */

import type { DesignToken, DesignTokenCategory, DriftCategoryDiff, TokenValue } from '@flaresmith/types';
import { hashTokenSet } from './hashTokens';

/**
 * Detect drift between baseline and current token sets
 * 
 * @param baselineTokens - Baseline token set
 * @param currentTokens - Current token set
 * @returns Category-grouped drift report
 */
export function detectDrift(
  baselineTokens: DesignToken[],
  currentTokens: DesignToken[]
): {
  hasDrift: boolean;
  baselineHash: string;
  currentHash: string;
  diff: Record<DesignTokenCategory, DriftCategoryDiff>;
} {
  // Compute hashes
  const baselineHash = hashTokenSet(baselineTokens);
  const currentHash = hashTokenSet(currentTokens);
  
  // No drift if hashes match
  if (baselineHash === currentHash) {
    return {
      hasDrift: false,
      baselineHash,
      currentHash,
      diff: {} as Record<DesignTokenCategory, DriftCategoryDiff>,
    };
  }
  
  // Compute category-grouped diff
  const diff = computeCategoryDiff(baselineTokens, currentTokens);
  
  return {
    hasDrift: true,
    baselineHash,
    currentHash,
    diff,
  };
}

/**
 * Compute category-grouped diff between token sets
 * 
 * @param baselineTokens - Baseline token set
 * @param currentTokens - Current token set
 * @returns Diff grouped by category
 */
export function computeCategoryDiff(
  baselineTokens: DesignToken[],
  currentTokens: DesignToken[]
): Record<DesignTokenCategory, DriftCategoryDiff> {
  // Build token maps
  const baselineMap = new Map(baselineTokens.map((t) => [t.name, t]));
  const currentMap = new Map(currentTokens.map((t) => [t.name, t]));
  
  // Group by category
  const categories = new Set<DesignTokenCategory>();
  baselineTokens.forEach((t) => categories.add(t.category));
  currentTokens.forEach((t) => categories.add(t.category));
  
  const diff: Record<string, DriftCategoryDiff> = {};
  
  for (const category of categories) {
    const baselineInCategory = baselineTokens.filter((t) => t.category === category);
    const currentInCategory = currentTokens.filter((t) => t.category === category);
    
    const added: string[] = [];
    const removed: string[] = [];
    const changed: Array<{ name: string; old: string | number | Record<string, unknown>; current: string | number | Record<string, unknown> }> = [];
    
    // Detect added tokens
    for (const token of currentInCategory) {
      if (!baselineMap.has(token.name)) {
        added.push(token.name);
      }
    }
    
    // Detect removed tokens
    for (const token of baselineInCategory) {
      if (!currentMap.has(token.name)) {
        removed.push(token.name);
      }
    }
    
    // Detect changed tokens
    for (const token of currentInCategory) {
      const baselineToken = baselineMap.get(token.name);
      if (baselineToken && !valuesEqual(baselineToken.value, token.value)) {
        changed.push({
          name: token.name,
          old: baselineToken.value as string | number | Record<string, unknown>,
          current: token.value as string | number | Record<string, unknown>,
        });
      }
    }
    
    // Only include category if there are changes
    if (added.length > 0 || removed.length > 0 || changed.length > 0) {
      diff[category] = { added, removed, changed };
    }
  }
  
  return diff as Record<DesignTokenCategory, DriftCategoryDiff>;
}

/**
 * Compare two token values for equality
 * 
 * @param value1 - First value
 * @param value2 - Second value
 * @returns True if values are equal
 */
function valuesEqual(value1: unknown, value2: unknown): boolean {
  // Simple deep equality check
  return JSON.stringify(value1) === JSON.stringify(value2);
}

/**
 * Summarize drift for logging
 * 
 * @param diff - Category-grouped diff
 * @returns Summary string
 */
export function summarizeDrift(
  diff: Record<DesignTokenCategory, DriftCategoryDiff>
): string {
  const categories = Object.keys(diff) as DesignTokenCategory[];
  
  if (categories.length === 0) {
    return 'No drift detected';
  }
  
  const parts: string[] = [];
  
  for (const category of categories) {
    const categoryDiff = diff[category];
    if (!categoryDiff) continue;
    
    const counts: string[] = [];
    if (categoryDiff.added.length > 0) counts.push(`+${categoryDiff.added.length} added`);
    if (categoryDiff.removed.length > 0) counts.push(`-${categoryDiff.removed.length} removed`);
    if (categoryDiff.changed.length > 0) counts.push(`~${categoryDiff.changed.length} changed`);
    
    parts.push(`${category}: ${counts.join(', ')}`);
  }
  
  return parts.join('; ');
}
