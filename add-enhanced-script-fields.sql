-- =============================================
-- Enhanced Script Submission System
-- Adds industry tracking, tags, and detailed metadata
-- =============================================

-- 1. Create Industries Table
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_code TEXT NOT NULL UNIQUE, -- For Content ID prefix (e.g., 'BCH', 'REST')
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Hook Tags Table
CREATE TABLE IF NOT EXISTS hook_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Profile List Table (for Profile/Admin assignment)
CREATE TABLE IF NOT EXISTS profile_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Character Tags Table
CREATE TABLE IF NOT EXISTS character_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create junction table for analysis hook tags (many-to-many)
CREATE TABLE IF NOT EXISTS analysis_hook_tags (
  analysis_id UUID REFERENCES viral_analyses(id) ON DELETE CASCADE,
  hook_tag_id UUID REFERENCES hook_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (analysis_id, hook_tag_id)
);

-- 6. Create junction table for analysis character tags (many-to-many)
CREATE TABLE IF NOT EXISTS analysis_character_tags (
  analysis_id UUID REFERENCES viral_analyses(id) ON DELETE CASCADE,
  character_tag_id UUID REFERENCES character_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (analysis_id, character_tag_id)
);

-- 7. Add new columns to viral_analyses table
ALTER TABLE viral_analyses
  -- Industry and Content ID
  ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id),
  ADD COLUMN IF NOT EXISTS content_id TEXT UNIQUE,

  -- Profile assignment
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profile_list(id),

  -- People and requirements
  ADD COLUMN IF NOT EXISTS total_people_involved INTEGER,
  ADD COLUMN IF NOT EXISTS additional_requirements TEXT,

  -- Admin fields
  ADD COLUMN IF NOT EXISTS syed_sir_presence TEXT CHECK (syed_sir_presence IN ('YES', 'NO')),
  ADD COLUMN IF NOT EXISTS planning_date DATE,

  -- Script writer fields
  ADD COLUMN IF NOT EXISTS on_screen_text_hook TEXT,
  ADD COLUMN IF NOT EXISTS our_idea_audio_url TEXT, -- URL to audio file
  ADD COLUMN IF NOT EXISTS shoot_location TEXT,
  ADD COLUMN IF NOT EXISTS shoot_possibility INTEGER CHECK (shoot_possibility IN (25, 50, 75, 100));

-- 8. Create function to auto-generate Content ID
CREATE OR REPLACE FUNCTION generate_content_id()
RETURNS TRIGGER AS $$
DECLARE
  industry_code TEXT;
  next_number INTEGER;
  new_content_id TEXT;
BEGIN
  -- Get industry short code
  SELECT short_code INTO industry_code
  FROM industries
  WHERE id = NEW.industry_id;

  -- If no industry, use default 'GEN'
  IF industry_code IS NULL THEN
    industry_code := 'GEN';
  END IF;

  -- Get next number for this industry
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(content_id FROM '[0-9]+$') AS INTEGER
    )
  ), 1000) + 1
  INTO next_number
  FROM viral_analyses
  WHERE content_id LIKE industry_code || '-%';

  -- Generate new content ID
  new_content_id := industry_code || '-' || next_number;

  NEW.content_id := new_content_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-generating Content ID
DROP TRIGGER IF EXISTS auto_generate_content_id ON viral_analyses;
CREATE TRIGGER auto_generate_content_id
  BEFORE INSERT ON viral_analyses
  FOR EACH ROW
  WHEN (NEW.content_id IS NULL)
  EXECUTE FUNCTION generate_content_id();

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_viral_analyses_industry_id ON viral_analyses(industry_id);
CREATE INDEX IF NOT EXISTS idx_viral_analyses_profile_id ON viral_analyses(profile_id);
CREATE INDEX IF NOT EXISTS idx_viral_analyses_content_id ON viral_analyses(content_id);
CREATE INDEX IF NOT EXISTS idx_analysis_hook_tags_analysis_id ON analysis_hook_tags(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_character_tags_analysis_id ON analysis_character_tags(analysis_id);

-- 11. Enable RLS on new tables
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_hook_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_character_tags ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for industries (everyone can read, only admins can modify)
CREATE POLICY "Anyone can view industries" ON industries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert industries" ON industries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can update industries" ON industries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can delete industries" ON industries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- 13. Create RLS policies for hook_tags (same pattern)
CREATE POLICY "Anyone can view hook tags" ON hook_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert hook tags" ON hook_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can update hook tags" ON hook_tags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can delete hook tags" ON hook_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- 14. Create RLS policies for profile_list
CREATE POLICY "Anyone can view profile list" ON profile_list
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert profile list" ON profile_list
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can update profile list" ON profile_list
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can delete profile list" ON profile_list
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- 15. Create RLS policies for character_tags
CREATE POLICY "Anyone can view character tags" ON character_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert character tags" ON character_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can update character tags" ON character_tags
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Only admins can delete character tags" ON character_tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- 16. Create RLS policies for junction tables (users can manage their own analysis tags)
CREATE POLICY "Anyone can view analysis hook tags" ON analysis_hook_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their analysis hook tags" ON analysis_hook_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM viral_analyses
      WHERE id = analysis_hook_tags.analysis_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

CREATE POLICY "Anyone can view analysis character tags" ON analysis_character_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their analysis character tags" ON analysis_character_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM viral_analyses
      WHERE id = analysis_character_tags.analysis_id
      AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- 17. Seed initial data - Industries (from Excel sheet)
INSERT INTO industries (name, short_code, description) VALUES
  ('Bicycle Shop', 'BCH', 'Bicycle sales and service business'),
  ('Car Detailing', 'CAR', 'Automotive detailing services'),
  ('Real Estate', 'REST', 'Real estate and property business'),
  ('Restaurant', 'REST', 'Food and dining establishments'),
  ('Waitson', 'WAIT', 'Waitson related content'),
  ('DOODLE', 'DOOD', 'Doodle animation content')
ON CONFLICT (short_code) DO NOTHING;

-- 18. Seed initial data - Hook Tags (from Excel sheet)
INSERT INTO hook_tags (name) VALUES
  ('audio hook'),
  ('SFX hook'),
  ('last hook'),
  ('first hook'),
  ('music hook'),
  ('visual hook'),
  ('text hook')
ON CONFLICT (name) DO NOTHING;

-- 19. Seed initial data - Profile List (from Excel sheet)
INSERT INTO profile_list (name) VALUES
  ('DOODLE'),
  ('BCH'),
  ('waitson'),
  ('car')
ON CONFLICT (name) DO NOTHING;

-- 20. Seed initial data - Character Tags (from Excel sheet)
INSERT INTO character_tags (name) VALUES
  ('5 staff and syed'),
  ('3 2 uncle and syed'),
  ('2 1 boy and syed'),
  ('multiple clients and syed greeting'),
  ('just syed')
ON CONFLICT (name) DO NOTHING;

-- 21. Create updated_at trigger function for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hook_tags_updated_at
  BEFORE UPDATE ON hook_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_list_updated_at
  BEFORE UPDATE ON profile_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_character_tags_updated_at
  BEFORE UPDATE ON character_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT '✅ Enhanced script submission schema created successfully!' as status;
SELECT '✅ Industries, tags, and metadata tables created!' as status;
SELECT '✅ Auto Content ID generation enabled!' as status;
SELECT '✅ Initial seed data inserted!' as status;
