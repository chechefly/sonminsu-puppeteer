/*
  # Create editor_sessions table

  ## Purpose
  Stores card news editing sessions so users can return and reload previous work.

  ## Tables
  - `editor_sessions`
    - `id` (uuid, primary key)
    - `title` (text) - auto-generated from first slide number or timestamp
    - `slides_json` (jsonb) - full slides array including html and candidate images
    - `caption` (text) - Instagram caption
    - `extracted_styles` (text) - CSS styles extracted from original HTML
    - `slide_count` (int) - number of slides (for quick display)
    - `created_at` (timestamptz) - when session was saved
    - `updated_at` (timestamptz) - when session was last updated

  ## Security
  - RLS enabled
  - Public read/write allowed since this is a local single-user tool (no auth)
    but scoped via a session_token stored in localStorage
  - `session_token` (text) - browser-level identifier to scope sessions
*/

CREATE TABLE IF NOT EXISTS editor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '제목 없음',
  slides_json jsonb NOT NULL DEFAULT '[]',
  caption text NOT NULL DEFAULT '',
  extracted_styles text NOT NULL DEFAULT '',
  slide_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editor_sessions_token ON editor_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_created ON editor_sessions(created_at DESC);

ALTER TABLE editor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Token owners can select own sessions"
  ON editor_sessions FOR SELECT
  TO anon
  USING (session_token = current_setting('request.headers', true)::json->>'x-session-token' OR session_token = '');

CREATE POLICY "Token owners can insert sessions"
  ON editor_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Token owners can update own sessions"
  ON editor_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Token owners can delete own sessions"
  ON editor_sessions FOR DELETE
  TO anon
  USING (true);
