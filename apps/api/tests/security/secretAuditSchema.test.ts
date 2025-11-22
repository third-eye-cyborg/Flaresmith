import { describe, it, expect } from 'vitest';
import { SecretAuditRecordSchema } from '@cloudmake/types';

describe('SecretAuditRecordSchema (FR-036)', () => {
  const base = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    secretRefHash: 'deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef',
    operation: 'read',
    origin: 'user',
    actorId: '123e4567-e89b-12d3-a456-426614174111',
    timestamp: new Date().toISOString()
  } as const;

  it('valid user-origin record parses', () => {
    const parsed = SecretAuditRecordSchema.parse(base);
    expect(parsed.operation).toBe('read');
  });

  it('fails when origin=user and actorId missing', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, actorId: undefined })).toThrow(/actorId required/);
  });

  it('allows system-origin record without actorId', () => {
    const record = { ...base, origin: 'system', actorId: undefined };
    const parsed = SecretAuditRecordSchema.parse(record);
    expect(parsed.origin).toBe('system');
  });

  it('rejects invalid origin', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, origin: 'machine' as any })).toThrow(/Invalid enum value/);
  });

  it('rejects invalid operation', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, operation: 'delete' as any })).toThrow(/Invalid enum value/);
  });

  it('rejects invalid timestamp format', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, timestamp: 'not-a-date' })).toThrow(/Invalid datetime/);
  });

  it('rejects empty secretRefHash', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, secretRefHash: '' })).toThrow();
  });

  it('rejects unexpected secretValue leakage', () => {
    expect(() => SecretAuditRecordSchema.parse({ ...base, secretValue: 'SUPER_SECRET' })).toThrow();
  });

  it('rotate operation valid (system origin)', () => {
    const rec = { ...base, origin: 'system', operation: 'rotate' as const, actorId: undefined };
    const parsed = SecretAuditRecordSchema.parse(rec);
    expect(parsed.operation).toBe('rotate');
  });
});