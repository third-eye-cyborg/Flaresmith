/**
 * T013: Circular Reference Detector
 * Feature: 004-design-system
 * Decision: D-009 (DFS algorithm)
 * 
 * Detects circular references in token overrides using depth-first search
 * enabling validation before override application.
 */

import type { TokenDiff } from '@flaresmith/types';

/**
 * Token reference pattern: ${token.name}
 */
const TOKEN_REF_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Extract token references from a value
 * 
 * @param value - Token value (may contain references)
 * @returns Array of referenced token names
 */
export function extractTokenReferences(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  
  const references: string[] = [];
  const matches = value.matchAll(TOKEN_REF_PATTERN);
  
  for (const match of matches) {
    if (match[1]) {
      references.push(match[1]);
    }
  }
  
  return references;
}

/**
 * Build token dependency graph from diff
 * 
 * @param diff - Token diff array
 * @returns Dependency graph (token name → referenced token names)
 */
export function buildDependencyGraph(
  diff: TokenDiff[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  for (const change of diff) {
    const references = extractTokenReferences(change.newValue);
    graph.set(change.name, references);
  }
  
  return graph;
}

/**
 * Detect circular references using DFS
 * 
 * @param graph - Dependency graph
 * @returns Array of circular reference chains
 */
export function detectCircularReferences(
  graph: Map<string, string[]>
): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node];
      cycles.push(cycle);
      return;
    }
    
    if (visited.has(node)) {
      return; // Already explored this path
    }
    
    visited.add(node);
    recursionStack.add(node);
    
    const references = graph.get(node) || [];
    for (const ref of references) {
      dfs(ref, [...path, node]);
    }
    
    recursionStack.delete(node);
  }
  
  // Start DFS from each node
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }
  
  return cycles;
}

/**
 * Validate token diff for circular references
 * 
 * @param diff - Token diff array
 * @returns Validation result
 */
export function validateCircularReferences(
  diff: TokenDiff[]
): {
  valid: boolean;
  cycles: string[][];
  message?: string;
} {
  const graph = buildDependencyGraph(diff);
  const cycles = detectCircularReferences(graph);
  
  if (cycles.length === 0) {
    return { valid: true, cycles: [] };
  }
  
  const cycleDescriptions = cycles.map((cycle) => cycle.join(' → '));
  
  return {
    valid: false,
    cycles,
    message: `Circular references detected: ${cycleDescriptions.join('; ')}`,
  };
}

/**
 * Format cycle for error message
 * 
 * @param cycle - Array of token names forming a cycle
 * @returns Formatted cycle description
 */
export function formatCycle(cycle: string[]): string {
  return cycle.join(' → ');
}
