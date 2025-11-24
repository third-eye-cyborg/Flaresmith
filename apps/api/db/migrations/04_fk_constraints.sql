-- Foreign Key Constraints with Cascade Behavior (T088)
-- 
-- Adds explicit CASCADE DELETE constraints to ensure data integrity
-- when parent records are deleted.
--
-- Prevents orphaned records in child tables:
-- - admin_sessions → users (admin_user_id)
-- - user_sessions → users (user_id)
-- - polar_customers → users (user_id)
-- - admin_audit_logs → users (admin_user_id)
-- - mapbox_tokens → users (user_id)
-- - notification_preferences → users (user_id)
-- - mcp_tool_invocations → users (actor_user_id)
-- - stream_playback_deny → users (user_id)

-- Admin Sessions: Delete admin sessions when admin user deleted
ALTER TABLE admin_sessions
DROP CONSTRAINT IF EXISTS admin_sessions_admin_user_id_fkey,
ADD CONSTRAINT admin_sessions_admin_user_id_fkey
  FOREIGN KEY (admin_user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- User Sessions: Delete user sessions when user deleted
ALTER TABLE user_sessions
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey,
ADD CONSTRAINT user_sessions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Polar Customers: Delete billing records when user deleted
ALTER TABLE polar_customers
DROP CONSTRAINT IF EXISTS polar_customers_user_id_fkey,
ADD CONSTRAINT polar_customers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Admin Audit Logs: Preserve logs but nullify admin_user_id on admin deletion
-- (SET NULL instead of CASCADE to maintain audit trail)
ALTER TABLE admin_audit_logs
DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_user_id_fkey,
ADD CONSTRAINT admin_audit_logs_admin_user_id_fkey
  FOREIGN KEY (admin_user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Mapbox Tokens: Delete tokens when user deleted
ALTER TABLE mapbox_tokens
DROP CONSTRAINT IF EXISTS mapbox_tokens_user_id_fkey,
ADD CONSTRAINT mapbox_tokens_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Notification Preferences: Delete preferences when user deleted
ALTER TABLE notification_preferences
DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey,
ADD CONSTRAINT notification_preferences_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- MCP Tool Invocations: Preserve invocation logs but nullify actor
-- (SET NULL instead of CASCADE to maintain MCP audit trail)
ALTER TABLE mcp_tool_invocations
DROP CONSTRAINT IF EXISTS mcp_tool_invocations_actor_user_id_fkey,
ADD CONSTRAINT mcp_tool_invocations_actor_user_id_fkey
  FOREIGN KEY (actor_user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Stream Playback Deny: Delete deny records when user deleted
ALTER TABLE stream_playback_deny
DROP CONSTRAINT IF EXISTS stream_playback_deny_user_id_fkey,
ADD CONSTRAINT stream_playback_deny_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Create indexes to optimize foreign key lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_polar_customers_user_id ON polar_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_mapbox_tokens_user_id ON mapbox_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_invocations_actor_user_id ON mcp_tool_invocations(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_stream_playback_deny_user_id ON stream_playback_deny(user_id);

-- Add comments documenting cascade behavior
COMMENT ON CONSTRAINT admin_sessions_admin_user_id_fkey ON admin_sessions IS 
  'Cascade delete: Admin sessions are removed when admin account deleted';

COMMENT ON CONSTRAINT user_sessions_user_id_fkey ON user_sessions IS 
  'Cascade delete: User sessions are removed when user account deleted';

COMMENT ON CONSTRAINT polar_customers_user_id_fkey ON polar_customers IS 
  'Cascade delete: Billing records are removed when user account deleted';

COMMENT ON CONSTRAINT admin_audit_logs_admin_user_id_fkey ON admin_audit_logs IS 
  'Set null on delete: Audit logs preserved but admin_user_id nullified for deleted admins';

COMMENT ON CONSTRAINT mapbox_tokens_user_id_fkey ON mapbox_tokens IS 
  'Cascade delete: Mapbox tokens are removed when user account deleted';

COMMENT ON CONSTRAINT notification_preferences_user_id_fkey ON notification_preferences IS 
  'Cascade delete: Notification preferences are removed when user account deleted';

COMMENT ON CONSTRAINT mcp_tool_invocations_actor_user_id_fkey ON mcp_tool_invocations IS 
  'Set null on delete: MCP tool invocation logs preserved but actor_user_id nullified for deleted users';

COMMENT ON CONSTRAINT stream_playback_deny_user_id_fkey ON stream_playback_deny IS 
  'Cascade delete: Stream deny records are removed when user account deleted';
