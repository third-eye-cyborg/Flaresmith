import { describe, it, expect } from 'vitest';
import { evaluateKeyRotationCompliance, type JwtKeyRecord } from '../../src/security/keyRotationCompliance';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe('SC-011 key rotation compliance', () => {
  it('passes when active key age <= 92 days and grace key within 7-day window', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'prev', active: false, createdAt: daysAgo(5), rotatedAt: daysAgo(5) },
      { kid: 'active', active: true, createdAt: daysAgo(10) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    expect(res.compliant).toBe(true);
    expect(res.activeAgeDays).toBeGreaterThan(9); // ~10
    expect(res.activeAgeDays).toBeLessThanOrEqual(92);
    expect(res.graceKeyValid).toBe(true);
    expect(res.violations.length).toBe(0);
  });

  it('flags violation when active key age exceeds threshold', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'active', active: true, createdAt: daysAgo(120) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    expect(res.compliant).toBe(false);
    expect(res.violations).toContain('ACTIVE_KEY_TOO_OLD');
  });

  it('flags grace key expiry beyond 7 days', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'old', active: false, createdAt: daysAgo(20), rotatedAt: daysAgo(20) },
      { kid: 'active', active: true, createdAt: daysAgo(2) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    // Grace key older than 7 days considered expired
    expect(res.compliant).toBe(false);
    expect(res.violations).toContain('GRACE_KEY_EXPIRED');
  });

  it('treats grace key at exact 7-day boundary as valid', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'prev', active: false, createdAt: daysAgo(7), rotatedAt: daysAgo(7) },
      { kid: 'active', active: true, createdAt: daysAgo(1) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    expect(res.compliant).toBe(true);
    expect(res.graceKeyValid).toBe(true);
  });

  it('handles absence of grace key as compliant (fresh rotation)', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'active', active: true, createdAt: daysAgo(1) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    expect(res.compliant).toBe(true);
    expect(res.graceKeyValid).toBe(true);
  });

  it('returns NO_KEYS_PRESENT when empty input', () => {
    const res = evaluateKeyRotationCompliance([]);
    expect(res.compliant).toBe(false);
    expect(res.violations).toContain('NO_KEYS_PRESENT');
  });

  it('returns NO_ACTIVE_KEY when no active key exists', () => {
    const keys: JwtKeyRecord[] = [
      { kid: 'k1', active: false, createdAt: daysAgo(1), rotatedAt: daysAgo(1) },
    ];
    const res = evaluateKeyRotationCompliance(keys);
    expect(res.compliant).toBe(false);
    expect(res.violations).toContain('NO_ACTIVE_KEY');
  });
});
