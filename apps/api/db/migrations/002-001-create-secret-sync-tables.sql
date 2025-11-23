-- T005: Create Secret Sync Tables
-- Migration: 002-001-create-secret-sync-tables.sql
-- Source: specs/002-github-secrets-sync/data-model.md

-- Create enums
CREATE TYPE secret_sync_status AS ENUM ('pending', 'synced', 'failed', 'conflict');
CREATE TYPE secret_sync_operation AS ENUM ('create', 'update', 'delete', 'sync_all', 'validate');
CREATE TYPE secret_sync_event_status AS ENUM ('success', 'failure', 'partial');
CREATE TYPE github_environment_status AS ENUM ('provisioning', 'active', 'failed');
CREATE TYPE github_api_quota_type AS ENUM ('core', 'secrets', 'graphql');

-- SecretMapping table
CREATE TABLE secret_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  secret_name VARCHAR(100) NOT NULL CHECK (secret_name ~ '^[A-Z][A-Z0-9_]*$'),
  value_hash CHAR(64) NOT NULL,
  source_scope VARCHAR(20) NOT NULL DEFAULT 'actions',
  target_scopes TEXT[] NOT NULL,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_status secret_sync_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, secret_name)
);

CREATE INDEX idx_secret_mappings_sync_status ON secret_mappings(sync_status, last_synced_at);
CREATE INDEX idx_secret_mappings_exclusion ON secret_mappings(project_id, is_excluded);

-- SecretExclusionPattern table
CREATE TABLE secret_exclusion_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pattern VARCHAR(200) NOT NULL,
  reason TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, pattern),
  CHECK ((is_global = true AND project_id IS NULL) OR (is_global = false AND project_id IS NOT NULL))
);

CREATE INDEX idx_secret_exclusion_global ON secret_exclusion_patterns(is_global, pattern);

-- SecretSyncEvent table (partitioned by month)
CREATE TABLE secret_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  operation secret_sync_operation NOT NULL,
  secret_name VARCHAR(100),
  affected_scopes TEXT[] NOT NULL,
  status secret_sync_event_status NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  correlation_id UUID NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (success_count + failure_count = array_length(affected_scopes, 1))
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_secret_sync_events_project ON secret_sync_events(project_id, created_at DESC);
CREATE INDEX idx_secret_sync_events_correlation ON secret_sync_events(correlation_id);
CREATE INDEX idx_secret_sync_events_actor ON secret_sync_events(actor_id, created_at DESC);

-- Create partitions for current and next 3 months
CREATE TABLE secret_sync_events_2025_11 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE secret_sync_events_2025_12 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE secret_sync_events_2026_01 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- GitHubEnvironmentConfig table
CREATE TABLE github_environment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_name VARCHAR(20) NOT NULL CHECK (environment_name IN ('dev', 'staging', 'production')),
  github_environment_id INTEGER NOT NULL,
  protection_rules JSONB NOT NULL,
  secrets JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  status github_environment_status NOT NULL DEFAULT 'provisioning',
  last_deployment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, environment_name)
);

CREATE INDEX idx_github_env_status ON github_environment_configs(status);

-- GitHubApiQuota table
CREATE TABLE github_api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quota_type github_api_quota_type NOT NULL,
  remaining INTEGER NOT NULL CHECK (remaining >= 0),
  limit_value INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, quota_type),
  CHECK (remaining <= limit_value)
);

CREATE INDEX idx_github_quota_reset ON github_api_quotas(reset_at);

-- T007: Seed global exclusion patterns
INSERT INTO secret_exclusion_patterns (pattern, reason, is_global) VALUES
  ('^GITHUB_TOKEN$', 'Platform-managed GitHub token', true),
  ('^ACTIONS_.*', 'GitHub Actions runtime variables', true),
  ('^RUNNER_.*', 'GitHub runner environment variables', true),
  ('^CI$', 'CI flag auto-injected by GitHub', true),
  ('^GITHUB_WORKSPACE$', 'Workspace path auto-injected', true),
  ('^GITHUB_SHA$', 'Commit SHA auto-injected', true),
  ('^GITHUB_REF$', 'Git ref auto-injected', true);
