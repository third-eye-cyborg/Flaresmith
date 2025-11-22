import { describe, it, expect } from 'vitest';
import { PreviewService } from '../../src/services/previewService';

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe('Preview TTL Expiry (T165 / FR-034)', () => {
  it('does not expire when ttlExpiresAt is null (core env)', async () => {
    const expired = PreviewService.hasExpired(new Date(), null);
    expect(expired).toBe(false);
  });

  it('is not expired before TTL boundary', async () => {
    const ttl = hoursFromNow(1); // 1h ahead
    const expired = PreviewService.hasExpired(new Date(), ttl);
    expect(expired).toBe(false);
  });

  it('expires exactly at TTL boundary', async () => {
    const now = new Date();
    const ttl = now.toISOString();
    const expired = PreviewService.hasExpired(now, ttl);
    expect(expired).toBe(true);
  });

  it('expires after TTL boundary', async () => {
    const ttl = hoursAgo(2); // expired 2h ago
    const expired = PreviewService.hasExpired(new Date(), ttl);
    expect(expired).toBe(true);
  });

  it('future large TTL (72h default) remains active', async () => {
    const ttl = hoursFromNow(72);
    const expired = PreviewService.hasExpired(new Date(), ttl);
    expect(expired).toBe(false);
  });
});
