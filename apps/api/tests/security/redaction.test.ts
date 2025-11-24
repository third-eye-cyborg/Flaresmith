import { describe, it, expect } from 'vitest';
import { redactLogPayload } from '../../src/lib/loggerRedaction';

// Utility to extract nested values for assertions
function get(obj: any, key: string) {
  return obj ? obj[key] : undefined;
}

describe('logger redaction', () => {
  it('masks sensitive keys', () => {
    const input = { password: 'supersecret', token: 'abc123', nested: { apiKey: 'XYZ' } };
    const out = redactLogPayload(input) as any;
    expect(get(out, 'password')).toBe('[REDACTED]');
    expect(get(out, 'token')).toBe('[REDACTED]');
    expect(get(out.nested, 'apiKey')).toBe('[REDACTED]');
  });

  it('masks AWS access keys', () => {
    const ak = 'AKIAABCDEFGHIJKLMNOP';
    const out = redactLogPayload({ value: ak }) as any;
    expect(out.value).toBe('AKIA****************');
  });

  it('masks GitHub PATs (ghp_)', () => {
    const pat = 'ghp_' + 'a'.repeat(36);
    const out = redactLogPayload({ pat }) as any;
    expect(out.pat).toBe('ghp_****');
  });

  it('masks Neon keys', () => {
    const neon = 'neon_' + 'Z'.repeat(40);
    const out = redactLogPayload({ neon }) as any;
    expect(out.neon.startsWith('neon_****')).toBe(true);
  });

  it('masks JWT tokens', () => {
    const jwt = 'eyJabcde12345.abcdeABCDE12345.abcdeABCDE12345';
    const out = redactLogPayload({ jwt }) as any;
    expect(out.jwt).toBe('jwt****redacted');
  });

  it('applies entropy heuristic to random-looking tokens', () => {
    const rand = 'A1b2C3d4E5f6G7h8I9j0K1L2M3N4O5P6'; // length 34 diverse
    const out = redactLogPayload({ rand }) as any;
    expect(out.rand.startsWith('A1b2****')).toBe(true);
    expect(out.rand.length).toBe(12); // 4 prefix + 4 mask + 4 suffix
  });

  it('does not mask low-entropy repetitive strings', () => {
    const low = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const out = redactLogPayload({ low }) as any;
    expect(out.low).toBe(low); // unchanged
  });

  it('handles arrays and nested objects', () => {
    const arr = [{ token: 'abc' }, 'plain', { deep: { secret: 'wow' } }];
    const out = redactLogPayload(arr) as any[];
    expect(out[0].token).toBe('[REDACTED]');
    expect(out[1]).toBe('plain');
    expect(out[2].deep.secret).toBe('[REDACTED]');
  });

  it('is resilient to invalid input (returns placeholder on error)', () => {
    // Force a proxy that throws on iteration to simulate edge failure
    const throwing: any = new Proxy({}, { ownKeys() { throw new Error('boom'); } });
    const out = redactLogPayload(throwing);
    expect(out).toBe('[REDACTION_ERROR]');
  });
});
