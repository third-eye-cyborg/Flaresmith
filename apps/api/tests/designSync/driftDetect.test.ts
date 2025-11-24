// T055: Unit tests for drift detection algorithm
// Feature: 006-design-sync-integration
// Validates heuristic filtering, severity assignment, false positive reduction.

import { describe, it, expect } from 'vitest';
import { detectDrift } from '../../src/utils/designSync/driftDetect';
import type { DriftSource } from '../../src/utils/designSync/driftDetect';

describe('driftDetect', () => {
  it('detects no drift when code and design match', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { version: 1 }, design: { version: 1 } },
    ];
    const result = detectDrift(sources);
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('detects drift when fields differ', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { version: 1 }, design: { version: 2 } },
    ];
    const result = detectDrift(sources);
    expect(result.total).toBe(1);
    expect(result.items[0]?.componentId).toBe('comp-1');
    expect(result.items[0]?.changeTypes).toContain('modified:version');
  });

  it('ignores timestamp-only changes (default ignore list)', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { updatedAt: '2025-01-01', field: 'a' }, design: { updatedAt: '2025-01-02', field: 'a' } },
    ];
    const result = detectDrift(sources);
    expect(result.total).toBe(0);
    expect(result.falsePositiveHeuristicsApplied).toBe(1);
  });

  it('ignores whitespace-only diffs in description fields', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { description: 'Hello  world' }, design: { description: 'Hello world' } },
    ];
    const result = detectDrift(sources);
    expect(result.total).toBe(0);
  });

  it('assigns severity based on change count', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { a: 1, b: 2 }, design: { a: 2, b: 3, c: 4 } }, // 2 modified + 1 added
    ];
    const result = detectDrift(sources, { maxModifiedThreshold: 2 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.severity).toBe('medium'); // 3 total changes >= threshold
  });

  it('detects added and removed fields', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { field1: 'val1' }, design: { field2: 'val2' } },
    ];
    const result = detectDrift(sources);
    expect(result.total).toBe(1);
    const item = result.items[0];
    expect(item?.changeTypes.some(ct => ct.startsWith('added:'))).toBe(true);
    expect(item?.changeTypes.some(ct => ct.startsWith('removed:'))).toBe(true);
  });

  it('applies custom ignore keys', () => {
    const sources: DriftSource[] = [
      { componentId: 'comp-1', code: { customKey: 'a', real: 1 }, design: { customKey: 'b', real: 2 } },
    ];
    const result = detectDrift(sources, { ignoreKeys: ['customKey'] });
    expect(result.items[0]?.changeTypes).not.toContain('modified:customKey');
    expect(result.items[0]?.changeTypes).toContain('modified:real');
  });
});
