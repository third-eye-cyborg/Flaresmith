// T152: Drizzle schemas for secrets metadata & audit & jwt keys
import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const secretsMetadata = pgTable('secrets_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  environmentId: uuid('environment_id').notNull(),
  name: text('name').notNull(),
  encryptedMetadata: text('encrypted_metadata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// FR-036 alignment: include origin (user|system), secretRefHash, and rename action -> operation
export const secretAudit = pgTable('secret_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull(),
  environmentId: uuid('environment_id').notNull(),
  // human-friendly name (not raw value)
  secretName: text('secret_name').notNull(),
  // hashed reference (e.g., SHA256 of projectId+environmentId+secretName); spec requires secretRefHash
  secretRefHash: text('secret_ref_hash').notNull(),
  // operation: read|update|rotate per FR-036
  operation: text('operation').notNull(),
  // origin: user|system (system for automated rotations)
  origin: text('origin').notNull().default('system'),
  actorId: uuid('actor_id'), // required when origin=user
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
});

export const jwtKeys = pgTable('jwt_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  kid: text('kid').notNull().unique(),
  encryptedSecret: text('encrypted_secret').notNull(),
  algorithm: text('algorithm').notNull().default('HS256'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
});
