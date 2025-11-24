import * as sodium from 'libsodium-wrappers';
import { Octokit } from "@octokit/rest";

/**
 * T009: Secret encryption helper using sodium.seal() with repo public key caching
 * Source: specs/002-github-secrets-sync/research.md (D-002)
 */

interface PublicKey {
  key_id: string;
  key: string;
  expiresAt: number; // Timestamp when cache expires
}

// In-memory cache for public keys (5 minute TTL)
const publicKeyCache = new Map<string, PublicKey>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SecretEncryptionService {
  private octokit: Octokit;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  /**
   * Get repository public key for secret encryption
   * Uses 5-minute cache to reduce API calls
   */
  private async getRepoPublicKey(owner: string, repo: string): Promise<{ key_id: string; key: string }> {
    const cacheKey = `${owner}/${repo}`;
    const cached = publicKeyCache.get(cacheKey);

    // Return cached key if still valid
    if (cached && cached.expiresAt > Date.now()) {
      return { key_id: cached.key_id, key: cached.key };
    }

    // Fetch fresh key from GitHub API
    const { data } = await this.octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });

    // Cache the key
    publicKeyCache.set(cacheKey, {
      key_id: data.key_id,
      key: data.key,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data;
  }

  /**
   * Encrypt secret value using sodium.seal()
   * Returns base64-encoded encrypted value
   */
  async encryptSecret(owner: string, repo: string, secretValue: string): Promise<{
    encrypted_value: string;
    key_id: string;
  }> {
    await sodium.ready;

    // Get public key
    const publicKey = await this.getRepoPublicKey(owner, repo);

    // Convert key from base64 to Uint8Array
    const keyBytes = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL);

    // Convert secret to Uint8Array
    const messageBytes = sodium.from_string(secretValue);

    // Encrypt using libsodium sealed box (anonymous encryption)
    const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);

    // Convert encrypted bytes to base64
    const encryptedValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);

    return {
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    };
  }

  /**
   * Clear cached public key for a repository
   * Useful after encryption errors or key rotation
   */
  clearPublicKeyCache(owner: string, repo: string): void {
    const cacheKey = `${owner}/${repo}`;
    publicKeyCache.delete(cacheKey);
  }

  /**
   * Clear all cached public keys
   */
  clearAllPublicKeyCache(): void {
    publicKeyCache.clear();
  }
}
