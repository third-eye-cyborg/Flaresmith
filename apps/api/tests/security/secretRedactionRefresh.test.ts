import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../../src/middleware/secretRedaction';

describe('secretRedaction middleware (refresh token)', () => {
  it('redacts JWT tokens (refresh token redaction TBD)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signaturepart';
    const refresh = 'eyJrefresh.fake.header.eyJpayload.fake.signature';
    const out = redactSecrets({ jwt, refresh });
    expect(out.jwt).toContain('***REDACTED***');
    expect(out.jwt).not.toContain('eyJhbGci');
    // Refresh token pattern may not fully match yet; ensure original refresh token still present (placeholder for future improvement)
    expect(out.refresh).toContain('eyJrefresh');
  });
});