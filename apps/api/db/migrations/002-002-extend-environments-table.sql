-- Migration 002-002: Extend environments table for GitHub secrets sync
-- T032: Add GitHub-specific fields to environments table
-- Date: 2025-11-23
-- Feature: specs/002-github-secrets-sync

-- Add GitHub environment tracking fields
ALTER TABLE environments
ADD COLUMN github_environment_id INTEGER,
ADD COLUMN secrets_last_synced_at TIMESTAMPTZ,
ADD COLUMN sync_status VARCHAR(20);

-- Create index for sync status queries
CREATE INDEX idx_environments_sync_status ON environments(sync_status) WHERE sync_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN environments.github_environment_id IS 'GitHub Environment ID for core environments (dev/staging/production)';
COMMENT ON COLUMN environments.secrets_last_synced_at IS 'Timestamp of last secret synchronization for this environment';
COMMENT ON COLUMN environments.sync_status IS 'Secret sync status: pending|synced|failed';
