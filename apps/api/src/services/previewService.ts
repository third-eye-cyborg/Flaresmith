import { z } from 'zod';
import { logger } from '../middleware/logging';
import { getDb } from '../../db/connection';
import { sql } from 'drizzle-orm';

/**
 * Preview Service
 * 
 * Handles preview environment URL generation for feature branches.
 * Per FR-014: Preview URLs follow pattern: https://preview-<branchSlug>.<projectId>.pages.dev
 */

const PreviewUrlConfigSchema = z.object({
  projectId: z.string().uuid(),
  branchName: z.string().min(1),
  provider: z.enum(['cloudflare-pages', 'cloudflare-workers', 'vercel']).default('cloudflare-pages'),
  customDomain: z.string().optional(),
});

type PreviewUrlConfig = z.infer<typeof PreviewUrlConfigSchema>;

interface PreviewUrlResult {
  url: string;
  branchSlug: string;
  expiresAt: string | null;
  provider: string;
}

export class PreviewService {
  /**
   * Generate preview URL for a feature branch
   */
  async generatePreviewUrl(config: PreviewUrlConfig): Promise<PreviewUrlResult> {
    const validated = PreviewUrlConfigSchema.parse(config);
    
    // Convert branch name to URL-safe slug
    const branchSlug = this.createBranchSlug(validated.branchName);
    
    logger.info({
      action: 'preview.url.generated',
      projectId: validated.projectId,
      branchName: validated.branchName,
      branchSlug,
      provider: validated.provider,
    });

    let url: string;

    switch (validated.provider) {
      case 'cloudflare-pages':
        url = validated.customDomain
          ? `https://preview-${branchSlug}.${validated.customDomain}`
          : `https://preview-${branchSlug}.${validated.projectId}.pages.dev`;
        break;
      
      case 'cloudflare-workers':
        url = `https://preview-${branchSlug}.${validated.projectId}.workers.dev`;
        break;
      
      case 'vercel':
        url = `https://preview-${branchSlug}-${validated.projectId}.vercel.app`;
        break;
      
      default:
        throw new Error(`Unsupported preview provider: ${validated.provider}`);
    }

    // Calculate TTL expiration (default 72h from now)
    const ttlHours = Number(process.env.CM_PREVIEW_TTL_HOURS || '72');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    return {
      url,
      branchSlug,
      expiresAt,
      provider: validated.provider,
    };
  }

  /**
   * Create URL-safe slug from branch name
   * Converts feature/add-auth → add-auth
   * Converts feat/123-bug-fix → 123-bug-fix
   */
  private createBranchSlug(branchName: string): string {
    return branchName
      .replace(/^(feature|feat|fix|hotfix|bugfix)\//i, '') // Remove common prefixes
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with dash
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }

  /**
   * Validate preview URL pattern
   */
  isValidPreviewUrl(url: string): boolean {
    const previewPatterns = [
      /^https:\/\/preview-[a-z0-9-]+\.[a-f0-9-]+\.pages\.dev$/,
      /^https:\/\/preview-[a-z0-9-]+\.[a-f0-9-]+\.workers\.dev$/,
      /^https:\/\/preview-[a-z0-9-]+-[a-f0-9-]+\.vercel\.app$/,
    ];

    return previewPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract branch slug from preview URL
   */
  extractBranchSlug(url: string): string | null {
    const match = url.match(/preview-([a-z0-9-]+)\./);
    return match && match[1] ? match[1] : null;
  }

  /**
   * Check if preview environment has expired based on TTL
   */
  async isPreviewExpired(createdAt: string, ttlExpiresAt: string | null): Promise<boolean> {
    if (!ttlExpiresAt) {
      return false; // Core environments don't expire
    }

    const now = new Date();
    const expiresAt = new Date(ttlExpiresAt);
    
    const expired = now >= expiresAt;

    if (expired) {
      logger.info({
        action: 'preview.ttl.expired',
        createdAt,
        ttlExpiresAt,
        expiredHoursAgo: (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60),
      });
    }

    return expired;
  }

  /**
   * Pure helper for testability without logger side effects
   */
  static hasExpired(now: Date, ttlExpiresAt: string | null): boolean {
    if (!ttlExpiresAt) return false;
    return now.getTime() >= new Date(ttlExpiresAt).getTime();
  }

  /**
   * Get preview environments count for a project
   * Used to enforce preview cap (max 15 concurrent)
   */
  async getActivePreviewCount(projectId: string): Promise<number> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn({ action: 'preview.count.db.missing_url', projectId });
      return 0;
    }
    const db = getDb(databaseUrl);
    const rows: any = await db.execute(sql`SELECT COUNT(*)::int AS count FROM environments WHERE project_id = ${projectId} AND kind = 'preview' AND (ttl_expires_at IS NULL OR ttl_expires_at > NOW())`);
    const rawCount = rows?.[0]?.count ?? rows?.rows?.[0]?.count;
    const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount || '0', 10) || 0;
    logger.info({ action: 'preview.count.fetched', projectId, count });
    return count;
  }

  /**
   * Enforce preview environment cap (max 15 concurrent per project)
   */
  async canCreatePreview(projectId: string): Promise<{ allowed: boolean; reason?: string }> {
    const activeCount = await this.getActivePreviewCount(projectId);
    const maxPreviews = 15;

    if (activeCount >= maxPreviews) {
      logger.warn({ action: 'preview.cap.blocked', projectId, activeCount, maxPreviews });
      return {
        allowed: false,
        reason: `ENV_PREVIEW_LIMIT_REACHED: Maximum preview environments (${maxPreviews}) reached. Archive existing previews to create new ones.`,
      };
    }

    return { allowed: true };
  }
}

export const previewService = new PreviewService();
