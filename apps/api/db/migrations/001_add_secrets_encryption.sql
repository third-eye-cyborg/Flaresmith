-- T151: pgcrypto extension and security-related tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: secrets_metadata (encrypted metadata only, NOT secret values)
CREATE TABLE IF NOT EXISTS secrets_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  environment_id uuid NOT NULL,
  name text NOT NULL,
  encrypted_metadata text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS secrets_metadata_project_env_idx ON secrets_metadata(project_id, environment_id);
CREATE INDEX IF NOT EXISTS secrets_metadata_name_idx ON secrets_metadata(name);

-- Table: secret_audit (access + modification events)
CREATE TABLE IF NOT EXISTS secret_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  environment_id uuid NOT NULL,
  secret_name text NOT NULL,
  action text NOT NULL,          -- read|update|rotate
  actor_id uuid,                 -- optional user id
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS secret_audit_project_env_idx ON secret_audit(project_id, environment_id);
CREATE INDEX IF NOT EXISTS secret_audit_secret_idx ON secret_audit(secret_name);

-- Table: jwt_keys (rotatable token signing keys)
CREATE TABLE IF NOT EXISTS jwt_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid text NOT NULL UNIQUE,
  encrypted_secret text NOT NULL,
  algorithm text NOT NULL DEFAULT 'HS256',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);
CREATE INDEX IF NOT EXISTS jwt_keys_active_idx ON jwt_keys(active);

-- Deactivate older active keys keeping only the most recent one active (safety guard)
UPDATE jwt_keys SET active = false WHERE active = true AND kid NOT IN (
  SELECT kid FROM jwt_keys ORDER BY created_at DESC LIMIT 1
);
