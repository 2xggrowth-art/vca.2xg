-- ============================================
-- ADD PRODUCTION WORKFLOW & TEAM ROLES
-- Implements Video Hub-style assignment system
-- ============================================

-- ==========================================
-- PART 1: ADD NEW USER ROLES
-- ==========================================

-- Update role check constraint to include new roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN (
  'SUPER_ADMIN',
  'SCRIPT_WRITER',
  'CREATOR',
  'VIDEOGRAPHER',
  'EDITOR',
  'POSTING_MANAGER'
));

SELECT '✓ Part 1: User roles updated' as status;

-- ==========================================
-- PART 2: CREATE PROJECT_ASSIGNMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES viral_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER')),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate role assignments to same project
  UNIQUE(analysis_id, user_id, role)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_analysis ON project_assignments(analysis_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_role ON project_assignments(role);
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by ON project_assignments(assigned_by);

COMMENT ON TABLE project_assignments IS 'Tracks team member assignments to approved analyses for production';
COMMENT ON COLUMN project_assignments.analysis_id IS 'Reference to the approved viral analysis';
COMMENT ON COLUMN project_assignments.user_id IS 'User assigned to this role';
COMMENT ON COLUMN project_assignments.role IS 'Role assigned: VIDEOGRAPHER, EDITOR, or POSTING_MANAGER';
COMMENT ON COLUMN project_assignments.assigned_by IS 'Admin who made the assignment';

SELECT '✓ Part 2: project_assignments table created' as status;

-- ==========================================
-- PART 3: ADD PRODUCTION FIELDS TO VIRAL_ANALYSES
-- ==========================================

-- Add production stage tracking
DO $$
BEGIN
  -- Production stage (after approval)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_stage'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_stage TEXT
    CHECK (production_stage IN (
      'NOT_STARTED',
      'PRE_PRODUCTION',
      'SHOOTING',
      'SHOOT_REVIEW',
      'EDITING',
      'EDIT_REVIEW',
      'FINAL_REVIEW',
      'READY_TO_POST',
      'POSTED'
    ));

    -- Default to NOT_STARTED for approved analyses
    UPDATE viral_analyses
    SET production_stage = 'NOT_STARTED'
    WHERE status = 'APPROVED' AND production_stage IS NULL;
  END IF;

  -- Production priority
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'priority'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN priority TEXT DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));
  END IF;

  -- Production deadline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN deadline TIMESTAMPTZ;
  END IF;

  -- Production budget
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'budget'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN budget DECIMAL(10, 2);
  END IF;

  -- Production notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_notes'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_notes TEXT;
  END IF;

  -- Started production timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_started_at'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_started_at TIMESTAMPTZ;
  END IF;

  -- Completed production timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_completed_at'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_completed_at TIMESTAMPTZ;
  END IF;
END $$;

SELECT '✓ Part 3: Production fields added to viral_analyses' as status;

-- ==========================================
-- PART 4: RLS POLICIES FOR PROJECT_ASSIGNMENTS
-- ==========================================

-- Enable RLS on project_assignments
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view assignments for their analyses" ON project_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON project_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON project_assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON project_assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON project_assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON project_assignments;

-- Users can view assignments for analyses they created
CREATE POLICY "Users can view assignments for their analyses"
ON project_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM viral_analyses
    WHERE viral_analyses.id = project_assignments.analysis_id
    AND viral_analyses.user_id = auth.uid()
  )
);

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
ON project_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins and Creators can view all assignments
CREATE POLICY "Admins can view all assignments"
ON project_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Admins and Creators can create assignments
CREATE POLICY "Admins can create assignments"
ON project_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Admins and Creators can update assignments
CREATE POLICY "Admins can update assignments"
ON project_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Admins and Creators can delete assignments
CREATE POLICY "Admins can delete assignments"
ON project_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

SELECT '✓ Part 4: RLS policies for project_assignments created' as status;

-- ==========================================
-- PART 5: UPDATE VIRAL_ANALYSES RLS POLICIES
-- ==========================================

-- Drop and recreate to include new roles
DROP POLICY IF EXISTS "Production team can view assigned analyses" ON viral_analyses;

-- Production team members can view analyses they're assigned to
CREATE POLICY "Production team can view assigned analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_assignments.analysis_id = viral_analyses.id
    AND project_assignments.user_id = auth.uid()
  )
);

-- Creators can view all analyses (like admins)
DROP POLICY IF EXISTS "Creators can view all analyses" ON viral_analyses;

CREATE POLICY "Creators can view all analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
);

-- Creators can update any analysis (for production stage updates)
DROP POLICY IF EXISTS "Creators can update any analysis" ON viral_analyses;

CREATE POLICY "Creators can update any analysis"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
);

SELECT '✓ Part 5: Updated RLS policies for production team access' as status;

-- ==========================================
-- PART 6: CREATE HELPER FUNCTIONS
-- ==========================================

-- Function to get assigned videographers count for workload balancing
CREATE OR REPLACE FUNCTION get_videographer_workload(videographer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  workload INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO workload
  FROM project_assignments pa
  JOIN viral_analyses va ON va.id = pa.analysis_id
  WHERE pa.user_id = videographer_id
  AND pa.role = 'VIDEOGRAPHER'
  AND va.production_stage IN ('PRE_PRODUCTION', 'SHOOTING', 'SHOOT_REVIEW')
  AND va.status = 'APPROVED';

  -- Add extra weight for URGENT priority
  SELECT workload + COUNT(*)
  INTO workload
  FROM project_assignments pa
  JOIN viral_analyses va ON va.id = pa.analysis_id
  WHERE pa.user_id = videographer_id
  AND pa.role = 'VIDEOGRAPHER'
  AND va.priority = 'URGENT'
  AND va.production_stage IN ('PRE_PRODUCTION', 'SHOOTING', 'SHOOT_REVIEW')
  AND va.status = 'APPROVED';

  RETURN COALESCE(workload, 0);
END;
$$ LANGUAGE plpgsql;

SELECT '✓ Part 6: Helper functions created' as status;

-- ==========================================
-- PART 7: VERIFICATION
-- ==========================================

SELECT '=== ROLES VERIFICATION ===' as verification;

SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_role_check';

SELECT '=== PROJECT_ASSIGNMENTS TABLE ===' as verification;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_assignments'
ORDER BY ordinal_position;

SELECT '=== PRODUCTION FIELDS IN VIRAL_ANALYSES ===' as verification;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN (
  'production_stage',
  'priority',
  'deadline',
  'budget',
  'production_notes',
  'production_started_at',
  'production_completed_at'
)
ORDER BY column_name;

SELECT '=== RLS POLICIES CHECK ===' as verification;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('project_assignments', 'viral_analyses')
ORDER BY tablename, policyname;

SELECT '✓✓✓ PRODUCTION WORKFLOW SETUP COMPLETE!' as final_status;
