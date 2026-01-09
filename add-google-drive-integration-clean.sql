-- Add Google Drive integration for video file management
-- This version safely handles existing objects

SELECT '=== STEP 1: Add Google Drive folder field to viral_analyses ===' as step;

DO $$
BEGIN
  -- Google Drive folder ID/URL for raw footage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'raw_footage_drive_url'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN raw_footage_drive_url TEXT;
  END IF;

  -- Google Drive folder ID/URL for edited video
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'edited_video_drive_url'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN edited_video_drive_url TEXT;
  END IF;

  -- Final video URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'final_video_url'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN final_video_url TEXT;
  END IF;
END $$;

SELECT '✅ Google Drive fields added to viral_analyses' as status;

-- ============================================
-- STEP 2: Create production_files table
-- ============================================

SELECT '';
SELECT '=== STEP 2: Create production_files table ===' as step;

CREATE TABLE IF NOT EXISTS production_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  analysis_id UUID REFERENCES viral_analyses(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- File details
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'RAW_FOOTAGE', 'EDITED_VIDEO', 'FINAL_VIDEO', 'ASSET', 'OTHER'
  file_url TEXT NOT NULL, -- Google Drive URL or direct file URL
  file_size BIGINT, -- Size in bytes
  mime_type TEXT,

  -- Metadata
  description TEXT,
  upload_stage TEXT, -- Production stage when uploaded
  is_primary BOOLEAN DEFAULT false, -- Mark primary/final version

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_files_analysis ON production_files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_production_files_type ON production_files(file_type);
CREATE INDEX IF NOT EXISTS idx_production_files_created ON production_files(created_at DESC);

SELECT '✅ production_files table created' as status;

-- ============================================
-- STEP 3: RLS Policies for production_files
-- ============================================

SELECT '';
SELECT '=== STEP 3: Setting up RLS for production_files ===' as step;

-- Enable RLS
ALTER TABLE production_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "team_view_project_files" ON production_files;
DROP POLICY IF EXISTS "team_upload_project_files" ON production_files;
DROP POLICY IF EXISTS "users_update_own_files" ON production_files;
DROP POLICY IF EXISTS "admins_update_all_files" ON production_files;
DROP POLICY IF EXISTS "users_delete_own_files" ON production_files;
DROP POLICY IF EXISTS "admins_delete_all_files" ON production_files;

-- Team members can view files for their assigned projects
CREATE POLICY "team_view_project_files"
ON production_files
FOR SELECT
TO authenticated
USING (
  analysis_id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins can see all
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
  )
  OR
  -- Script writer can see files for their analyses
  analysis_id IN (
    SELECT id FROM viral_analyses WHERE user_id = auth.uid()
  )
);

-- Team members can upload files to their assigned projects
CREATE POLICY "team_upload_project_files"
ON production_files
FOR INSERT
TO authenticated
WITH CHECK (
  analysis_id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
  OR
  -- Admins can upload
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Team members can update files they uploaded
CREATE POLICY "users_update_own_files"
ON production_files
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Admins can update any file
CREATE POLICY "admins_update_all_files"
ON production_files
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Team members can delete files they uploaded
CREATE POLICY "users_delete_own_files"
ON production_files
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Admins can delete any file
CREATE POLICY "admins_delete_all_files"
ON production_files
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

SELECT '✅ RLS policies created for production_files' as status;

-- ============================================
-- STEP 4: Verification
-- ============================================

SELECT '';
SELECT '=== VERIFICATION ===' as step;

-- Check new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN ('raw_footage_drive_url', 'edited_video_drive_url', 'final_video_url')
ORDER BY column_name;

SELECT '';
-- Check production_files table
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'production_files'
ORDER BY ordinal_position;

SELECT '';
-- Check RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'production_files'
ORDER BY policyname;

SELECT '';
SELECT '✅ GOOGLE DRIVE INTEGRATION COMPLETE!' as status;
