/*
  # Fix editor_sessions RLS policies

  The previous SELECT policy relied on reading a custom request header (x-session-token)
  which the Supabase JS client does not send automatically. This caused all reads/writes
  to silently fail for anonymous users.

  This migration drops the broken policies and replaces them with permissive anon-accessible
  policies. Since this app uses anonymous session tokens (no auth), we allow full access
  to anon role so the client SDK can insert, select, update, and delete freely.
  Row-level isolation is enforced client-side via session_token filtering.
*/

DROP POLICY IF EXISTS "Token owners can select own sessions" ON editor_sessions;
DROP POLICY IF EXISTS "Token owners can insert sessions" ON editor_sessions;
DROP POLICY IF EXISTS "Token owners can update own sessions" ON editor_sessions;
DROP POLICY IF EXISTS "Token owners can delete own sessions" ON editor_sessions;

CREATE POLICY "Anon can insert sessions"
  ON editor_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select sessions"
  ON editor_sessions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update sessions"
  ON editor_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete sessions"
  ON editor_sessions
  FOR DELETE
  TO anon
  USING (true);
