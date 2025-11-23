-- T001/T002: Create auth-related tables (sessions, identity_provider_links, oauth_state)
-- Migration: 003-001-create-auth-tables.sql
-- Source: specs/003-neon-auth-migration/data-model.md

-- Enum for auth providers
DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('apple', 'google', 'github', 'password');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- identity_provider_links
CREATE TABLE IF NOT EXISTS identity_provider_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider NOT NULL,
  subject TEXT NOT NULL,
  email_at_provider VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_idp_links_user ON identity_provider_links(user_id);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  device_info JSONB,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);

-- oauth_state
CREATE TABLE IF NOT EXISTS oauth_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  provider auth_provider NOT NULL,
  redirect_uri VARCHAR(512) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
