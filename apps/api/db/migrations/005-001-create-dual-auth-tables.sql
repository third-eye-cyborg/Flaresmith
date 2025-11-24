-- 005-001-create-dual-auth-tables.sql
-- T026: Initial migration for Dual Authentication Architecture & Multi-MCP Ecosystem
-- Includes new enums, user table extensions, and creation of core + observability tables (T016–T025)

-- Enum: auth_role
DO $$ BEGIN
  CREATE TYPE auth_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enums: subscription tier & status
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free','pro','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active','canceled','past_due','trialing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend users table with role + auth provider IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS role auth_role NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS neon_auth_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS better_auth_id VARCHAR(255);

-- admin_sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(64),
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_expires ON admin_sessions(user_id, expires_at);

-- user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(64),
  user_agent TEXT,
  polar_customer_id VARCHAR(255) NOT NULL,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing'
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_status ON user_sessions(user_id, subscription_status);

-- polar_customers
CREATE TABLE IF NOT EXISTS polar_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  polar_customer_id TEXT NOT NULL UNIQUE,
  subscription_tier TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polar_customers_customer_id ON polar_customers(polar_customer_id);

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes_json JSONB,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id, created_at);

-- mapbox_tokens
CREATE TABLE IF NOT EXISTS mapbox_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  prefix VARCHAR(6) NOT NULL,
  suffix VARCHAR(4) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token_hash)
);
CREATE INDEX IF NOT EXISTS idx_mapbox_tokens_user ON mapbox_tokens(user_id);

-- notification_segments
CREATE TABLE IF NOT EXISTS notification_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  criterion_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segments_subscribed UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- mcp_tool_invocations
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  duration_ms INT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  correlation_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resource_ref TEXT,
  rate_limit_applied BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_server_ts ON mcp_tool_invocations(server_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_actor_ts ON mcp_tool_invocations(actor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_tool_ts ON mcp_tool_invocations(tool_name, timestamp DESC);

-- mcp_server_metrics
CREATE TABLE IF NOT EXISTS mcp_server_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name TEXT NOT NULL,
  date DATE NOT NULL,
  p95_latency_ms INT NOT NULL,
  error_rate_pct NUMERIC(5,2) NOT NULL,
  seq_latency_ms INT,
  parallel_latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(server_name, date)
);

-- mcp_drift_snapshots
CREATE TABLE IF NOT EXISTS mcp_drift_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name TEXT NOT NULL,
  diff_json JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'detected'
);
CREATE INDEX IF NOT EXISTS idx_mcp_drift_snapshots_server_detected ON mcp_drift_snapshots(server_name, detected_at);

-- stream_playback_deny
CREATE TABLE IF NOT EXISTS stream_playback_deny (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stream_playback_deny_token ON stream_playback_deny(token_id);

-- Completed T026
