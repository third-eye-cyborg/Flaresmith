// T042: Drift detection algorithm utility
// Feature: 006-design-sync-integration
// Responsibilities: Produce DiffSummary using heuristic filtering to reduce false positives.
// Spec References: FR-004 (drift summary), SC-006 (≤5% false positives), Research decision #6.

// Local type declarations to avoid alias resolution issues. Mirrors spec Zod schema DiffItem / DiffSummary.
export interface DiffItem {
  componentId: string;
  changeTypes: string[];
  severity?: 'low' | 'medium' | 'high';
}

export interface DriftDetectionResult {
  total: number;
  items: DiffItem[];
  falsePositiveHeuristicsApplied: number;
}
import { canonicalizeDiff } from './canonicalize';

export interface DriftSource {
  componentId: string;
  code: Record<string, any>; // Snapshot of code-side metadata (e.g., props, variant list)
  design: Record<string, any>; // Snapshot of design-side metadata
  variants?: string[]; // Declared variants for additional coverage/diff context
}

export interface DriftDetectionOptions {
  ignoreKeys?: string[]; // Additional keys to ignore (timestamp, formatting-only)
  formattingWhitespaceKeys?: string[]; // Keys where only whitespace changes should be ignored
  maxModifiedThreshold?: number; // Above threshold severity escalates
}

const DEFAULT_IGNORE = [
  'updatedAt',
  'lastStoryUpdate',
  'lastDesignChangeAt',
];

const DEFAULT_WHITESPACE_KEYS = ['description', 'docs'];

function normalizeValue(v: any): any {
  if (typeof v === 'string') {
    return v.trim();
  }
  return v;
}

/** Determine field-level changes with heuristic filters */
function diffFields(code: Record<string, any>, design: Record<string, any>, opts: DriftDetectionOptions) {
  const ignore = new Set([...(opts.ignoreKeys || []), ...DEFAULT_IGNORE]);
  const whitespaceKeys = new Set([...(opts.formattingWhitespaceKeys || []), ...DEFAULT_WHITESPACE_KEYS]);

  const codeKeys = Object.keys(code).filter(k => !ignore.has(k));
  const designKeys = Object.keys(design).filter(k => !ignore.has(k));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  const codeSet = new Set(codeKeys);
  const designSet = new Set(designKeys);

  for (const k of designKeys) {
    if (!codeSet.has(k)) added.push(k);
  }
  for (const k of codeKeys) {
    if (!designSet.has(k)) removed.push(k);
  }
  for (const k of codeKeys) {
    if (designSet.has(k)) {
      const cVal = normalizeValue(code[k]);
      const dVal = normalizeValue(design[k]);
      if (whitespaceKeys.has(k) && typeof code[k] === 'string' && typeof design[k] === 'string') {
        // ignore pure formatting differences
        if (cVal.replace(/\s+/g, ' ') === dVal.replace(/\s+/g, ' ')) continue;
      }
      if (JSON.stringify(cVal) !== JSON.stringify(dVal)) {
        modified.push(k);
      }
    }
  }
  return { added, removed, modified };
}

/** Assign severity based on counts */
function assignSeverity(added: number, removed: number, modified: number, threshold: number): 'low'|'medium'|'high' {
  const total = added + removed + modified;
  if (total === 0) return 'low';
  if (total >= threshold * 2) return 'high';
  if (total >= threshold) return 'medium';
  return 'low';
}

export function detectDrift(sources: DriftSource[], options: DriftDetectionOptions = {}): DriftDetectionResult {
  const items: DiffItem[] = [];
  let heuristicsApplied = 0;
  const threshold = options.maxModifiedThreshold ?? 5;

  for (const s of sources) {
    const { added, removed, modified } = diffFields(s.code, s.design, options);
    if (added.length === 0 && removed.length === 0 && modified.length === 0) {
      heuristicsApplied++; // filtered out as non-drift
      continue;
    }
    const severity = assignSeverity(added.length, removed.length, modified.length, threshold);
    const changeTypes = [...added.map(a => `added:${a}`), ...removed.map(r => `removed:${r}`), ...modified.map(m => `modified:${m}`)];
    items.push({ componentId: s.componentId, changeTypes, severity });
  }

  return { total: items.length, items, falsePositiveHeuristicsApplied: heuristicsApplied };
}

/** Convenience wrapper to integrate with canonicalization (legacy compatibility) */
export async function detectDriftCanonicalized(sources: DriftSource[], options: DriftDetectionOptions = {}) {
  const drift = detectDrift(sources, options);
  // Produce canonical diff hashes for each item (legacy support). We wrap into raw format for canonicalizeDiff.
  const canonicalPromises = drift.items.map((i: DiffItem) => canonicalizeDiff({ componentId: i.componentId, changeTypes: i.changeTypes, severity: i.severity } as any));
  const canonical = await Promise.all(canonicalPromises);
  return { drift, canonical };
}
