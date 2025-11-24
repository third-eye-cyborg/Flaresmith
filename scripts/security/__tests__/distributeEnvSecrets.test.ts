import { describe, it, expect } from 'vitest';
import { mapEnvironmentSpecific, isExcluded } from '../distributeEnvSecrets';

describe('mapEnvironmentSpecific', () => {
  it('maps *_DEV suffix', () => {
    const r = mapEnvironmentSpecific('DATABASE_URL_DEV');
    expect(r).toBeDefined();
    expect(r!.baseName).toBe('DATABASE_URL');
    expect(r!.envName).toBe('dev');
  });
  it('returns undefined for non-suffixed', () => {
    const r = mapEnvironmentSpecific('DATABASE_URL');
    expect(r).toBeUndefined();
  });
});

describe('isExcluded', () => {
  it('excludes matching pattern', () => {
    expect(isExcluded('GITHUB_TOKEN', ['^GITHUB_TOKEN$'])).toBe(true);
  });
  it('does not exclude unmatched name', () => {
    expect(isExcluded('POSTHOG_API_KEY', ['^GITHUB_TOKEN$'])).toBe(false);
  });
});
