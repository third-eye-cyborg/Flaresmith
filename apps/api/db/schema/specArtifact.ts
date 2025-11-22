import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { projects } from "./base";

// Enum for generated artifact types produced by spec apply
export const specArtifactTypeEnum = pgEnum("spec_artifact_type", [
  "zodSchema",
  "drizzleModel",
  "routeStub",
  "postmanCollection",
  "mcpTool",
  "openapi",
  "other",
]);

// Tracks artifacts generated from spec files to enable drift detection and idempotent regeneration
export const specArtifacts = pgTable("spec_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  // The feature directory containing the source spec (e.g., specs/001-platform-bootstrap)
  featureDir: varchar("feature_dir", { length: 512 }).notNull(),
  // Relative path to the source spec file (e.g., specs/001-platform-bootstrap/spec.md)
  sourcePath: varchar("source_path", { length: 1024 }).notNull(),
  // The type of artifact generated from the spec
  artifactType: specArtifactTypeEnum("artifact_type").notNull(),
  // Relative path to the generated artifact (code file, collection, or descriptor)
  artifactPath: varchar("artifact_path", { length: 1024 }).notNull(),
  // Content checksum (e.g., sha256 hex) of the generated artifact for drift detection
  checksum: varchar("checksum", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SpecArtifact = typeof specArtifacts.$inferSelect;
export type NewSpecArtifact = typeof specArtifacts.$inferInsert;
