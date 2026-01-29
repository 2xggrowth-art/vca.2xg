-- ============================================
-- Fix RLS Policy for Videographer Access to Available Projects
-- ============================================
--
-- ISSUE: Videographers cannot see APPROVED projects in PLANNING stage
--        because the current policies only allow:
--        1. Users to see their own analyses (user_id = auth.uid())
--        2. Admins (SUPER_ADMIN, CREATOR) to see all analyses
--
-- SOLUTION: Add policy allowing VIDEOGRAPHER, EDITOR, POSTING_MANAGER roles
--           to see APPROVED analyses (so they can pick/work on them)
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "production_team_select_approved" ON viral_analyses;
DROP POLICY IF EXISTS "team_select_assigned" ON viral_analyses;
DROP POLICY IF EXISTS "team_update_assigned" ON viral_analyses;

-- Add policy for production team to see APPROVED analyses
-- This allows videographers to see the "Available Projects" queue
CREATE POLICY "production_team_select_approved"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    -- Only show APPROVED analyses
    status = 'APPROVED'
    AND
    -- To users with production roles
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER')
    )
  );

-- Add policy for production team to see analyses they are assigned to
-- (regardless of status, so they can see their work in progress)
CREATE POLICY "team_select_assigned"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT analysis_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for production team to UPDATE analyses they are assigned to
-- (so they can update production_stage, upload files, etc.)
CREATE POLICY "team_update_assigned"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT analysis_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT analysis_id FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Verify policies
SELECT '=== POLICIES AFTER FIX ===' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '✅ Videographer access fix complete!' as status;
