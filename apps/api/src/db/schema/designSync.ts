// T010: Drizzle schema for Design Sync Integration Hub (feature 006)
// Mirrors migration 20251123_design_sync.sql

import { pgTable, uuid, text, jsonb, timestamp, integer, pgEnum, numeric } from 'drizzle-orm/pg-core';

export const designMappingStatusEnum = pgEnum('design_mapping_status', ['unmapped','mapped','drift']);
export const syncOperationStatusEnum = pgEnum('sync_operation_status', ['pending','running','completed','partial','failed']);
export const credentialProviderTypeEnum = pgEnum('credential_provider_type', ['notification','design','documentation','testing','ai','analytics']);
export const credentialStatusEnum = pgEnum('credential_status', ['valid','revoked','expired','pending']);
export const notificationEventTypeEnum = pgEnum('notification_event_type', ['sync_completed','drift_detected','coverage_summary','digest','credential_status','browser_test_failure']);
export const notificationDispatchStatusEnum = pgEnum('notification_dispatch_status', ['queued','sent','failed','retrying']);
export const browserSessionStatusEnum = pgEnum('browser_session_status', ['running','passed','failed','aborted']);

export const componentArtifacts = pgTable('component_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  variants: jsonb('variants').notNull(),
  mappingStatus: designMappingStatusEnum('mapping_status').notNull().default('unmapped'),
  lastStoryUpdate: timestamp('last_story_update', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const designArtifacts = pgTable('design_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  variantRefs: jsonb('variant_refs').notNull(),
  lastDesignChangeAt: timestamp('last_design_change_at', { withTimezone: true }).notNull(),
  diffHash: text('diff_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const syncOperations = pgTable('sync_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  initiatedBy: uuid('initiated_by'), // references users(id) if users table exists
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  componentsAffected: jsonb('components_affected').notNull(),
  directionModes: jsonb('direction_modes').notNull(),
  diffSummary: jsonb('diff_summary').notNull(),
  reversibleUntil: timestamp('reversible_until', { withTimezone: true }).notNull(),
  operationHash: text('operation_hash').notNull().unique(),
  status: syncOperationStatusEnum('status').notNull().default('pending'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const undoStackEntries = pgTable('undo_stack_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncOperationId: uuid('sync_operation_id').notNull().references(() => syncOperations.id, { onDelete: 'cascade' }),
  preStateHash: text('pre_state_hash').notNull(),
  postStateHash: text('post_state_hash').notNull(),
  expiration: timestamp('expiration', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  undoneAt: timestamp('undone_at', { withTimezone: true }),
});

export const credentialRecords = pgTable('credential_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerType: credentialProviderTypeEnum('provider_type').notNull(),
  status: credentialStatusEnum('status').notNull().default('pending'),
  lastValidationTime: timestamp('last_validation_time', { withTimezone: true }),
  rotationDue: timestamp('rotation_due', { withTimezone: true }),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationEvents = pgTable('notification_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: notificationEventTypeEnum('type').notNull(),
  payloadSummary: jsonb('payload_summary').notNull(),
  channelTargets: jsonb('channel_targets').notNull(),
  dispatchStatus: notificationDispatchStatusEnum('dispatch_status').notNull().default('queued'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const coverageReports = pgTable('coverage_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  variantCoveragePct: numeric('variant_coverage_pct').notNull(),
  missingVariants: jsonb('missing_variants').notNull(),
  missingTests: jsonb('missing_tests').notNull(),
  warnings: jsonb('warnings'),
});

export const browserTestSessions = pgTable('browser_test_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }),
  status: browserSessionStatusEnum('status').notNull().default('running'),
  performanceSummary: jsonb('performance_summary'),
  correlationId: uuid('correlation_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const driftQueue = pgTable('drift_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().unique().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
  attemptCount: integer('attempt_count').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
});

// Export type helpers (simplified)
export type SyncOperation = typeof syncOperations.$inferSelect;
export type UndoStackEntry = typeof undoStackEntries.$inferSelect;
export type CoverageReport = typeof coverageReports.$inferSelect;
export type CredentialRecord = typeof credentialRecords.$inferSelect;
export type BrowserTestSession = typeof browserTestSessions.$inferSelect;
