-- Block 1: Add user_id to sessions 
-- Add as nullable first (safe for existing data)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast per-user queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions(user_id, created_at DESC);

-- Block 2: Create analysis_labels table 
CREATE TABLE IF NOT EXISTS analysis_labels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(200),      -- user's custom name, NULL = show original filename
  is_starred   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_labels_user ON analysis_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_labels_session ON analysis_labels(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_labels_starred
  ON analysis_labels(user_id, is_starred) WHERE is_starred = TRUE;

-- Block 3: Enable Row Level Security on ALL tables 
-- Sessions: users see only their own
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_sessions" ON sessions;
CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Datasets: inherit via session ownership
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_datasets" ON datasets;
CREATE POLICY "users_own_datasets" ON datasets
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Analyses
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_analyses" ON analyses;
CREATE POLICY "users_own_analyses" ON analyses
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Visualizations
ALTER TABLE visualizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_visualizations" ON visualizations;
CREATE POLICY "users_own_visualizations" ON visualizations
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Insights
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_insights" ON insights;
CREATE POLICY "users_own_insights" ON insights
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Forecasts
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_forecasts" ON forecasts;
CREATE POLICY "users_own_forecasts" ON forecasts
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_conversations" ON conversations;
CREATE POLICY "users_own_conversations" ON conversations
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_reports" ON reports;
CREATE POLICY "users_own_reports" ON reports
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Analysis labels: users see their own
ALTER TABLE analysis_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_labels" ON analysis_labels;
CREATE POLICY "users_own_labels" ON analysis_labels
  FOR ALL USING (auth.uid() = user_id);

-- Block 4: Service role bypass (for backend writes) 
-- The FastAPI backend uses the SERVICE_ROLE key which bypasses RLS.
-- This is correct and intentional — the backend is trusted.
-- Verify: settings.SUPABASE_KEY in your backend .env should be the
-- SERVICE_ROLE key (not the anon key) for full write access.
-- The anon key goes in the frontend .env only.
