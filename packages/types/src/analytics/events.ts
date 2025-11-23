import { z } from "zod";

/**
 * PostHog Analytics Event Schemas
 * 
 * Type-safe event definitions for platform analytics following
 * the spec-first approach with Zod validation.
 */

// Base event properties common to all events
export const BaseEventProperties = z.object({
  user_id: z.string().optional(),
  distinct_id: z.string(),
  timestamp: z.string().datetime().optional(),
  environment: z.enum(["dev", "staging", "prod"]).optional(),
  platform: z.enum(["web", "mobile", "api"]).optional(),
});

// Project Events
export const ProjectCreatedEvent = z.object({
  event: z.literal("project_created"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    project_name: z.string(),
    integration_count: z.number().int().nonnegative(),
    integrations: z.array(z.string()),
    provisioning_duration_ms: z.number().nonnegative(),
  }),
});

export const ProjectViewedEvent = z.object({
  event: z.literal("project_viewed"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
  }),
});

export const ProjectDeletedEvent = z.object({
  event: z.literal("project_deleted"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    project_age_days: z.number().nonnegative(),
  }),
});

// Environment Events
export const EnvironmentProvisionedEvent = z.object({
  event: z.literal("environment_provisioned"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    environment_id: z.string().uuid(),
    environment_name: z.string(),
    environment_type: z.enum(["dev", "staging", "prod", "preview"]),
    integration_count: z.number().int().nonnegative(),
    integrations: z.array(z.string()),
    provisioning_duration_ms: z.number().nonnegative(),
  }),
});

export const EnvironmentPromotedEvent = z.object({
  event: z.literal("environment_promoted"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    environment_id: z.string().uuid(),
    from_environment: z.string(),
    to_environment: z.string(),
    promotion_duration_ms: z.number().nonnegative(),
  }),
});

export const DeploymentRollbackEvent = z.object({
  event: z.literal("deployment_rollback"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    environment_id: z.string().uuid(),
    rollback_reason: z.string().optional(),
  }),
});

// Spec Events
export const SpecAppliedEvent = z.object({
  event: z.literal("spec_applied"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    spec_id: z.string().uuid(),
    files_generated: z.number().int().nonnegative(),
    apply_duration_ms: z.number().nonnegative(),
    drift_detected: z.boolean(),
  }),
});

export const SpecDriftDetectedEvent = z.object({
  event: z.literal("spec_drift_detected"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    spec_id: z.string().uuid(),
    drift_count: z.number().int().positive(),
    conflict_count: z.number().int().nonnegative(),
  }),
});

// Chat & Editor Events
export const ChatSessionStartedEvent = z.object({
  event: z.literal("chat_session_started"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    session_id: z.string().uuid(),
  }),
});

export const ChatMessageSentEvent = z.object({
  event: z.literal("chat_message_sent"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    session_id: z.string().uuid(),
    message_length: z.number().int().nonnegative(),
  }),
});

export const DiffAppliedEvent = z.object({
  event: z.literal("diff_applied"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    session_id: z.string().uuid(),
    files_modified: z.number().int().positive(),
    apply_duration_ms: z.number().nonnegative(),
  }),
});

export const CodeEditorOpenedEvent = z.object({
  event: z.literal("code_editor_opened"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    file_path: z.string().optional(),
    file_size_bytes: z.number().int().nonnegative().optional(),
  }),
});

// Error & Performance Events
export const ErrorOccurredEvent = z.object({
  event: z.literal("error_occurred"),
  properties: BaseEventProperties.extend({
    error_code: z.string(),
    error_severity: z.enum(["info", "warn", "error", "critical"]),
    error_message: z.string(),
    context: z.record(z.any()).optional(),
    request_id: z.string().uuid().optional(),
  }),
});

export const PerformanceMetricEvent = z.object({
  event: z.literal("performance_metric"),
  properties: BaseEventProperties.extend({
    metric_name: z.string(),
    metric_value: z.number(),
    metric_unit: z.enum(["ms", "seconds", "bytes", "count"]),
    percentile: z.enum(["p50", "p95", "p99"]).optional(),
  }),
});

// Feature Flag Events
export const FeatureFlagEvaluatedEvent = z.object({
  event: z.literal("feature_flag_evaluated"),
  properties: BaseEventProperties.extend({
    flag_key: z.string(),
    flag_value: z.boolean(),
  }),
});

// User Events
export const UserSignedUpEvent = z.object({
  event: z.literal("user_signed_up"),
  properties: BaseEventProperties.extend({
    email: z.string().email(),
    signup_method: z.enum(["email", "github", "google", "oauth"]),
    plan: z.string().optional(),
  }),
});

export const UserSignedInEvent = z.object({
  event: z.literal("user_signed_in"),
  properties: BaseEventProperties.extend({
    login_method: z.enum(["email", "github", "google", "oauth"]),
  }),
});

// Integration Events
export const IntegrationConnectedEvent = z.object({
  event: z.literal("integration_connected"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    integration_type: z.string(),
    integration_name: z.string(),
    connection_duration_ms: z.number().nonnegative(),
  }),
});

export const IntegrationErrorEvent = z.object({
  event: z.literal("integration_error"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    integration_type: z.string(),
    integration_name: z.string(),
    error_code: z.string(),
    error_message: z.string(),
    retry_count: z.number().int().nonnegative(),
  }),
});

// Deployment Events
export const DeploymentCompletedEvent = z.object({
  event: z.literal("deployment_completed"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    deployment_id: z.string().uuid(),
    environment_name: z.string(),
    status: z.enum(["succeeded", "failed"]),
    duration_ms: z.number().nonnegative(),
    error_message: z.string().optional(),
  }),
});

export const BuildCompletedEvent = z.object({
  event: z.literal("build_completed"),
  properties: BaseEventProperties.extend({
    project_id: z.string().uuid(),
    build_id: z.string().uuid(),
    status: z.enum(["succeeded", "failed"]),
    duration_ms: z.number().nonnegative(),
    error_message: z.string().optional(),
  }),
});

// Subscription Events
export const SubscriptionChangedEvent = z.object({
  event: z.literal("subscription_changed"),
  properties: BaseEventProperties.extend({
    old_plan: z.string(),
    new_plan: z.string(),
    change_reason: z.string(),
  }),
});

// Page View Events
export const PageViewEvent = z.object({
  event: z.literal("page_view"),
  properties: BaseEventProperties.extend({
    page_path: z.string(),
    page_title: z.string(),
    referrer: z.string().optional(),
  }),
});

// API Events
export const ApiRequestEvent = z.object({
  event: z.literal("api_request"),
  properties: BaseEventProperties.extend({
    method: z.string(),
    path: z.string(),
    status_code: z.number().int(),
    duration_ms: z.number().nonnegative(),
    error_message: z.string().optional(),
  }),
});

// Union type of all events
export const AnalyticsEvent = z.union([
  ProjectCreatedEvent,
  ProjectViewedEvent,
  ProjectDeletedEvent,
  EnvironmentProvisionedEvent,
  EnvironmentPromotedEvent,
  DeploymentRollbackEvent,
  SpecAppliedEvent,
  SpecDriftDetectedEvent,
  ChatSessionStartedEvent,
  ChatMessageSentEvent,
  DiffAppliedEvent,
  CodeEditorOpenedEvent,
  ErrorOccurredEvent,
  PerformanceMetricEvent,
  FeatureFlagEvaluatedEvent,
  UserSignedUpEvent,
  UserSignedInEvent,
  IntegrationConnectedEvent,
  IntegrationErrorEvent,
  DeploymentCompletedEvent,
  BuildCompletedEvent,
  SubscriptionChangedEvent,
  PageViewEvent,
  ApiRequestEvent,
]);

// Export inferred TypeScript types
export type ProjectCreatedEvent = z.infer<typeof ProjectCreatedEvent>;
export type ProjectViewedEvent = z.infer<typeof ProjectViewedEvent>;
export type ProjectDeletedEvent = z.infer<typeof ProjectDeletedEvent>;
export type EnvironmentProvisionedEvent = z.infer<typeof EnvironmentProvisionedEvent>;
export type EnvironmentPromotedEvent = z.infer<typeof EnvironmentPromotedEvent>;
export type DeploymentRollbackEvent = z.infer<typeof DeploymentRollbackEvent>;
export type SpecAppliedEvent = z.infer<typeof SpecAppliedEvent>;
export type SpecDriftDetectedEvent = z.infer<typeof SpecDriftDetectedEvent>;
export type ChatSessionStartedEvent = z.infer<typeof ChatSessionStartedEvent>;
export type ChatMessageSentEvent = z.infer<typeof ChatMessageSentEvent>;
export type DiffAppliedEvent = z.infer<typeof DiffAppliedEvent>;
export type CodeEditorOpenedEvent = z.infer<typeof CodeEditorOpenedEvent>;
export type ErrorOccurredEvent = z.infer<typeof ErrorOccurredEvent>;
export type PerformanceMetricEvent = z.infer<typeof PerformanceMetricEvent>;
export type FeatureFlagEvaluatedEvent = z.infer<typeof FeatureFlagEvaluatedEvent>;
export type UserSignedUpEvent = z.infer<typeof UserSignedUpEvent>;
export type UserSignedInEvent = z.infer<typeof UserSignedInEvent>;
export type IntegrationConnectedEvent = z.infer<typeof IntegrationConnectedEvent>;
export type IntegrationErrorEvent = z.infer<typeof IntegrationErrorEvent>;
export type DeploymentCompletedEvent = z.infer<typeof DeploymentCompletedEvent>;
export type BuildCompletedEvent = z.infer<typeof BuildCompletedEvent>;
export type SubscriptionChangedEvent = z.infer<typeof SubscriptionChangedEvent>;
export type PageViewEvent = z.infer<typeof PageViewEvent>;
export type ApiRequestEvent = z.infer<typeof ApiRequestEvent>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEvent>;
