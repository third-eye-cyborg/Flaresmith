import { describe, it, expect } from 'vitest';
import { rollbackService } from '../../src/services/rollbackService';

// Helper to validate RFC3339 timestamp (basic)
function isRfc3339(ts: string): boolean {
  const d = new Date(ts);
  return !isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(ts);
}

describe('Deployment Rollback Integration (T171 / FR-016)', () => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const environmentId = '22222222-2222-4222-8222-222222222222';
  const previousDeploymentId = '33333333-3333-4333-8333-333333333333'; // target rollback deployment

  it('cloudflare rollback returns success & deploymentId echo (mock path)', async () => {
    const res = await rollbackService.rollback({
      projectId,
      environmentId,
      targetDeploymentId: previousDeploymentId,
      provider: 'cloudflare'
    });
    expect(res.success).toBe(true);
    expect(res.provider).toBe('cloudflare');
    expect(res.deploymentId).toBe(previousDeploymentId);
    expect(res.message).toMatch(/rolled back successfully/i);
    expect(isRfc3339(res.rolledBackAt)).toBe(true);
    // Timestamp should be within ±2s of now
    const now = Date.now();
    const ts = Date.parse(res.rolledBackAt);
    expect(Math.abs(now - ts)).toBeLessThan(2000);
  });

  it('neon rollback returns success & branchId present (mock path)', async () => {
    const res = await rollbackService.rollback({
      projectId,
      environmentId,
      targetDeploymentId: previousDeploymentId,
      provider: 'neon'
    });
    expect(res.success).toBe(true);
    expect(res.provider).toBe('neon');
    expect(res.branchId).toBeDefined();
    expect(res.message).toMatch(/rolled back successfully/i);
    expect(isRfc3339(res.rolledBackAt)).toBe(true);
    const now = Date.now();
    const ts = Date.parse(res.rolledBackAt);
    expect(Math.abs(now - ts)).toBeLessThan(2000);
  });

  it('unsupported provider (github) fails schema validation', async () => {
    // Provider 'github' not in enum -> expect zod validation error
    await expect(
      rollbackService.rollback({
        projectId,
        environmentId,
        targetDeploymentId: previousDeploymentId,
        provider: 'github' as any // intentional type violation for test
      })
    ).rejects.toThrow(/Invalid enum value|Unsupported rollback provider/);
  });

  it('manual rollback instructions include expected git commands for github', () => {
    const instructions = rollbackService.getManualRollbackInstructions('github', {
      projectId,
      environmentId,
      targetDeploymentId: previousDeploymentId,
      provider: 'cloudflare' // provider field unused in manual text generation for github
    });
    expect(instructions).toMatch(/git revert/);
    expect(instructions).toMatch(/git reset --hard/);
  });

  it('repeat rollback call is idempotent in mock implementation', async () => {
    const first = await rollbackService.rollback({
      projectId,
      environmentId,
      targetDeploymentId: previousDeploymentId,
      provider: 'cloudflare'
    });
    const second = await rollbackService.rollback({
      projectId,
      environmentId,
      targetDeploymentId: previousDeploymentId,
      provider: 'cloudflare'
    });
    expect(first.success && second.success).toBe(true);
    expect(first.deploymentId).toBe(second.deploymentId);
    // Idempotent mock path returns same timestamp; ensure RFC3339 validity
    expect(isRfc3339(first.rolledBackAt)).toBe(true);
    expect(isRfc3339(second.rolledBackAt)).toBe(true);
  });

  it('fails validation when targetDeploymentId missing', async () => {
    await expect(
      rollbackService.rollback({
        projectId,
        environmentId,
        provider: 'cloudflare'
      } as any) // intentionally omitting targetDeploymentId for negative test
    ).rejects.toThrow(/required|targetDeploymentId/);
  });
});
