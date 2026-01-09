-- ============================================
-- FINAL CLEAN FIX - Remove ALL Policies and Rebuild Clean
-- ============================================

-- Step 1: Disable RLS temporarily
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop EVERY SINGLE policy (including old ones)
DROP POLICY IF EXISTS "select_own" ON viral_analyses;
DROP POLICY IF EXISTS "insert_own" ON viral_analyses;
DROP POLICY IF EXISTS "update_own" ON viral_analyses;
DROP POLICY IF EXISTS "delete_own" ON viral_analyses;
DROP POLICY IF EXISTS "select_admin" ON viral_analyses;
DROP POLICY IF EXISTS "update_admin" ON viral_analyses;
DROP POLICY IF EXISTS "delete_admin" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_select_own" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_select_admin" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_select_assigned" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_insert_own" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_update_own" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_update_admin" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_delete_own" ON viral_analyses;
DROP POLICY IF EXISTS "viral_analyses_delete_admin" ON viral_analyses;

-- Drop any other policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONLY the minimal policies needed
-- Users can SELECT their own analyses
CREATE POLICY "users_select_own"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can SELECT all analyses
CREATE POLICY "admins_select_all"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Users can INSERT their own analyses
CREATE POLICY "users_insert_own"
  ON viral_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can UPDATE their own analyses
CREATE POLICY "users_update_own"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can UPDATE all analyses
CREATE POLICY "admins_update_all"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Users can DELETE their own analyses
CREATE POLICY "users_delete_own"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can DELETE any analysis
CREATE POLICY "admins_delete_all"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Step 5: Verify policies
SELECT '=== FINAL POLICIES ===' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- Step 6: Test queries
SELECT '=== TESTING ===' as status;
SELECT COUNT(*) as total_analyses FROM viral_analyses;

SELECT '✅ CLEAN REBUILD COMPLETE!' as status;
