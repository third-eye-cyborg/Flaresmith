-- 005-003-rls-policies.sql
-- T028: Define RLS policies for dual auth tables (simplified initial set)
-- NOTE: Adjust auth.uid() function to match actual authentication extension in Neon environment.

-- Users: admins see all; standard users see self
CREATE POLICY users_select_self ON users FOR SELECT USING (role = 'admin' OR id = auth.uid());
CREATE POLICY users_update_self ON users FOR UPDATE USING (role = 'admin' OR id = auth.uid());

-- Admin sessions: admins only
CREATE POLICY admin_sessions_select_admin ON admin_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = admin_sessions.user_id AND u.role = 'admin') AND auth.role() = 'admin'
);

-- User sessions: owner or admin
CREATE POLICY user_sessions_select_owner ON user_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = user_sessions.user_id AND (u.id = auth.uid() OR auth.role() = 'admin'))
);

-- Polar customers: owner or admin
CREATE POLICY polar_customers_select_owner ON polar_customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = polar_customers.user_id AND (u.id = auth.uid() OR auth.role() = 'admin'))
);

-- Admin audit logs: admins only
CREATE POLICY admin_audit_logs_select_admin ON admin_audit_logs FOR SELECT USING (auth.role() = 'admin');

-- Mapbox tokens: owner or admin
CREATE POLICY mapbox_tokens_select_owner ON mapbox_tokens FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = mapbox_tokens.user_id AND (u.id = auth.uid() OR auth.role() = 'admin'))
);

-- Notification segments: admins only
CREATE POLICY notification_segments_select_admin ON notification_segments FOR SELECT USING (auth.role() = 'admin');

-- Notification preferences: owner or admin
CREATE POLICY notification_preferences_select_owner ON notification_preferences FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = notification_preferences.user_id AND (u.id = auth.uid() OR auth.role() = 'admin'))
);

-- MCP tool invocations: actor or admin
CREATE POLICY mcp_tool_invocations_select_actor ON mcp_tool_invocations FOR SELECT USING (
  actor_id = auth.uid() OR auth.role() = 'admin'
);

-- MCP server metrics: admins only (users will use aggregated API, not direct table access)
CREATE POLICY mcp_server_metrics_select_admin ON mcp_server_metrics FOR SELECT USING (auth.role() = 'admin');

-- Drift snapshots: admins only
CREATE POLICY mcp_drift_snapshots_select_admin ON mcp_drift_snapshots FOR SELECT USING (auth.role() = 'admin');

-- Stream playback deny: admins only
CREATE POLICY stream_playback_deny_select_admin ON stream_playback_deny FOR SELECT USING (auth.role() = 'admin');

-- End T028
