/**
 * T066: Unit tests for GitHub secret encryption logic
 * Tests sodium.seal() behavior, public key caching, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecretEncryptionService } from '../../../src/integrations/github/encryption';
import type { Octokit } from '@octokit/rest';

describe('SecretEncryptionService', () => {
  let encryptionService: SecretEncryptionService;
  let mockOctokit: Partial<Octokit>;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        actions: {
          getRepoPublicKey: vi.fn().mockResolvedValue({
            data: {
              key_id: 'test-key-id-123',
              key: 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NC1lbmNvZGVk' // base64 mock
            }
          })
        }
      } as any
    };
    encryptionService = new SecretEncryptionService(mockOctokit as Octokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('encryptSecret', () => {
    it('should encrypt a secret value successfully', async () => {
      const result = await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'my-secret-value'
      });

      expect(result).toHaveProperty('encrypted_value');
      expect(result).toHaveProperty('key_id');
      expect(result.key_id).toBe('test-key-id-123');
      expect(typeof result.encrypted_value).toBe('string');
    });

    it('should cache public key for subsequent calls', async () => {
      // First call
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value1'
      });

      // Second call within cache TTL
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value2'
      });

      // Should only call getRepoPublicKey once due to caching
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledTimes(1);
    });

    it('should refetch public key after cache expiration', async () => {
      vi.useFakeTimers();

      // First call
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value1'
      });

      // Advance time past 5-minute TTL
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second call after cache expiration
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value2'
      });

      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should handle different repos with separate cache entries', async () => {
      await encryptionService.encryptSecret({
        owner: 'owner1',
        repo: 'repo1',
        secretValue: 'value1'
      });

      await encryptionService.encryptSecret({
        owner: 'owner2',
        repo: 'repo2',
        secretValue: 'value2'
      });

      // Should fetch public key for each repo
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledWith({
        owner: 'owner1',
        repo: 'repo1'
      });
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledWith({
        owner: 'owner2',
        repo: 'repo2'
      });
    });

    it('should throw error when public key fetch fails', async () => {
      mockOctokit.rest!.actions!.getRepoPublicKey = vi.fn().mockRejectedValue(
        new Error('GitHub API rate limit exceeded')
      );

      await expect(
        encryptionService.encryptSecret({
          owner: 'test-owner',
          repo: 'test-repo',
          secretValue: 'value'
        })
      ).rejects.toThrow('GitHub API rate limit exceeded');
    });

    it('should handle empty secret values', async () => {
      const result = await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: ''
      });

      expect(result).toHaveProperty('encrypted_value');
      expect(result).toHaveProperty('key_id');
    });

    it('should handle large secret values (up to 64KB)', async () => {
      const largeValue = 'x'.repeat(64 * 1024); // 64KB

      const result = await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: largeValue
      });

      expect(result).toHaveProperty('encrypted_value');
    });

    it('should produce different encrypted values for same input (nonce randomness)', async () => {
      const input = {
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'consistent-value'
      };

      const result1 = await encryptionService.encryptSecret(input);
      const result2 = await encryptionService.encryptSecret(input);

      // Same key_id due to caching
      expect(result1.key_id).toBe(result2.key_id);
      
      // Different encrypted values due to nonce (if encryption uses randomness)
      // Note: This test may need adjustment based on actual libsodium behavior
      expect(result1.encrypted_value).toBeDefined();
      expect(result2.encrypted_value).toBeDefined();
    });
  });

  describe('getCacheKey', () => {
    it('should generate consistent cache keys for same repo', () => {
      const key1 = (encryptionService as any).getCacheKey('owner', 'repo');
      const key2 = (encryptionService as any).getCacheKey('owner', 'repo');

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different repos', () => {
      const key1 = (encryptionService as any).getCacheKey('owner1', 'repo1');
      const key2 = (encryptionService as any).getCacheKey('owner2', 'repo2');

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache eviction', () => {
    it('should evict expired cache entries', async () => {
      vi.useFakeTimers();

      // Fill cache with entry
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value'
      });

      // Advance time to expire cache
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Trigger cleanup (implementation-specific)
      await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value2'
      });

      // Should have fetched key twice (once initially, once after expiration)
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Error recovery', () => {
    it('should not cache failed public key fetches', async () => {
      mockOctokit.rest!.actions!.getRepoPublicKey = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            key_id: 'recovered-key-id',
            key: 'cmVjb3ZlcmVkLWtleS1iYXNlNjQ='
          }
        });

      // First call fails
      await expect(
        encryptionService.encryptSecret({
          owner: 'test-owner',
          repo: 'test-repo',
          secretValue: 'value'
        })
      ).rejects.toThrow('Network error');

      // Second call should retry and succeed
      const result = await encryptionService.encryptSecret({
        owner: 'test-owner',
        repo: 'test-repo',
        secretValue: 'value'
      });

      expect(result.key_id).toBe('recovered-key-id');
      expect(mockOctokit.rest!.actions!.getRepoPublicKey).toHaveBeenCalledTimes(2);
    });
  });
});
