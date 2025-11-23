/**
 * T011: Token Merge Utility
 * Feature: 004-design-system
 * Decision: D-005 (Layered precedence logic)
 * 
 * Merges token layers with deterministic precedence:
 * base → semantic → mode (light/dark) → override → preview
 */

import type { DesignToken, ThemeMode } from '@flaresmith/types';

/**
 * Token layer type
 */
export interface TokenLayer {
  name: string;
  tokens: DesignToken[];
  priority: number; // Higher = takes precedence
}

/**
 * Reserved namespaces that cannot be overridden
 */
const RESERVED_NAMESPACES = [
  'semantic.error',
  'semantic.warning',
  'semantic.success',
  'semantic.info',
];

/**
 * Check if token name is in reserved namespace
 * 
 * @param name - Token name
 * @returns True if reserved
 */
export function isReservedNamespace(name: string): boolean {
  return RESERVED_NAMESPACES.some((ns) => name.startsWith(ns));
}

/**
 * Merge token layers with precedence rules
 * Last writer wins, but reserved namespaces are protected
 * 
 * @param layers - Array of token layers (ordered by priority)
 * @returns Merged token set
 */
export function mergeTokenLayers(layers: TokenLayer[]): DesignToken[] {
  // Sort layers by priority (ascending)
  const sorted = [...layers].sort((a, b) => a.priority - b.priority);
  
  // Build merged map
  const merged = new Map<string, DesignToken>();
  
  for (const layer of sorted) {
    for (const token of layer.tokens) {
      // Check if reserved and not from base layer
      if (isReservedNamespace(token.name) && layer.priority > 0) {
        continue; // Skip override of reserved namespace
      }
      
      merged.set(token.name, token);
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Merge token sets with standard precedence
 * base → semantic → mode → override → preview
 * 
 * @param base - Base token set
 * @param semantic - Semantic token overrides
 * @param mode - Mode-specific tokens (light/dark)
 * @param override - User overrides
 * @param preview - Experimental preview tokens
 * @returns Merged token set
 */
export function mergeTokenSets(
  base: DesignToken[],
  semantic?: DesignToken[],
  modeLight?: DesignToken[],
  modeDark?: DesignToken[],
  currentMode: ThemeMode = 'light',
  override?: DesignToken[],
  preview?: DesignToken[]
): DesignToken[] {
  const layers: TokenLayer[] = [
    { name: 'base', tokens: base, priority: 0 },
  ];

  if (semantic) {
    layers.push({ name: 'semantic', tokens: semantic, priority: 1 });
  }

  if (modeLight && modeDark) {
    const selected = currentMode === 'dark' ? modeDark : modeLight;
    layers.push({ name: `mode-${currentMode}`, tokens: selected, priority: 2 });
  }

  if (override) {
    layers.push({ name: 'override', tokens: override, priority: 3 });
  }

  if (preview) {
    layers.push({ name: 'preview', tokens: preview, priority: 4 });
  }

  return mergeTokenLayers(layers);
}

/**
 * Select mode-specific tokens
 * 
 * @param lightTokens - Light mode tokens
 * @param darkTokens - Dark mode tokens
 * @param mode - Current theme mode
 * @returns Mode-appropriate tokens
 */
export function selectModeTokens(
  lightTokens: DesignToken[],
  darkTokens: DesignToken[],
  mode: ThemeMode
): DesignToken[] {
  return mode === 'dark' ? darkTokens : lightTokens;
}

/**
 * Validate merge result
 * Ensures no reserved namespaces were overridden
 * 
 * @param base - Base token set
 * @param merged - Merged token set
 * @returns Validation result
 */
export function validateMerge(
  base: DesignToken[],
  merged: DesignToken[]
): {
  valid: boolean;
  violations: string[];
} {
  const baseMap = new Map(base.map((t) => [t.name, t]));
  const violations: string[] = [];
  
  for (const token of merged) {
    if (isReservedNamespace(token.name)) {
      const baseToken = baseMap.get(token.name);
      if (baseToken && JSON.stringify(baseToken.value) !== JSON.stringify(token.value)) {
        violations.push(token.name);
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}
