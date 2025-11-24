-- T004: Create Design System Tables
-- Migration: 004-001-create-design-system-tables.sql
-- Feature: 004-design-system
-- Source: specs/004-design-system/data-model.md

-- Create enums
CREATE TYPE token_category AS ENUM (
  'color',
  'spacing',
  'typography',
  'radius',
  'elevation',
  'glass',
  'semantic'
);

CREATE TYPE override_status AS ENUM (
  'submitted',
  'auto-applied',
  'pending-approval',
  'approved',
  'rejected',
  'archived'
);

CREATE TYPE theme_mode AS ENUM ('light', 'dark');

CREATE TYPE accessibility_status AS ENUM ('pass', 'warn', 'fail');

-- DesignToken table
CREATE TABLE design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category token_category NOT NULL,
  value JSONB NOT NULL,
  accessibility_meta JSONB,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX design_tokens_name_idx ON design_tokens(name);

-- DesignTokenVersionSnapshot table
CREATE TABLE design_token_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  hash TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX design_token_versions_hash_idx ON design_token_versions(hash);
CREATE INDEX design_token_versions_version_idx ON design_token_versions(version);

-- ThemeOverride table
CREATE TABLE theme_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('dev', 'staging', 'prod')),
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status override_status NOT NULL DEFAULT 'submitted',
  size_pct INTEGER NOT NULL CHECK (size_pct >= 0 AND size_pct <= 100),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  token_diff JSONB NOT NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX theme_overrides_project_env_status_idx ON theme_overrides(project_id, environment, status);

-- ComponentVariant table
CREATE TABLE component_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  variant TEXT NOT NULL,
  tokens_used JSONB NOT NULL,
  accessibility_status accessibility_status NOT NULL DEFAULT 'pass',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AccessibilityAuditResult table
CREATE TABLE accessibility_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  mode theme_mode NOT NULL,
  report JSONB NOT NULL,
  passed_pct INTEGER NOT NULL CHECK (passed_pct >= 0 AND passed_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX accessibility_audit_results_version_mode_idx ON accessibility_audit_results(version, mode);

-- DesignDriftEvent table
CREATE TABLE design_drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_version INTEGER NOT NULL,
  current_hash TEXT NOT NULL,
  diff JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX design_drift_events_baseline_version_idx ON design_drift_events(baseline_version);

-- Add comments for documentation
COMMENT ON TABLE design_tokens IS 'Atomic design values for cross-platform design system';
COMMENT ON TABLE design_token_versions IS 'Immutable snapshots for version control and rollback';
COMMENT ON TABLE theme_overrides IS 'User-submitted environment-scoped token customizations';
COMMENT ON TABLE component_variants IS 'Component variant metadata with token usage tracking';
COMMENT ON TABLE accessibility_audit_results IS 'WCAG AA contrast audit reports';
COMMENT ON TABLE design_drift_events IS 'Drift detection between spec tokens and generated configs';
