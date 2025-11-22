# Data Model: Platform Bootstrap

This document derives entities, fields, relationships, and validation rules from `spec.md` and Phase 0 research decisions.

## Conventions
- ID format: UUID v4 for all entities
- Timestamps: ISO 8601 strings in UTC (createdAt, updatedAt)
- Soft delete: Not used in P1. Archival implemented via status fields: Project.status can be 'failed' (terminal state); Deployments can be 'rolledback' (historical record). No entities are hard-deleted; failed/terminal states serve as archival mechanism.
- Booleans: true/false (no 1/0)

## Entities

### Project
- id (uuid) REQUIRED
- name (string, 3..64) REQUIRED, unique per org
- slug (string, kebab-case) REQUIRED, unique per org
- orgId (uuid) REQUIRED → Organization.id
- defaultBranch (string, default "main")
- status (enum: provisioning|active|failed) default provisioning
- integrations (object) OPTIONAL
  - githubRepo (string, full_name) OPTIONAL
  - cloudflareAccountId (string) OPTIONAL
  - neonProjectId (string) OPTIONAL
  - postmanWorkspaceId (string) OPTIONAL
- envMatrix (computed, not stored) → see Environment
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

Constraints:
- (orgId, name) unique
- (orgId, slug) unique

### Environment
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- name (string) REQUIRED (core environments MUST be one of dev|staging|prod; preview environments MUST match regex `^preview-[a-z0-9-]+$` derived from feature branch slug)
- kind (enum: core|preview) REQUIRED
- githubBranch (string) REQUIRED
- cloudflareUrl (string, url) OPTIONAL
- neonBranchId (string) OPTIONAL
- postmanEnvironmentId (string) OPTIONAL
- lastDeploymentId (uuid) OPTIONAL → Deployment.id
- ttlExpiresAt (datetime) OPTIONAL (only for kind=preview) – null for core
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

Indexes:
- (projectId, name) unique
- Partial index: WHERE kind='preview' AND ttlExpiresAt IS NOT NULL for efficient expiry scans

### IntegrationConfig
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- provider (enum: github|cloudflare|neon|postman|betterauth|codespaces)
- config (json) REQUIRED
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### Deployment
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- environmentId (uuid) REQUIRED → Environment.id
- sourceCommitSha (string, 40) REQUIRED
- providerIds (object)
  - cloudflareDeploymentId (string) OPTIONAL
  - githubRunId (string) OPTIONAL
- status (enum: queued|running|succeeded|failed|rolledback) REQUIRED
- preview (boolean) REQUIRED default false (true when deployment targets kind=preview environment; used to exclude from uptime / deployment success SLO aggregations)
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### Build
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- environmentId (uuid) REQUIRED → Environment.id
- commitSha (string, 40) REQUIRED
- status (enum: queued|running|succeeded|failed) REQUIRED
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### User
- id (uuid) REQUIRED
- orgId (uuid) REQUIRED → Organization.id
- email (string, email) REQUIRED
- displayName (string, 1..64) OPTIONAL
- roles (string[], values: admin|developer|viewer) REQUIRED
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### Organization
- id (uuid) REQUIRED
- name (string, 3..64) REQUIRED, unique
- slug (string, kebab-case) REQUIRED, unique
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### SpecArtifact
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- version (string, semver) REQUIRED
- path (string) REQUIRED
- artifactType (enum: openapi|zod|routes|postman|mcp-tool)
- checksum (string) REQUIRED
- createdAt (datetime) REQUIRED

### MCPToolDescriptor
- id (uuid) REQUIRED
- provider (string) REQUIRED
- name (string) REQUIRED
- inputSchemaRef (string) REQUIRED
- outputSchemaRef (string) REQUIRED
- path (string) REQUIRED (location under /mcp/servers)
- version (string) OPTIONAL
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### ChatSession
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- userId (uuid) REQUIRED → User.id
- status (enum: active|closed) REQUIRED
- lastMessageAt (datetime) OPTIONAL
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### Codespace
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- githubCodespaceId (string) REQUIRED
- url (string, url) REQUIRED
- status (enum: starting|available|stopped|error) REQUIRED
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

### Repo
- id (uuid) REQUIRED
- projectId (uuid) REQUIRED → Project.id
- provider (enum: github) REQUIRED
- fullName (string owner/name) REQUIRED
- defaultBranch (string) REQUIRED
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

## Relationships Summary
- Organization 1—* Project
- Project 1—* Environment
- Project 1—* IntegrationConfig
- Project 1—* Deployment
- Project 1—* Build
- Project 1—* SpecArtifact
- Project 1—* Codespace
- Project 1—1 Repo
- User *—* Project (via roles/permissions; modeled by BetterAuth policies)

## Validation Rules
- All IDs are UUID v4.
- Timestamps are ISO 8601 UTC.
- Pagination responses include: items[], hasMore (bool), nextCursor (string|null).
- Error schema includes: code (string), message (string), correlationId (string), details (object|null).
- Error code taxonomy (final structure): CATEGORY_SUBCATEGORY[_PROVIDER] uppercase snake case.
  Categories:
    - ENV: environment lifecycle & preview handling (e.g., ENV_PREVIEW_EXPIRED, ENV_PROMOTION_INVALID_STATE)
    - INTEGRATION: external provider failures post-retry (e.g., INTEGRATION_CLOUDFLARE_TIMEOUT, INTEGRATION_GITHUB_RATE_LIMIT)
    - AUTH: authentication/authorization (e.g., AUTH_ROLE_DENIED)
    - RATE_LIMIT: throttling responses (e.g., RATE_LIMIT_USER, RATE_LIMIT_PROJECT)
    - SPEC: spec parsing & drift (e.g., SPEC_DRIFT_CONFLICT, SPEC_PARSE_ERROR)
    - CHAT: chat diff & commit conflicts (e.g., CHAT_DIFF_OUTDATED_BASE)
    - INTERNAL: unexpected server errors (e.g., INTERNAL_UNEXPECTED)
  Each error includes severity (enum: info|warn|error|critical) and retryPolicy (enum: none|safe|idempotent). Clients use retryPolicy to decide re-attempt logic; circuit breaker ignores codes with severity=info/warn.

## API Response Schemas

### DriftReport (for POST /specs/apply response)
Response structure for spec apply operations indicating code drift:

- changedFiles (array of objects) REQUIRED
  - path (string) REQUIRED
  - changeType (enum: created|modified|deleted) REQUIRED
  - linesAdded (integer) OPTIONAL
  - linesRemoved (integer) OPTIONAL
- conflicts (array of objects) OPTIONAL
  - path (string) REQUIRED
  - reason (string) REQUIRED (e.g., "Local uncommitted changes detected")
  - resolution (string) OPTIONAL
- summary (object) REQUIRED
  - totalFiles (integer) REQUIRED
  - filesCreated (integer) REQUIRED
  - filesModified (integer) REQUIRED
  - filesDeleted (integer) REQUIRED
  - hasConflicts (boolean) REQUIRED
- appliedAt (datetime) REQUIRED


