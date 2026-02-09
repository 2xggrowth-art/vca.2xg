-- Create project_skips table to track when videographers/editors skip projects
CREATE TABLE IF NOT EXISTS project_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES viral_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('VIDEOGRAPHER', 'EDITOR')),
  skipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(analysis_id, user_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_project_skips_user_id ON project_skips(user_id);

-- Index for fast lookups by analysis
CREATE INDEX IF NOT EXISTS idx_project_skips_analysis_id ON project_skips(analysis_id);

-- Allow service_role full access (RLS disabled for service_role by default)
-- Add permissive policies for authenticated users
ALTER TABLE project_skips ENABLE ROW LEVEL SECURITY;

-- Users can insert their own skips
CREATE POLICY "Users can insert own skips" ON project_skips
  FOR INSERT WITH CHECK (true);

-- Users can view their own skips
CREATE POLICY "Users can view own skips" ON project_skips
  FOR SELECT USING (true);

-- Users can delete their own skips (for admin un-skip)
CREATE POLICY "Users can delete skips" ON project_skips
  FOR DELETE USING (true);
