import {
  type ProjectCreatedEvent,
  type EnvironmentProvisionedEvent,
  type EnvironmentPromotedEvent,
  type SpecAppliedEvent,
  type ChatMessageSentEvent,
  type ChatSessionStartedEvent,
  type DiffAppliedEvent,
  type ErrorOccurredEvent,
  type PerformanceMetricEvent,
  type FeatureFlagEvaluatedEvent,
  type IntegrationConnectedEvent,
  type IntegrationErrorEvent,
  type DeploymentCompletedEvent,
  type BuildCompletedEvent,
  type UserSignedUpEvent,
  type UserSignedInEvent,
  type SubscriptionChangedEvent,
  type PageViewEvent,
  type ApiRequestEvent,
  type AnalyticsEnvironment,
  type AnalyticsPlatform,
  type AnalyticsEnvironmentType,
  type AnalyticsAuthMethod,
  type AnalyticsDeploymentStatus,
  type AnalyticsErrorSeverity,
} from '@flaresmith/types';
import { trackEvent } from './analytics';

/**
 * Type-Safe Analytics Event Helpers
 * 
 * These helper functions provide type-safe wrappers for tracking events.
 * All events use Zod-validated schemas from @flaresmith/types.
 */

// ============================================================================
// Project Events
// ============================================================================

export function trackProjectCreated(params: {
  userId: string;
  projectId: string;
  projectName: string;
  integrations: string[];
  provisioningDurationMs: number;
  environment: AnalyticsEnvironment;
  platform: AnalyticsPlatform;
}): void {
  const event: ProjectCreatedEvent = {
    event: 'project_created',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      project_name: params.projectName,
      integration_count: params.integrations.length,
      integrations: params.integrations,
      provisioning_duration_ms: params.provisioningDurationMs,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Environment Events
// ============================================================================

export function trackEnvironmentProvisioned(params: {
  userId: string;
  projectId: string;
  environmentId: string;
  environmentName: string;
  environmentType: 'dev' | 'staging' | 'prod' | 'preview';
  integrations: string[];
  provisioningDurationMs: number;
  environment: string;
  platform: string;
}): void {
  const event: EnvironmentProvisionedEvent = {
    event: 'environment_provisioned',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      environment_id: params.environmentId,
      environment_name: params.environmentName,
      environment_type: params.environmentType,
      integration_count: params.integrations.length,
      integrations: params.integrations,
      provisioning_duration_ms: params.provisioningDurationMs,
    },
  };
  trackEvent(event);
}

export function trackEnvironmentPromoted(params: {
  userId: string;
  projectId: string;
  environmentId: string;
  fromEnvironment: string;
  toEnvironment: string;
  promotionDurationMs: number;
  environment: string;
  platform: string;
}): void {
  const event: EnvironmentPromotedEvent = {
    event: 'environment_promoted',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      environment_id: params.environmentId,
      from_environment: params.fromEnvironment,
      to_environment: params.toEnvironment,
      promotion_duration_ms: params.promotionDurationMs,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Specification Events
// ============================================================================

export function trackSpecApplied(params: {
  userId: string;
  projectId: string;
  specId: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  durationMs: number;
  success: boolean;
  environment: string;
  platform: string;
}): void {
  const event: SpecAppliedEvent = {
    event: 'spec_applied',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      spec_id: params.specId,
      files_changed: params.filesChanged,
      lines_added: params.linesAdded,
      lines_removed: params.linesRemoved,
      duration_ms: params.durationMs,
      success: params.success,
    },
  };
  trackEvent(event);
}

export function trackDiffApplied(params: {
  userId: string;
  projectId: string;
  diffId: string;
  filesChanged: number;
  linesChanged: number;
  success: boolean;
  environment: string;
  platform: string;
}): void {
  const event: DiffAppliedEvent = {
    event: 'diff_applied',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      diff_id: params.diffId,
      files_changed: params.filesChanged,
      lines_changed: params.linesChanged,
      success: params.success,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Chat Events
// ============================================================================

export function trackChatSessionStarted(params: {
  userId: string;
  projectId: string;
  sessionId: string;
  environmentId?: string;
  environment: string;
  platform: string;
}): void {
  const event: ChatSessionStartedEvent = {
    event: 'chat_session_started',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      session_id: params.sessionId,
      environment_id: params.environmentId,
    },
  };
  trackEvent(event);
}

export function trackChatMessageSent(params: {
  userId: string;
  projectId: string;
  sessionId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  messageLength: number;
  tokensUsed?: number;
  environment: string;
  platform: string;
}): void {
  const event: ChatMessageSentEvent = {
    event: 'chat_message_sent',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      session_id: params.sessionId,
      message_id: params.messageId,
      role: params.role,
      message_length: params.messageLength,
      tokens_used: params.tokensUsed,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Error Events
// ============================================================================

export function trackError(params: {
  userId?: string;
  projectId?: string;
  errorCode: string;
  errorMessage: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  stackTrace?: string;
  context?: Record<string, unknown>;
  environment: string;
  platform: string;
}): void {
  const event: ErrorOccurredEvent = {
    event: 'error_occurred',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      error_code: params.errorCode,
      error_message: params.errorMessage,
      severity: params.severity,
      stack_trace: params.stackTrace,
      context: params.context,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Performance Events
// ============================================================================

export function trackPerformanceMetric(params: {
  userId?: string;
  projectId?: string;
  metricName: string;
  value: number;
  unit: string;
  context?: Record<string, unknown>;
  environment: string;
  platform: string;
}): void {
  const event: PerformanceMetricEvent = {
    event: 'performance_metric',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      metric_name: params.metricName,
      value: params.value,
      unit: params.unit,
      context: params.context,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Feature Flag Events
// ============================================================================

export function trackFeatureFlagEvaluated(params: {
  userId: string;
  flagKey: string;
  flagValue: boolean | string;
  projectId?: string;
  environment: string;
  platform: string;
}): void {
  const event: FeatureFlagEvaluatedEvent = {
    event: 'feature_flag_evaluated',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      flag_key: params.flagKey,
      flag_value: params.flagValue,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Integration Events
// ============================================================================

export function trackIntegrationConnected(params: {
  userId: string;
  projectId: string;
  integrationType: string;
  integrationName: string;
  connectionDurationMs: number;
  environment: string;
  platform: string;
}): void {
  const event: IntegrationConnectedEvent = {
    event: 'integration_connected',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      integration_type: params.integrationType,
      integration_name: params.integrationName,
      connection_duration_ms: params.connectionDurationMs,
    },
  };
  trackEvent(event);
}

export function trackIntegrationError(params: {
  userId: string;
  projectId: string;
  integrationType: string;
  integrationName: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  environment: string;
  platform: string;
}): void {
  const event: IntegrationErrorEvent = {
    event: 'integration_error',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      integration_type: params.integrationType,
      integration_name: params.integrationName,
      error_code: params.errorCode,
      error_message: params.errorMessage,
      retry_count: params.retryCount,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Deployment Events
// ============================================================================

export function trackDeploymentCompleted(params: {
  userId: string;
  projectId: string;
  deploymentId: string;
  environmentName: string;
  status: 'succeeded' | 'failed';
  durationMs: number;
  errorMessage?: string;
  environment: string;
  platform: string;
}): void {
  const event: DeploymentCompletedEvent = {
    event: 'deployment_completed',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      deployment_id: params.deploymentId,
      environment_name: params.environmentName,
      status: params.status,
      duration_ms: params.durationMs,
      error_message: params.errorMessage,
    },
  };
  trackEvent(event);
}

export function trackBuildCompleted(params: {
  userId: string;
  projectId: string;
  buildId: string;
  status: 'succeeded' | 'failed';
  durationMs: number;
  errorMessage?: string;
  environment: string;
  platform: string;
}): void {
  const event: BuildCompletedEvent = {
    event: 'build_completed',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      project_id: params.projectId,
      build_id: params.buildId,
      status: params.status,
      duration_ms: params.durationMs,
      error_message: params.errorMessage,
    },
  };
  trackEvent(event);
}

// ============================================================================
// User Events
// ============================================================================

export function trackUserSignedUp(params: {
  userId: string;
  email: string;
  signupMethod: string;
  plan?: string;
  environment: string;
  platform: string;
}): void {
  const event: UserSignedUpEvent = {
    event: 'user_signed_up',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      email: params.email,
      signup_method: params.signupMethod,
      plan: params.plan,
    },
  };
  trackEvent(event);
}

export function trackUserLoggedIn(params: {
  userId: string;
  loginMethod: string;
  environment: string;
  platform: string;
}): void {
  const event: UserSignedInEvent = {
    event: 'user_signed_in',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      login_method: params.loginMethod,
    },
  };
  trackEvent(event);
}

export function trackSubscriptionChanged(params: {
  userId: string;
  oldPlan: string;
  newPlan: string;
  changeReason: string;
  environment: string;
  platform: string;
}): void {
  const event: SubscriptionChangedEvent = {
    event: 'subscription_changed',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId,
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      old_plan: params.oldPlan,
      new_plan: params.newPlan,
      change_reason: params.changeReason,
    },
  };
  trackEvent(event);
}

// ============================================================================
// Page View Events
// ============================================================================

export function trackPageView(params: {
  userId?: string;
  pagePath: string;
  pageTitle: string;
  referrer?: string;
  environment: string;
  platform: string;
}): void {
  const event: PageViewEvent = {
    event: 'page_view',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      page_path: params.pagePath,
      page_title: params.pageTitle,
      referrer: params.referrer,
    },
  };
  trackEvent(event);
}

// ============================================================================
// API Events
// ============================================================================

export function trackApiRequest(params: {
  userId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorMessage?: string;
  environment: string;
  platform: string;
}): void {
  const event: ApiRequestEvent = {
    event: 'api_request',
    properties: {
      user_id: params.userId,
      distinct_id: params.userId || 'anonymous',
      timestamp: new Date().toISOString(),
      environment: params.environment,
      platform: params.platform,
      method: params.method,
      path: params.path,
      status_code: params.statusCode,
      duration_ms: params.durationMs,
      error_message: params.errorMessage,
    },
  };
  trackEvent(event);
}
