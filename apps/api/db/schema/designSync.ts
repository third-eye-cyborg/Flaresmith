import { pgTable, uuid, text, jsonb, timestamp, pgEnum, integer, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './base';

/**
 * T010: Drizzle schema for Design Sync & Integration Hub feature
 * Feature: 006-design-sync-integration
 * Spec: specs/006-design-sync-integration/spec.md
 * Data Model Source: specs/006-design-sync-integration/data-model.md
 */

// Enums (must match migration enum names)
export const designMappingStatusEnum = pgEnum('design_mapping_status', ['unmapped','mapped','drift']);
export const syncOperationStatusEnum = pgEnum('sync_operation_status', ['pending','running','completed','partial','failed']);
export const credentialProviderTypeEnum = pgEnum('credential_provider_type', ['notification','design','documentation','testing','ai','analytics']);
export const credentialStatusEnum = pgEnum('credential_status', ['valid','revoked','expired','pending']);
export const notificationEventTypeEnum = pgEnum('notification_event_type', ['sync_completed','drift_detected','coverage_summary','digest','credential_status','browser_test_failure']);
export const notificationDispatchStatusEnum = pgEnum('notification_dispatch_status', ['queued','sent','failed','retrying']);
export const browserSessionStatusEnum = pgEnum('browser_session_status', ['running','passed','failed','aborted']);

// component_artifacts
export const componentArtifacts = pgTable('component_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  variants: jsonb('variants').notNull(),
  mappingStatus: designMappingStatusEnum('mapping_status').notNull().default('unmapped'),
  lastStoryUpdate: timestamp('last_story_update'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  nameUniqueIdx: uniqueIndex('component_artifacts_name_idx').on(t.name),
}));

// design_artifacts
export const designArtifacts = pgTable('design_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  variantRefs: jsonb('variant_refs').notNull(),
  lastDesignChangeAt: timestamp('last_design_change_at').notNull(),
  diffHash: text('diff_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  componentIdx: index('design_artifacts_component_id_idx').on(t.componentId),
}));

// sync_operations
export const syncOperations = pgTable('sync_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  initiatedBy: uuid('initiated_by').references(() => users.id, { onDelete: 'set null' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  componentsAffected: jsonb('components_affected').notNull(),
  directionModes: jsonb('direction_modes').notNull(),
  diffSummary: jsonb('diff_summary').notNull(),
  reversibleUntil: timestamp('reversible_until').notNull(),
  operationHash: text('operation_hash').notNull(),
  status: syncOperationStatusEnum('status').notNull().default('pending'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  opHashUniqueIdx: uniqueIndex('sync_operations_operation_hash_idx').on(t.operationHash),
  statusIdx: index('sync_operations_status_idx').on(t.status),
  reversibleIdx: index('sync_operations_reversible_until_idx').on(t.reversibleUntil),
}));

// undo_stack_entries
export const undoStackEntries = pgTable('undo_stack_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncOperationId: uuid('sync_operation_id').notNull().references(() => syncOperations.id, { onDelete: 'cascade' }),
  preStateHash: text('pre_state_hash').notNull(),
  postStateHash: text('post_state_hash').notNull(),
  expiration: timestamp('expiration').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  undoneAt: timestamp('undone_at'),
}, (t) => ({
  syncOpIdx: index('undo_stack_entries_sync_operation_id_idx').on(t.syncOperationId),
  expirationIdx: index('undo_stack_entries_expiration_idx').on(t.expiration),
}));

// credential_records
export const credentialRecords = pgTable('credential_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerType: credentialProviderTypeEnum('provider_type').notNull(),
  status: credentialStatusEnum('status').notNull().default('pending'),
  lastValidationTime: timestamp('last_validation_time'),
  rotationDue: timestamp('rotation_due'),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  providerStatusIdx: index('credential_records_provider_status_idx').on(t.providerType, t.status),
}));

// notification_events
export const notificationEvents = pgTable('notification_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: notificationEventTypeEnum('type').notNull(),
  payloadSummary: jsonb('payload_summary').notNull(),
  channelTargets: jsonb('channel_targets').notNull(),
  dispatchStatus: notificationDispatchStatusEnum('dispatch_status').notNull().default('queued'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  typeCreatedIdx: index('notification_events_type_created_at_idx').on(t.type, t.createdAt),
}));

// coverage_reports
export const coverageReports = pgTable('coverage_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  variantCoveragePct: numeric('variant_coverage_pct').notNull(),
  missingVariants: jsonb('missing_variants').notNull(),
  missingTests: jsonb('missing_tests').notNull(),
  warnings: jsonb('warnings'),
}, (t) => ({
  componentGeneratedIdx: index('coverage_reports_component_id_generated_at_idx').on(t.componentId, t.generatedAt),
}));

// browser_test_sessions
export const browserTestSessions = pgTable('browser_test_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull(),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  status: browserSessionStatusEnum('status').notNull().default('running'),
  performanceSummary: jsonb('performance_summary'),
  correlationId: uuid('correlation_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  storyIdx: index('browser_test_sessions_story_id_idx').on(t.storyId),
  statusIdx: index('browser_test_sessions_status_idx').on(t.status),
}));

// drift_queue
export const driftQueue = pgTable('drift_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => componentArtifacts.id, { onDelete: 'cascade' }),
  queuedAt: timestamp('queued_at').notNull().defaultNow(),
  attemptCount: integer('attempt_count').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
}, (t) => ({
  componentUniqueIdx: uniqueIndex('drift_queue_component_id_unique_idx').on(t.componentId),
}));

// T069: notification_preferences
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id'), // Optional: scope preferences to project
  categoryPreferences: jsonb('category_preferences').notNull(), // { sync_completed: true, drift_detected: false, ... }
  digestEnabled: boolean('digest_enabled').notNull().default(true),
  digestFrequency: text('digest_frequency').notNull().default('daily'), // daily, weekly, never
  digestTimeUtc: text('digest_time_utc').default('08:00'), // HH:MM format
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userProjectIdx: index('notification_preferences_user_project_idx').on(t.userId, t.projectId),
}));

// Type exports
export type ComponentArtifact = typeof componentArtifacts.$inferSelect;
export type DesignArtifact = typeof designArtifacts.$inferSelect;
export type SyncOperation = typeof syncOperations.$inferSelect;
export type UndoStackEntry = typeof undoStackEntries.$inferSelect;
export type CredentialRecord = typeof credentialRecords.$inferSelect;
export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type CoverageReport = typeof coverageReports.$inferSelect;
export type BrowserTestSession = typeof browserTestSessions.$inferSelect;
export type DriftQueueEntry = typeof driftQueue.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

export type NewComponentArtifact = typeof componentArtifacts.$inferInsert;
export type NewDesignArtifact = typeof designArtifacts.$inferInsert;
export type NewSyncOperation = typeof syncOperations.$inferInsert;
export type NewUndoStackEntry = typeof undoStackEntries.$inferInsert;
export type NewCredentialRecord = typeof credentialRecords.$inferInsert;
export type NewNotificationEvent = typeof notificationEvents.$inferInsert;
export type NewCoverageReport = typeof coverageReports.$inferInsert;
export type NewBrowserTestSession = typeof browserTestSessions.$inferInsert;
export type NewDriftQueueEntry = typeof driftQueue.$inferInsert;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
