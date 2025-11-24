-- T009: Create Design Sync & Integration Hub Tables
-- Migration: 20251123_design_sync.sql
-- Feature: 006-design-sync-integration
-- Source: specs/006-design-sync-integration/data-model.md

-- Enums
CREATE TYPE design_mapping_status AS ENUM ('unmapped','mapped','drift');
CREATE TYPE sync_operation_status AS ENUM ('pending','running','completed','partial','failed');
CREATE TYPE credential_provider_type AS ENUM ('notification','design','documentation','testing','ai','analytics');
CREATE TYPE credential_status AS ENUM ('valid','revoked','expired','pending');
CREATE TYPE notification_event_type AS ENUM ('sync_completed','drift_detected','coverage_summary','digest','credential_status','browser_test_failure');
CREATE TYPE notification_dispatch_status AS ENUM ('queued','sent','failed','retrying');
CREATE TYPE browser_session_status AS ENUM ('running','passed','failed','aborted');

-- component_artifacts
CREATE TABLE component_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  variants JSONB NOT NULL,
  mapping_status design_mapping_status NOT NULL DEFAULT 'unmapped',
  last_story_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- design_artifacts
CREATE TABLE design_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES component_artifacts(id) ON DELETE CASCADE,
  variant_refs JSONB NOT NULL,
  last_design_change_at TIMESTAMPTZ NOT NULL,
  diff_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX design_artifacts_component_id_idx ON design_artifacts(component_id);

-- sync_operations
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  components_affected JSONB NOT NULL,
  direction_modes JSONB NOT NULL,
  diff_summary JSONB NOT NULL,
  reversible_until TIMESTAMPTZ NOT NULL,
  operation_hash TEXT NOT NULL UNIQUE,
  status sync_operation_status NOT NULL DEFAULT 'pending',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sync_operations_status_idx ON sync_operations(status);
CREATE INDEX sync_operations_reversible_until_idx ON sync_operations(reversible_until);

-- undo_stack_entries
CREATE TABLE undo_stack_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_operation_id UUID NOT NULL REFERENCES sync_operations(id) ON DELETE CASCADE,
  pre_state_hash TEXT NOT NULL,
  post_state_hash TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at TIMESTAMPTZ
);
CREATE INDEX undo_stack_entries_sync_operation_id_idx ON undo_stack_entries(sync_operation_id);
CREATE INDEX undo_stack_entries_expiration_idx ON undo_stack_entries(expiration);

-- credential_records
CREATE TABLE credential_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type credential_provider_type NOT NULL,
  status credential_status NOT NULL DEFAULT 'pending',
  last_validation_time TIMESTAMPTZ,
  rotation_due TIMESTAMPTZ,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX credential_records_provider_status_idx ON credential_records(provider_type, status);

-- notification_events
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_event_type NOT NULL,
  payload_summary JSONB NOT NULL,
  channel_targets JSONB NOT NULL,
  dispatch_status notification_dispatch_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notification_events_type_created_at_idx ON notification_events(type, created_at DESC);

-- coverage_reports
CREATE TABLE coverage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES component_artifacts(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  variant_coverage_pct NUMERIC NOT NULL,
  missing_variants JSONB NOT NULL,
  missing_tests JSONB NOT NULL,
  warnings JSONB
);
CREATE INDEX coverage_reports_component_id_generated_at_idx ON coverage_reports(component_id, generated_at DESC);

-- browser_test_sessions
CREATE TABLE browser_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status browser_session_status NOT NULL DEFAULT 'running',
  performance_summary JSONB,
  correlation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX browser_test_sessions_story_id_idx ON browser_test_sessions(story_id);
CREATE INDEX browser_test_sessions_status_idx ON browser_test_sessions(status);

-- drift_queue (optional optimization)
CREATE TABLE drift_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL UNIQUE REFERENCES component_artifacts(id) ON DELETE CASCADE,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ
);

-- notification_preferences (US3: per-user notification preferences)
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID,
  category_preferences JSONB NOT NULL DEFAULT '{}',
  digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  digest_frequency TEXT NOT NULL DEFAULT 'daily',
  digest_time_utc TEXT NOT NULL DEFAULT '09:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notification_preferences_user_project_idx ON notification_preferences(user_id, project_id);

-- Comments for documentation
COMMENT ON TABLE component_artifacts IS 'Coded UI components with mapping status';
COMMENT ON TABLE design_artifacts IS 'Design source metadata and diff hash';
COMMENT ON TABLE sync_operations IS 'Sync operations capturing affected components and diff summary';
COMMENT ON TABLE undo_stack_entries IS 'Undo stack entries for reversible sync operations';
COMMENT ON TABLE credential_records IS 'Non-secret credential metadata and status';
COMMENT ON TABLE notification_events IS 'Notification events queued/sent to channels';
COMMENT ON TABLE coverage_reports IS 'Coverage reports per component';
COMMENT ON TABLE browser_test_sessions IS 'Browser MCP test session tracking';
COMMENT ON TABLE drift_queue IS 'Queue for pending drift evaluations';
COMMENT ON TABLE notification_preferences IS 'Per-user notification category preferences and digest settings';
