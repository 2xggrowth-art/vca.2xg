-- ============================================
-- SAFE COMPLETE FIX FOR VOICE FEEDBACK
-- Handles existing policies gracefully
-- ============================================

-- ==========================================
-- PART 1: STORAGE BUCKET SETUP
-- ==========================================

-- Create/update voice-notes bucket as public
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

SELECT '✓ Part 1: Bucket created/updated' as status;

-- ==========================================
-- PART 2: DATABASE SCHEMA
-- ==========================================

-- Add feedback_voice_note_url column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'feedback_voice_note_url'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN feedback_voice_note_url TEXT;
    EXECUTE 'COMMENT ON COLUMN viral_analyses.feedback_voice_note_url IS ''Admin voice feedback URL (stored in Supabase Storage)''';
  END IF;
END $$;

SELECT '✓ Part 2: Column added to viral_analyses' as status;

-- ==========================================
-- PART 3: STORAGE POLICIES (SAFE)
-- ==========================================

-- Drop and recreate storage policies safely
DO $$
BEGIN
  -- Drop if exists
  DROP POLICY IF EXISTS "Users can upload to voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own voice-notes" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload voice notes" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view voice notes" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Users can upload to voice-notes"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-notes');

  CREATE POLICY "Anyone can view voice-notes"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'voice-notes');

  CREATE POLICY "Users can update own voice-notes"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'voice-notes');

  CREATE POLICY "Users can delete own voice-notes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'voice-notes');
END $$;

SELECT '✓ Part 3: Storage policies created' as status;

-- ==========================================
-- PART 4: RLS POLICIES (SAFE)
-- ==========================================

DO $$
BEGIN
  -- Drop existing RLS policies if they exist
  DROP POLICY IF EXISTS "Users can view own analyses" ON viral_analyses;
  DROP POLICY IF EXISTS "Users can insert own analyses" ON viral_analyses;
  DROP POLICY IF EXISTS "Users can update own pending analyses" ON viral_analyses;
  DROP POLICY IF EXISTS "Users can delete own pending analyses" ON viral_analyses;
  DROP POLICY IF EXISTS "Admins can view all analyses" ON viral_analyses;
  DROP POLICY IF EXISTS "Admins can update any analysis" ON viral_analyses;
  DROP POLICY IF EXISTS "Admins can delete any analysis" ON viral_analyses;

  -- Create RLS policies for viral_analyses

  -- Users can view their own analyses
  CREATE POLICY "Users can view own analyses"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

  -- Admins can view all analyses
  CREATE POLICY "Admins can view all analyses"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

  -- Users can insert their own analyses
  CREATE POLICY "Users can insert own analyses"
  ON viral_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

  -- Users can update their own PENDING analyses only
  CREATE POLICY "Users can update own pending analyses"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'PENDING'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'PENDING'
  );

  -- Users can delete their own PENDING analyses
  CREATE POLICY "Users can delete own pending analyses"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'PENDING'
  );

  -- Admins can update ANY analysis (including all review fields and voice feedback)
  CREATE POLICY "Admins can update any analysis"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

  -- Admins can delete any analysis
  CREATE POLICY "Admins can delete any analysis"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );
END $$;

SELECT '✓ Part 4: RLS policies created' as status;

-- ==========================================
-- PART 5: VERIFICATION
-- ==========================================

SELECT '=== STORAGE BUCKET VERIFICATION ===' as verification;

SELECT
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
WHERE id = 'voice-notes';

SELECT '=== STORAGE POLICIES VERIFICATION ===' as verification;

SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%voice-notes%'
ORDER BY policyname;

SELECT '=== VIRAL_ANALYSES COLUMNS VERIFICATION ===' as verification;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN (
  'feedback',
  'feedback_voice_note_url',
  'reviewed_by',
  'reviewed_at',
  'hook_strength',
  'content_quality',
  'viral_potential',
  'replication_clarity',
  'overall_score'
)
ORDER BY column_name;

SELECT '=== RLS POLICIES VERIFICATION ===' as verification;

SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '✓✓✓ ALL COMPLETE! Voice feedback should work now.' as final_status;
