/**
 * Common types for analytics events
 * Named with Analytics prefix to avoid collisions with entity types
 */

export type AnalyticsEnvironment = "dev" | "staging" | "prod";
export type AnalyticsPlatform = "web" | "mobile" | "api";
export type AnalyticsEnvironmentType = "dev" | "staging" | "prod" | "preview";
export type AnalyticsAuthMethod = "email" | "github" | "google" | "oauth";
export type AnalyticsDeploymentStatus = "succeeded" | "failed";
export type AnalyticsErrorSeverity = "info" | "warn" | "error" | "critical";
