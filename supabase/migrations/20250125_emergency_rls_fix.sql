-- ============================================
-- EMERGENCY FIX: Disable RLS to Restore Access
-- ============================================

-- Step 1: Temporarily disable RLS
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify data exists
SELECT '=== CHECKING DATA ===' as status;
SELECT COUNT(*) as total_analyses FROM viral_analyses;

-- Step 3: Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- Step 4: Drop the helper functions (they might be causing issues)
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_production_team();

-- Step 5: Re-enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple, working policies using EXISTS (more reliable than IN with subquery)

-- Policy 1: Users can see their own analyses
CREATE POLICY "users_select_own"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Admins can see all (using EXISTS which is more reliable)
CREATE POLICY "admins_select_all"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Policy 3: Production team can see APPROVED analyses
CREATE POLICY "production_team_select_approved"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    status = 'APPROVED'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER')
    )
  );

-- Policy 4: Team members can see analyses they're assigned to
CREATE POLICY "team_select_assigned"
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

-- Policy 5: Users can insert their own
CREATE POLICY "users_insert_own"
  ON viral_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 6: Users can update their own
CREATE POLICY "users_update_own"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 7: Admins can update all
CREATE POLICY "admins_update_all"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Policy 8: Team can update assigned analyses
CREATE POLICY "team_update_assigned"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_assignments.analysis_id = viral_analyses.id
      AND project_assignments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_assignments.analysis_id = viral_analyses.id
      AND project_assignments.user_id = auth.uid()
    )
  );

-- Policy 9: Users can delete their own
CREATE POLICY "users_delete_own"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 10: Admins can delete all
CREATE POLICY "admins_delete_all"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Step 7: Ensure profiles table allows reading roles
-- This is critical - if profiles has RLS, the subqueries won't work
-- Check if there's a policy that allows users to read their own profile
DO $$
BEGIN
  -- Create policy to allow users to read their own profile if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'users_read_own_profile'
  ) THEN
    CREATE POLICY "users_read_own_profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

-- Step 8: Verify policies are created
SELECT '=== FINAL POLICIES ===' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- Step 9: Test access
SELECT '=== TESTING ===' as status;
SELECT COUNT(*) as total_analyses FROM viral_analyses;

SELECT '✅ EMERGENCY FIX COMPLETE - Refresh your browser!' as status;
