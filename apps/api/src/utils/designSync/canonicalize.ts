// T041: Diff canonicalizer utility
// Feature: 006-design-sync-integration
// Responsible for producing stable, deterministic representations of diff items
// and computing hashes used for idempotency, drift detection, and undo state tracking.
// Spec References: FR-001, FR-004, FR-009, FR-020 (diff preview, drift, audit, batch sync)

/**
 * Raw diff item shape variants:
 * 1. SyncComponentDiff (initial draft) => { componentName, variant?, changedFields[], diffHash? }
 * 2. DiffItem (current spec-aligned)   => { componentId, changeTypes[], severity? }
 * We support both forms for forward compatibility during transition.
 */
export interface RawSyncComponentDiff {
  componentName: string;
  variant?: string;
  changedFields?: string[]; // legacy field list
  diffHash?: string;
}

export interface RawDiffItem {
  componentId: string;
  changeTypes: string[];
  severity?: 'low' | 'medium' | 'high';
}

export type AnyRawDiff = RawSyncComponentDiff | RawDiffItem;

export interface CanonicalDiffItem {
  kind: 'legacy' | 'spec';
  componentId: string; // Derived from componentName if legacy (hashed)
  componentRef: string; // Original componentName or componentId for display
  variant?: string | undefined;
  changes: string[]; // Unified list of changes (changedFields || changeTypes)
  severity?: 'low' | 'medium' | 'high' | undefined;
  diffHash: string; // Stable SHA-256 hex digest of canonical JSON
}

/**
 * Stable key ordering function for producing canonical JSON strings.
 */
function stableStringify(obj: Record<string, any>): string {
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      parts.push(`"${k}":${stableStringify(v)}`);
    } else if (Array.isArray(v)) {
      const arr = v.map(x => typeof x === 'object' ? stableStringify(x) : JSON.stringify(x));
      parts.push(`"${k}":[${arr.join(',')}]`);
    } else {
      parts.push(`"${k}":${JSON.stringify(v)}`);
    }
  }
  return `{${parts.join(',')}}`;
}

/** Compute SHA-256 hex digest using Web Crypto (Workers) or Node fallback */
async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node fallback (should rarely trigger in Worker context)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(input).digest('hex');
  }
}

/** Derive pseudo componentId from componentName for legacy entries */
function deriveComponentId(name: string): string {
  // Simple deterministic hash -> uuid-like (not RFC4122 but stable). Could be replaced with mapping lookup.
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `legacy-${base}`;
}

/** Normalize a single raw diff item into CanonicalDiffItem */
export async function canonicalizeDiff(raw: AnyRawDiff): Promise<CanonicalDiffItem> {
  if ('componentName' in raw) {
    const changes = [...new Set(raw.changedFields ?? [])].sort();
    const payload = {
      componentRef: raw.componentName,
      componentId: deriveComponentId(raw.componentName),
      variant: raw.variant || null,
      changes,
      kind: 'legacy' as const,
    };
    const diffHash = await sha256Hex(stableStringify(payload));
    const base: CanonicalDiffItem = {
      kind: 'legacy',
      componentId: payload.componentId,
      componentRef: payload.componentRef,
      changes,
      diffHash,
    };
    if (raw.variant) base.variant = raw.variant;
    return base;
  }
  // Spec form
  const changes = [...new Set(raw.changeTypes)].sort();
  const payload = {
    componentRef: raw.componentId,
    componentId: raw.componentId,
    changes,
    severity: raw.severity || null,
    kind: 'spec' as const,
  };
  const diffHash = await sha256Hex(stableStringify(payload));
  const base: CanonicalDiffItem = {
    kind: 'spec',
    componentId: raw.componentId,
    componentRef: raw.componentId,
    changes,
    diffHash,
  };
  if (raw.severity) base.severity = raw.severity;
  return base;
}

/** Canonicalize an array of raw diff items */
export async function canonicalizeDiffs(raws: AnyRawDiff[]): Promise<CanonicalDiffItem[]> {
  const canonical: CanonicalDiffItem[] = [];
  for (const r of raws) {
    canonical.push(await canonicalizeDiff(r));
  }
  // Deduplicate by diffHash & sort stable
  const map = new Map<string, CanonicalDiffItem>();
  for (const c of canonical) {
    map.set(c.diffHash, c);
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.componentRef === b.componentRef) {
      return (a.variant || '').localeCompare(b.variant || '') || a.diffHash.localeCompare(b.diffHash);
    }
    return a.componentRef.localeCompare(b.componentRef);
  });
}

/** Compute deterministic operation hash given component list & diff hashes */
export async function computeOperationHash(components: string[], directionModes: Record<string, string>, diffHashes: string[]): Promise<string> {
  const sortedModes: Record<string,string> = {};
  for (const k of Object.keys(directionModes).sort()) {
    const val = directionModes[k];
    if (typeof val === 'string') sortedModes[k] = val; // guard against undefined
  }
  const payload = {
    components: [...components].sort(),
    directionModes: sortedModes,
    diffs: [...diffHashes].sort(),
  };
  return sha256Hex(stableStringify(payload));
}

/** Convenience to canonicalize raw diffs and return both items & operation hash */
export async function buildCanonicalizedOperation(raws: AnyRawDiff[], components: string[], directionModes: Record<string,string>): Promise<{ items: CanonicalDiffItem[]; operationHash: string; }> {
  const items = await canonicalizeDiffs(raws);
  const operationHash = await computeOperationHash(components, directionModes, items.map(i => i.diffHash));
  return { items, operationHash };
}

// Future extension: include variant exclusion + pre/post state hashing helpers.
