/// <reference types="@cloudflare/workers-types" />
// T028: Scheduled Secret Synchronization Job
//
// Cloudflare Workers Cron Trigger: 0 */6 * * * (every 6 hours)
// Automatically syncs secrets for all active projects
//
// This script is designed to run as a Cloudflare Workers cron job
// configured in wrangler.toml:
//
// [triggers]
// crons = ["0 */6 * * *"]

import { createGitHubClient } from '../../apps/api/src/integrations/github/client';
import { SecretSyncService } from '../../apps/api/src/services/github/secretSyncService';
import { getDb } from '../../apps/api/db/connection';
// import { projects } from '../../apps/api/db/schema/base';
// import { eq } from 'drizzle-orm';

interface Env {
  DATABASE_URL: string;
  GITHUB_TOKEN: string;
  CLOUDFLARE_API_TOKEN?: string;
}

/**
 * Scheduled handler for Cloudflare Workers
 * Triggered every 6 hours to sync secrets across all active projects
 */
export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Starting scheduled secret sync job...');

      // Initialize database connection
      const db = getDb(env.DATABASE_URL);

      // Fetch all active projects
      // TODO: Add proper project query with status filter
      // const activeProjects = await db
      //   .select()
      //   .from(projects)
      //   .where(eq(projects.status, 'active'));

      const activeProjects: any[] = [];

      console.log(`Found ${activeProjects.length} active projects to sync`);

      // Initialize GitHub client and secret sync service
      const githubClient = createGitHubClient(env.GITHUB_TOKEN);
      const secretSyncService = new SecretSyncService(
        githubClient.getOctokit(),
        db,
        env.CLOUDFLARE_API_TOKEN
      );

      let successCount = 0;
      let failureCount = 0;

      // Process each project
      for (const project of activeProjects) {
        try {
          // Extract GitHub repo details from project metadata
          // TODO: Adjust based on actual project schema
          const githubConfig = project.integrations?.github || {};
          const owner = githubConfig.owner || 'unknown';
          const repo = githubConfig.repo || 'unknown';
          
          if (owner === 'unknown' || repo === 'unknown') {
            console.warn(`Skipping project ${project.id}: GitHub config incomplete`);
            continue;
          }

          // Get Cloudflare config for secret sync
          const cloudflareConfig = project.integrations?.cloudflare || {};
          const accountId = cloudflareConfig.accountId;
          const workerName = cloudflareConfig.workerName;
          const pagesProject = cloudflareConfig.pagesProject;

          console.log(`Syncing secrets for project ${project.id} (${owner}/${repo})...`);

          // Perform sync
          const syncResult = await secretSyncService.syncAllSecrets({
            projectId: project.id,
            owner,
            repo,
            actorId: 'system', // System-triggered sync
            force: false,
            cloudflareAccountId: accountId,
            cloudflareWorkerName: workerName,
            cloudflareProjectName: pagesProject,
          });

          if (syncResult.failedCount === 0) {
            successCount++;
            console.log(
              `✓ Project ${project.id}: Synced ${syncResult.syncedCount} secrets, ` +
              `skipped ${syncResult.skippedCount}`
            );
          } else {
            failureCount++;
            console.error(
              `✗ Project ${project.id}: ${syncResult.failedCount} failures, ` +
              `${syncResult.syncedCount} succeeded, ${syncResult.skippedCount} skipped`
            );
          }

        } catch (error: any) {
          failureCount++;
          console.error(`Failed to sync project ${project.id}:`, error.message);
        }
      }

      const durationMs = Date.now() - startTime;
      
      console.log(
        `Scheduled sync job completed in ${durationMs}ms: ` +
        `${successCount} succeeded, ${failureCount} failed`
      );

      // Log aggregate metrics
      // TODO: Send to observability platform (PostHog, Datadog, etc.)
      // await sendMetric('scheduled_sync_completed', {
      //   successCount,
      //   failureCount,
      //   durationMs,
      //   projectCount: activeProjects.length,
      // });

    } catch (error: any) {
      console.error('Scheduled sync job failed:', error);
      
      // TODO: Alert on-call engineer
      // await sendAlert('scheduled_sync_critical_failure', {
      //   error: error.message,
      //   stack: error.stack,
      // });
      
      throw error;
    }
  },
};

/**
 * Alternative: HTTP endpoint trigger for manual sync
 * Can be called via webhook or manual API request
 */
export async function handleManualSync(env: Env): Promise<Response> {
  try {
    // Reuse the scheduled handler logic
    const event = {} as ScheduledEvent;
    const ctx = {} as ExecutionContext;
    
    await exports.default.scheduled(event, env, ctx);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Manual sync triggered successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
