-- =============================================
-- SAFE: Add only missing enhanced script fields
-- This script checks what exists and only adds what's missing
-- =============================================

SELECT '=== Checking and Adding Missing Fields ===' as status;

-- Check if tables exist, create only if missing
DO $$
BEGIN
  -- Industries table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'industries') THEN
    CREATE TABLE industries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      short_code TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created industries table';
  END IF;

  -- Hook tags table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hook_tags') THEN
    CREATE TABLE hook_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created hook_tags table';
  END IF;

  -- Profile list table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_list') THEN
    CREATE TABLE profile_list (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created profile_list table';
  END IF;

  -- Character tags table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_tags') THEN
    CREATE TABLE character_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created character_tags table';
  END IF;

  -- Junction tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_hook_tags') THEN
    CREATE TABLE analysis_hook_tags (
      analysis_id UUID REFERENCES viral_analyses(id) ON DELETE CASCADE,
      hook_tag_id UUID REFERENCES hook_tags(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (analysis_id, hook_tag_id)
    );
    RAISE NOTICE 'Created analysis_hook_tags table';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_character_tags') THEN
    CREATE TABLE analysis_character_tags (
      analysis_id UUID REFERENCES viral_analyses(id) ON DELETE CASCADE,
      character_tag_id UUID REFERENCES character_tags(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (analysis_id, character_tag_id)
    );
    RAISE NOTICE 'Created analysis_character_tags table';
  END IF;
END $$;

SELECT '✅ Tables checked/created' as status;

-- Add columns to viral_analyses if they don't exist
SELECT '';
SELECT '=== Adding Missing Columns to viral_analyses ===' as status;

DO $$
BEGIN
  -- Industry and Content ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'industry_id') THEN
    ALTER TABLE viral_analyses ADD COLUMN industry_id UUID REFERENCES industries(id);
    RAISE NOTICE 'Added industry_id column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'content_id') THEN
    ALTER TABLE viral_analyses ADD COLUMN content_id TEXT UNIQUE;
    RAISE NOTICE 'Added content_id column';
  END IF;

  -- Profile assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'profile_id') THEN
    ALTER TABLE viral_analyses ADD COLUMN profile_id UUID REFERENCES profile_list(id);
    RAISE NOTICE 'Added profile_id column';
  END IF;

  -- People and requirements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'total_people_involved') THEN
    ALTER TABLE viral_analyses ADD COLUMN total_people_involved INTEGER;
    RAISE NOTICE 'Added total_people_involved column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'additional_requirements') THEN
    ALTER TABLE viral_analyses ADD COLUMN additional_requirements TEXT;
    RAISE NOTICE 'Added additional_requirements column';
  END IF;

  -- Admin fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'syed_sir_presence') THEN
    ALTER TABLE viral_analyses ADD COLUMN syed_sir_presence TEXT CHECK (syed_sir_presence IN ('YES', 'NO'));
    RAISE NOTICE 'Added syed_sir_presence column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'planning_date') THEN
    ALTER TABLE viral_analyses ADD COLUMN planning_date DATE;
    RAISE NOTICE 'Added planning_date column';
  END IF;

  -- Script writer fields (THE IMPORTANT ONES FROM EXCEL!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'on_screen_text_hook') THEN
    ALTER TABLE viral_analyses ADD COLUMN on_screen_text_hook TEXT;
    RAISE NOTICE 'Added on_screen_text_hook column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'our_idea_audio_url') THEN
    ALTER TABLE viral_analyses ADD COLUMN our_idea_audio_url TEXT;
    RAISE NOTICE 'Added our_idea_audio_url column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'shoot_location') THEN
    ALTER TABLE viral_analyses ADD COLUMN shoot_location TEXT;
    RAISE NOTICE 'Added shoot_location column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'viral_analyses' AND column_name = 'shoot_possibility') THEN
    ALTER TABLE viral_analyses ADD COLUMN shoot_possibility INTEGER CHECK (shoot_possibility IN (25, 50, 75, 100));
    RAISE NOTICE 'Added shoot_possibility column';
  END IF;
END $$;

SELECT '✅ Columns added successfully' as status;

-- Seed initial data (only insert if not exists)
SELECT '';
SELECT '=== Seeding Initial Data ===' as status;

-- Industries (insert each one individually with exception handling)
DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('Bicycle Shop', 'BCH', 'Bicycle sales and service business');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('Car Detailing', 'CAR', 'Automotive detailing services');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('Real Estate', 'REAL', 'Real estate and property business');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('Restaurant', 'REST', 'Food and dining establishments');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('Waitson', 'WAIT', 'Waitson related content');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

DO $$
BEGIN
  INSERT INTO industries (name, short_code, description) VALUES
    ('DOODLE', 'DOOD', 'Doodle animation content');
EXCEPTION WHEN unique_violation THEN
  -- Ignore if already exists
END $$;

-- Hook Tags
INSERT INTO hook_tags (name) VALUES
  ('audio hook'),
  ('SFX hook'),
  ('last hook'),
  ('first hook'),
  ('music hook'),
  ('visual hook'),
  ('text hook')
ON CONFLICT (name) DO NOTHING;

-- Profile List
INSERT INTO profile_list (name) VALUES
  ('DOODLE'),
  ('BCH'),
  ('waitson'),
  ('car')
ON CONFLICT (name) DO NOTHING;

-- Character Tags
INSERT INTO character_tags (name) VALUES
  ('5 staff and syed'),
  ('3 2 uncle and syed'),
  ('2 1 boy and syed'),
  ('multiple clients and syed greeting'),
  ('just syed')
ON CONFLICT (name) DO NOTHING;

SELECT '✅ Initial data seeded' as status;

-- Verification
SELECT '';
SELECT '=== VERIFICATION ===' as status;

-- Check columns in viral_analyses
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN (
  'industry_id', 'content_id', 'profile_id', 'total_people_involved',
  'additional_requirements', 'syed_sir_presence', 'planning_date',
  'on_screen_text_hook', 'our_idea_audio_url', 'shoot_location', 'shoot_possibility'
)
ORDER BY column_name;

SELECT '';
SELECT '✅ ALL ENHANCED FIELDS ADDED SUCCESSFULLY!' as status;
SELECT 'Script writers can now see all Excel fields in the New Analysis form!' as note;
