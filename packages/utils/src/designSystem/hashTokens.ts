/**
 * T007: Token Hashing Utility
 * Feature: 004-design-system
 * Decision: D-001 (SHA-256 over normalized JSON)
 * 
 * Provides deterministic hashing for token version snapshots
 * enabling drift detection and rollback fidelity.
 */

import { createHash } from 'crypto';
import type { DesignToken } from '@flaresmith/types';

/**
 * Normalized token representation for stable hashing
 */
export interface NormalizedToken {
  name: string;
  category: string;
  value: unknown;
}

/**
 * Normalize token set for deterministic hashing
 * Sorts tokens by category then name, strips volatile fields
 * 
 * @param tokens - Array of design tokens
 * @returns Normalized token map (name → {category, value})
 */
export function normalizeTokenSet(
  tokens: DesignToken[]
): Record<string, { category: string; value: unknown }> {
  // Sort tokens: category first, then name
  const sorted = [...tokens].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  // Build normalized map
  return Object.fromEntries(
    sorted.map((token) => [
      token.name,
      {
        category: token.category,
        value: token.value,
      },
    ])
  );
}

/**
 * Compute SHA-256 hash of normalized token set
 * Uses stable JSON serialization with sorted keys
 * 
 * @param normalized - Normalized token map
 * @returns SHA-256 hash (64 hex characters)
 */
export function computeSHA256Hash(
  normalized: Record<string, { category: string; value: unknown }>
): string {
  // Stable stringify: sort object keys at all levels
  const stable = stableStringify(normalized);
  
  // Compute SHA-256
  return createHash('sha256').update(stable, 'utf8').digest('hex');
}

/**
 * Stable JSON stringify with sorted keys
 * Ensures consistent serialization across runs
 */
function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  
  // Sort object keys
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + stableStringify(value);
  });
  
  return '{' + pairs.join(',') + '}';
}

/**
 * Hash token set directly (convenience wrapper)
 * 
 * @param tokens - Array of design tokens
 * @returns SHA-256 hash
 */
export function hashTokenSet(tokens: DesignToken[]): string {
  const normalized = normalizeTokenSet(tokens);
  return computeSHA256Hash(normalized);
}

/**
 * Compare two token sets for equality (via hash)
 * 
 * @param tokens1 - First token set
 * @param tokens2 - Second token set
 * @returns True if hashes match
 */
export function tokenSetsEqual(
  tokens1: DesignToken[],
  tokens2: DesignToken[]
): boolean {
  return hashTokenSet(tokens1) === hashTokenSet(tokens2);
}
