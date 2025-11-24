// T054: Unit tests for canonicalizer utility
// Feature: 006-design-sync-integration
// Validates hash determinism, deduplication, and operation hash stability.

import { describe, it, expect } from 'vitest';
import { canonicalizeDiff, canonicalizeDiffs, computeOperationHash, buildCanonicalizedOperation } from '../../src/utils/designSync/canonicalize';

describe('canonicalize', () => {
  describe('canonicalizeDiff', () => {
    it('produces stable diffHash for identical inputs', async () => {
      const input = { componentId: 'comp-123', changeTypes: ['modified:prop1'], severity: 'low' as const };
      const a = await canonicalizeDiff(input);
      const b = await canonicalizeDiff(input);
      expect(a.diffHash).toBe(b.diffHash);
    });

    it('produces different hashes for different change types', async () => {
      const a = await canonicalizeDiff({ componentId: 'comp-123', changeTypes: ['added:prop1'], severity: 'low' as const });
      const b = await canonicalizeDiff({ componentId: 'comp-123', changeTypes: ['removed:prop1'], severity: 'low' as const });
      expect(a.diffHash).not.toBe(b.diffHash);
    });

    it('normalizes change type order for determinism', async () => {
      const a = await canonicalizeDiff({ componentId: 'comp-123', changeTypes: ['modified:b', 'added:a'], severity: 'low' as const });
      const b = await canonicalizeDiff({ componentId: 'comp-123', changeTypes: ['added:a', 'modified:b'], severity: 'low' as const });
      expect(a.diffHash).toBe(b.diffHash);
    });

    it('handles legacy componentName format', async () => {
      const legacy = { componentName: 'MyButton', variant: 'primary', changedFields: ['color'] };
      const result = await canonicalizeDiff(legacy as any);
      expect(result.kind).toBe('legacy');
      expect(result.componentRef).toBe('MyButton');
      expect(result.variant).toBe('primary');
      expect(result.changes).toEqual(['color']);
    });
  });

  describe('canonicalizeDiffs', () => {
    it('deduplicates identical diff hashes', async () => {
      const inputs = [
        { componentId: 'comp-1', changeTypes: ['modified:a'], severity: 'low' as const },
        { componentId: 'comp-1', changeTypes: ['modified:a'], severity: 'low' as const },
      ];
      const results = await canonicalizeDiffs(inputs as any);
      expect(results.length).toBe(1);
    });

    it('sorts by componentRef for stable ordering', async () => {
      const inputs = [
        { componentId: 'comp-b', changeTypes: ['modified:x'], severity: 'low' as const },
        { componentId: 'comp-a', changeTypes: ['modified:y'], severity: 'low' as const },
      ];
      const results = await canonicalizeDiffs(inputs as any);
      expect(results.length).toBe(2);
      expect(results[0]?.componentRef).toBe('comp-a');
      expect(results[1]?.componentRef).toBe('comp-b');
    });
  });

  describe('computeOperationHash', () => {
    it('produces deterministic hash given same components + direction', async () => {
      const components = ['comp-1', 'comp-2'];
      const directionModes = { 'comp-1': 'bidirectional', 'comp-2': 'code_to_design' };
      const diffHashes = ['hash-a', 'hash-b'];
      const hashA = await computeOperationHash(components, directionModes, diffHashes);
      const hashB = await computeOperationHash(components, directionModes, diffHashes);
      expect(hashA).toBe(hashB);
    });

    it('produces different hash when direction modes change', async () => {
      const components = ['comp-1'];
      const diffHashes = ['hash-a'];
      const hashA = await computeOperationHash(components, { 'comp-1': 'bidirectional' }, diffHashes);
      const hashB = await computeOperationHash(components, { 'comp-1': 'design_to_code' }, diffHashes);
      expect(hashA).not.toBe(hashB);
    });
  });

  describe('buildCanonicalizedOperation', () => {
    it('returns canonical items and operation hash', async () => {
      const raws = [{ componentId: 'comp-x', changeTypes: ['added:field1'], severity: 'medium' as const }];
      const components = ['comp-x'];
      const directionModes = { 'comp-x': 'bidirectional' };
      const result = await buildCanonicalizedOperation(raws as any, components, directionModes);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.componentRef).toBe('comp-x');
      expect(typeof result.operationHash).toBe('string');
      expect(result.operationHash.length).toBeGreaterThan(0);
    });
  });
});
