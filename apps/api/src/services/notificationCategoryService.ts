// T024: Notification category registry for design sync feature
// Categories derived from spec: sync_completed, drift_detected, coverage_summary, digest, credential_status, browser_test_failure
export type NotificationCategory = {
  key: string;
  description: string;
  severity: 'info' | 'warn' | 'error';
  throttleSeconds?: number; // optional rate limiting between repeats
};

export const notificationCategories: NotificationCategory[] = [
  {
    key: 'sync_completed',
    description: 'Design ↔ Code sync operation finished',
    severity: 'info',
  },
  {
    key: 'drift_detected',
    description: 'Drift between design and code detected requiring review',
    severity: 'warn',
    throttleSeconds: 300,
  },
  {
    key: 'coverage_summary',
    description: 'Updated coverage summary available',
    severity: 'info',
    throttleSeconds: 600,
  },
  {
    key: 'digest',
    description: 'Daily digest of design sync activities',
    severity: 'info',
    throttleSeconds: 3600,
  },
  {
    key: 'credential_status',
    description: 'Credential rotation or validation status change',
    severity: 'warn',
  },
  {
    key: 'browser_test_failure',
    description: 'Browser MCP session failed a test scenario',
    severity: 'error',
  },
];

export function getCategory(key: string) {
  return notificationCategories.find((c) => c.key === key);
}
/**
 * T024: Notification category registry for design sync feature
 * Categories come from spec expanded list and support enable/disable preferences (future).
 */
export type DesignNotificationCategory =
  | 'sync_completed'
  | 'drift_detected'
  | 'coverage_summary'
  | 'digest'
  | 'credential_status'
  | 'browser_test_failure';

interface CategoryMeta {
  key: DesignNotificationCategory;
  description: string;
  defaultEnabled: boolean;
  severity: 'info' | 'warn' | 'error';
}

export const DesignNotificationCategories: Record<DesignNotificationCategory, CategoryMeta> = {
  sync_completed: {
    key: 'sync_completed',
    description: 'A manual design sync operation finished',
    defaultEnabled: true,
    severity: 'info',
  },
  drift_detected: {
    key: 'drift_detected',
    description: 'Drift detected between code and design artifacts',
    defaultEnabled: true,
    severity: 'warn',
  },
  coverage_summary: {
    key: 'coverage_summary',
    description: 'Coverage summary generated for components',
    defaultEnabled: true,
    severity: 'info',
  },
  digest: {
    key: 'digest',
    description: 'Nightly digest of design sync events',
    defaultEnabled: true,
    severity: 'info',
  },
  credential_status: {
    key: 'credential_status',
    description: 'Credential rotation/validation status change',
    defaultEnabled: true,
    severity: 'warn',
  },
  browser_test_failure: {
    key: 'browser_test_failure',
    description: 'Browser MCP test session reported failure',
    defaultEnabled: true,
    severity: 'error',
  },
};

export function listDesignNotificationCategories(): CategoryMeta[] {
  return Object.values(DesignNotificationCategories);
}

/**
 * T066: Slack coverage summary dispatch
 * Feature: 006-design-sync-integration
 * 
 * Dispatches coverage summaries to Slack channels based on category preferences
 * Spec References: FR-006, FR-011, US2
 */

interface CoverageSummaryPayload {
  overallVariantCoveragePct: number;
  totalComponents: number;
  componentsWithGaps: number;
  totalMissingVariants: number;
  totalMissingTests: number;
  threshold?: number; // Optional threshold for highlighting (default 90)
}

interface SlackDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channelId?: string;
}

export class NotificationDispatchService {
  private readonly slackWebhookUrl: string | undefined;
  private readonly defaultChannel: string;

  constructor(options?: { slackWebhookUrl?: string; defaultChannel?: string }) {
    this.slackWebhookUrl = options?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
    this.defaultChannel = options?.defaultChannel || '#design-sync';
  }

  /**
   * Dispatch coverage summary to Slack
   */
  async dispatchCoverageSummary(payload: CoverageSummaryPayload): Promise<SlackDispatchResult> {
    if (!this.slackWebhookUrl) {
      return {
        success: false,
        error: 'Slack webhook URL not configured',
      };
    }

    const threshold = payload.threshold ?? 90;
    const isBelowThreshold = payload.overallVariantCoveragePct < threshold;

    // Build Slack message blocks
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Design Coverage Summary',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Overall Coverage:*\n${payload.overallVariantCoveragePct}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Total Components:*\n${payload.totalComponents}`,
          },
          {
            type: 'mrkdwn',
            text: `*Components with Gaps:*\n${payload.componentsWithGaps}`,
          },
          {
            type: 'mrkdwn',
            text: `*Missing Variants:*\n${payload.totalMissingVariants}`,
          },
        ],
      },
    ];

    // Add missing tests summary
    if (payload.totalMissingTests > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *${payload.totalMissingTests}* test scaffolds missing across components`,
        },
      });
    }

    // Add action recommendation if below threshold
    if (isBelowThreshold) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔴 Coverage is below ${threshold}% threshold. Review missing variants and generate test scaffolds.`,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Coverage meets ${threshold}% threshold.`,
        },
      });
    }

    // Add divider and footer
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Generated: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|now>`,
          },
        ],
      }
    );

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: this.defaultChannel,
          blocks,
          text: `Coverage Summary: ${payload.overallVariantCoveragePct}% (${payload.totalComponents} components)`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        channelId: this.defaultChannel,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Dispatch generic design sync notification
   */
  async dispatchNotification(
    category: DesignNotificationCategory,
    payload: Record<string, unknown>
  ): Promise<SlackDispatchResult> {
    if (!this.slackWebhookUrl) {
      return {
        success: false,
        error: 'Slack webhook URL not configured',
      };
    }

    const categoryMeta = DesignNotificationCategories[category];
    const icon = categoryMeta.severity === 'error' ? '🔴' : categoryMeta.severity === 'warn' ? '⚠️' : 'ℹ️';

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: this.defaultChannel,
          text: `${icon} ${categoryMeta.description}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${icon} *${categoryMeta.description}*`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `\`\`\`${JSON.stringify(payload, null, 2)}\`\`\``,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        channelId: this.defaultChannel,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * T073: Dispatch daily/weekly digest summary
   * Aggregates event counts from last period and sends to Slack
   */
  async dispatchDigest(payload: {
    userId: string;
    projectId: string | null;
    period: { start: string; end: string };
    eventCounts: {
      sync_completed: number;
      drift_detected: number;
      coverage_summary: number;
      credential_status: number;
      browser_test_failure: number;
    };
    totalEvents: number;
  }): Promise<SlackDispatchResult> {
    if (!this.slackWebhookUrl) {
      return {
        success: false,
        error: 'Slack webhook URL not configured',
      };
    }

    // Build Slack message blocks
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📬 Design Sync Digest',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Period:* ${new Date(payload.period.start).toLocaleDateString()} - ${new Date(payload.period.end).toLocaleDateString()}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Total Events:* ${payload.totalEvents}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Event Breakdown:*',
        },
      },
    ];

    // Add event counts as fields
    const eventFields = [];
    if (payload.eventCounts.sync_completed > 0) {
      eventFields.push({
        type: 'mrkdwn',
        text: `✅ *Syncs Completed:*\n${payload.eventCounts.sync_completed}`,
      });
    }
    if (payload.eventCounts.drift_detected > 0) {
      eventFields.push({
        type: 'mrkdwn',
        text: `⚠️ *Drifts Detected:*\n${payload.eventCounts.drift_detected}`,
      });
    }
    if (payload.eventCounts.coverage_summary > 0) {
      eventFields.push({
        type: 'mrkdwn',
        text: `📊 *Coverage Summaries:*\n${payload.eventCounts.coverage_summary}`,
      });
    }
    if (payload.eventCounts.credential_status > 0) {
      eventFields.push({
        type: 'mrkdwn',
        text: `🔑 *Credential Updates:*\n${payload.eventCounts.credential_status}`,
      });
    }
    if (payload.eventCounts.browser_test_failure > 0) {
      eventFields.push({
        type: 'mrkdwn',
        text: `🔴 *Test Failures:*\n${payload.eventCounts.browser_test_failure}`,
      });
    }

    if (eventFields.length > 0) {
      blocks.push({
        type: 'section',
        fields: eventFields,
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_No events in this period_',
        },
      });
    }

    // Add footer
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `User: ${payload.userId}${payload.projectId ? ` | Project: ${payload.projectId}` : ''}`,
          },
        ],
      }
    );

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: this.defaultChannel,
          blocks,
          text: `Design Sync Digest: ${payload.totalEvents} events (${new Date(payload.period.start).toLocaleDateString()} - ${new Date(payload.period.end).toLocaleDateString()})`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        channelId: this.defaultChannel,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }
}

export const notificationDispatchService = new NotificationDispatchService();
