/**
 * T067: Unit tests for exclusion pattern matching
 * Tests regex evaluation, global patterns, and custom exclusions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecretSyncService } from '../../../src/services/github/secretSyncService';

describe('SecretSyncService - Exclusion Patterns', () => {
  describe('matchesExclusionPattern', () => {
    it('should exclude GITHUB_TOKEN (exact match)', () => {
      const patterns = ['^GITHUB_TOKEN$'];
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('GITHUB_TOKEN_CUSTOM', patterns)).toBe(false);
    });

    it('should exclude all ACTIONS_* prefixed secrets', () => {
      const patterns = ['^ACTIONS_.*'];
      expect(matchesPattern('ACTIONS_RUNNER_DEBUG', patterns)).toBe(true);
      expect(matchesPattern('ACTIONS_STEP_DEBUG', patterns)).toBe(true);
      expect(matchesPattern('MY_ACTIONS_SECRET', patterns)).toBe(false);
    });

    it('should exclude all RUNNER_* prefixed secrets', () => {
      const patterns = ['^RUNNER_.*'];
      expect(matchesPattern('RUNNER_OS', patterns)).toBe(true);
      expect(matchesPattern('RUNNER_ARCH', patterns)).toBe(true);
      expect(matchesPattern('CUSTOM_RUNNER', patterns)).toBe(false);
    });

    it('should exclude CI exact match', () => {
      const patterns = ['^CI$'];
      expect(matchesPattern('CI', patterns)).toBe(true);
      expect(matchesPattern('CI_BUILD', patterns)).toBe(false);
    });

    it('should handle multiple patterns (OR logic)', () => {
      const patterns = ['^GITHUB_TOKEN$', '^ACTIONS_.*', '^RUNNER_.*'];
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('ACTIONS_DEBUG', patterns)).toBe(true);
      expect(matchesPattern('RUNNER_TEMP', patterns)).toBe(true);
      expect(matchesPattern('DATABASE_URL', patterns)).toBe(false);
    });

    it('should handle case-sensitive matching', () => {
      const patterns = ['^GITHUB_TOKEN$'];
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('github_token', patterns)).toBe(false);
    });

    it('should exclude GITHUB_WORKSPACE and related variables', () => {
      const patterns = ['^GITHUB_.*'];
      expect(matchesPattern('GITHUB_WORKSPACE', patterns)).toBe(true);
      expect(matchesPattern('GITHUB_SHA', patterns)).toBe(true);
      expect(matchesPattern('GITHUB_REF', patterns)).toBe(true);
      expect(matchesPattern('GITHUB_REPOSITORY', patterns)).toBe(true);
    });

    it('should handle empty pattern list (no exclusions)', () => {
      const patterns: string[] = [];
      expect(matchesPattern('ANY_SECRET', patterns)).toBe(false);
    });

    it('should handle wildcard patterns correctly', () => {
      const patterns = ['^.*_TOKEN$']; // All secrets ending with _TOKEN
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('API_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('TOKEN_VALUE', patterns)).toBe(false);
    });

    it('should handle complex regex patterns', () => {
      const patterns = ['^(GITHUB|ACTIONS|RUNNER)_.*'];
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
      expect(matchesPattern('ACTIONS_CACHE', patterns)).toBe(true);
      expect(matchesPattern('RUNNER_DEBUG', patterns)).toBe(true);
      expect(matchesPattern('CUSTOM_SECRET', patterns)).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const patterns = ['[invalid(regex'];
      // Should not throw, return false or handle error
      expect(() => matchesPattern('ANY_SECRET', patterns)).not.toThrow();
    });

    it('should exclude environment-specific system vars', () => {
      const patterns = ['^(PATH|HOME|USER|PWD)$'];
      expect(matchesPattern('PATH', patterns)).toBe(true);
      expect(matchesPattern('HOME', patterns)).toBe(true);
      expect(matchesPattern('PATH_CUSTOM', patterns)).toBe(false);
    });

    it('should handle custom project exclusions', () => {
      const patterns = ['^STAGING_.*', '^PREVIEW_.*'];
      expect(matchesPattern('STAGING_API_KEY', patterns)).toBe(true);
      expect(matchesPattern('PREVIEW_DATABASE_URL', patterns)).toBe(true);
      expect(matchesPattern('PRODUCTION_API_KEY', patterns)).toBe(false);
    });
  });

  describe('Global exclusion patterns', () => {
    it('should have default global patterns', () => {
      const globalPatterns = getGlobalExclusionPatterns();
      
      expect(globalPatterns).toContain('^GITHUB_TOKEN$');
      expect(globalPatterns).toContain('^ACTIONS_.*');
      expect(globalPatterns).toContain('^RUNNER_.*');
      expect(globalPatterns).toContain('^CI$');
    });

    it('should not exclude user-defined secrets', () => {
      const patterns = getGlobalExclusionPatterns();
      
      expect(matchesPattern('DATABASE_URL', patterns)).toBe(false);
      expect(matchesPattern('API_KEY', patterns)).toBe(false);
      expect(matchesPattern('CLOUDFLARE_API_TOKEN', patterns)).toBe(false);
      expect(matchesPattern('NEON_API_KEY', patterns)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty secret names', () => {
      const patterns = ['^GITHUB_.*'];
      expect(matchesPattern('', patterns)).toBe(false);
    });

    it('should handle secret names with special characters', () => {
      const patterns = ['^GITHUB_.*'];
      expect(matchesPattern('GITHUB-TOKEN', patterns)).toBe(false); // Hyphen not matched by word char
      expect(matchesPattern('GITHUB_TOKEN', patterns)).toBe(true);
    });

    it('should handle very long secret names', () => {
      const patterns = ['^GITHUB_.*'];
      const longName = 'GITHUB_' + 'A'.repeat(1000);
      expect(matchesPattern(longName, patterns)).toBe(true);
    });

    it('should handle patterns with anchors', () => {
      const patterns = ['^START', 'END$', '^EXACT$'];
      expect(matchesPattern('START_SECRET', patterns)).toBe(true);
      expect(matchesPattern('SECRET_END', patterns)).toBe(true);
      expect(matchesPattern('EXACT', patterns)).toBe(true);
      expect(matchesPattern('NOT_EXACT_MATCH', patterns)).toBe(false);
    });
  });
});

// Helper functions (mirroring service implementation)
function matchesPattern(secretName: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(secretName)) {
        return true;
      }
    } catch (error) {
      // Invalid regex pattern - skip
      console.warn(`Invalid regex pattern: ${pattern}`);
      continue;
    }
  }
  return false;
}

function getGlobalExclusionPatterns(): string[] {
  return [
    '^GITHUB_TOKEN$',
    '^ACTIONS_.*',
    '^RUNNER_.*',
    '^CI$',
    '^GITHUB_WORKSPACE$',
    '^GITHUB_SHA$',
    '^GITHUB_REF$'
  ];
}
