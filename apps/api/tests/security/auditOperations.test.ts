import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logSecretAudit, listSecretAudit } from '../../src/services/secretAuditService';
import { _internalMetrics, METRICS } from '../../src/lib/metrics';

/**
 * T177 / FR-036: Audit Functional Operations
 * Ensures secret audit log entries recorded for read/update/rotate and metrics counters increment.
 * Uses mocked DB layer to avoid Drizzle dependency.
 */

// Mock getDb to provide minimal insert & query API
vi.mock('../../db/connection', () => {
  const audit: any[] = [];
  return {
    getDb: () => ({
      insert: () => ({ values: (row: any) => { audit.push({ ...row, occurredAt: new Date().toISOString() }); } }),
      query: { secretAudit: { findMany: ({ limit }: any) => audit.slice(0, limit) } }
    })
  };
});

describe('Secret audit operations (T177 / FR-036)', () => {
  const baseParams = {
    projectId: '11111111-1111-4111-8111-111111111111',
    environmentId: '22222222-2222-4222-8222-222222222222',
    secretName: 'API_KEY',
    secretRefHash: 'deadbeefcafebabef00d1234567890abcdef1234567890abcdef1234567890',
    actorId: 'user-xyz'
  };

  beforeEach(() => {
    _internalMetrics.counters[METRICS.secretAccessTotal] = { value: 0 };
    _internalMetrics.counters[METRICS.keyRotationTotal] = { value: 0 };
  });

  it('logs read, update, rotate operations and increments counters', async () => {
    await logSecretAudit({ ...baseParams, operation: 'read', origin: 'user' });
    await logSecretAudit({ ...baseParams, operation: 'update', origin: 'user', metadata: { fields: ['value'] } });
    await logSecretAudit({ ...baseParams, operation: 'rotate', origin: 'system' });

    const entries = await listSecretAudit(baseParams.projectId, baseParams.environmentId, 10);
    expect(entries.length).toBe(3);
    const ops = entries.map(e => e.operation).sort();
    expect(ops).toEqual(['read','rotate','update']);
    expect(_internalMetrics.counters[METRICS.secretAccessTotal].value).toBe(3);
    expect(_internalMetrics.counters[METRICS.keyRotationTotal].value).toBe(1);
  });
});
