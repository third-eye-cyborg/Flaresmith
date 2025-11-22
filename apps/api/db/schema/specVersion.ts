import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * SpecVersion Schema
 * 
 * Tracks spec version history and Constitution alignment.
 * Per FR-027 and coverage gap C6: Store version metadata with Constitution reference.
 */
export const specVersions = pgTable('spec_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign keys
  projectId: uuid('project_id').notNull(),
  
  // Version tracking
  version: varchar('version', { length: 32 }).notNull(), // semver format
  constitutionVersion: varchar('constitution_version', { length: 32 }).notNull(), // e.g., "0.1.0"
  
  // Spec content reference
  specHash: varchar('spec_hash', { length: 64 }).notNull(), // SHA-256 of spec content
  specPath: varchar('spec_path', { length: 512 }).notNull(), // Path to spec file
  
  // Metadata
  description: varchar('description', { length: 1024 }),
  author: varchar('author', { length: 256 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SpecVersion = typeof specVersions.$inferSelect;
export type NewSpecVersion = typeof specVersions.$inferInsert;
