-- 003_workflow_generations.sql
-- Tracks n8n workflow generation requests for analytics and prompt improvement

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workflow_generations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_type    TEXT,
  integrations    TEXT[],
  complexity      TEXT,
  rating          INTEGER     CHECK (rating IN (-1, 1)),
  comment         TEXT        CHECK (char_length(comment) <= 500),
  ip_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workflow_generations ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT only (to save feedback) — they cannot read, update, or delete
CREATE POLICY "wf_gen_insert"
  ON workflow_generations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role has full access for admin analytics
-- (service role bypasses RLS by default — no policy needed)

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_workflow_gen_created_at ON workflow_generations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_gen_rating     ON workflow_generations (rating)      WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_gen_trigger    ON workflow_generations (trigger_type) WHERE trigger_type IS NOT NULL;
