-- ================================================
-- EMERGENCY FIX - Run this NOW in Supabase
-- This will make your analyses visible again
-- ================================================

-- Step 1: DISABLE RLS temporarily to see what's there
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;

-- Check what data exists
SELECT
  COUNT(*) as total_analyses,
  COUNT(DISTINCT user_id) as unique_users
FROM viral_analyses;

-- Step 2: RE-ENABLE RLS with proper policies
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Step 3: DROP ALL OLD POLICIES (clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- Step 4: CREATE NEW POLICIES

-- Policy 1: Users see their own analyses
CREATE POLICY "users_select_own"
ON viral_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users insert their own analyses
CREATE POLICY "users_insert_own"
ON viral_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users update their own PENDING analyses
CREATE POLICY "users_update_own_pending"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'PENDING')
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users delete their own PENDING analyses
CREATE POLICY "users_delete_own_pending"
ON viral_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'PENDING');

-- Policy 5: SUPER_ADMIN sees ALL analyses
CREATE POLICY "admin_select_all"
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

-- Policy 6: SUPER_ADMIN updates ALL analyses
CREATE POLICY "admin_update_all"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
);

-- Policy 7: SUPER_ADMIN deletes ALL analyses
CREATE POLICY "admin_delete_all"
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

-- Policy 8: CREATOR sees all analyses
CREATE POLICY "creator_select_all"
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

-- Policy 9: CREATOR updates all analyses
CREATE POLICY "creator_update_all"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
);

-- Policy 10: Team members see assigned analyses
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

-- Step 5: VERIFY IT WORKS
SELECT '✓ Step 5: Verifying policies...' as status;

SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN roles = '{authenticated}' THEN 'authenticated users'
    ELSE roles::text
  END as applies_to
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- Check if admin user exists
SELECT
  id,
  email,
  role,
  full_name
FROM profiles
WHERE role = 'SUPER_ADMIN'
LIMIT 1;

-- Final check - show analyses count
SELECT
  status,
  COUNT(*) as count
FROM viral_analyses
GROUP BY status;

SELECT '✓✓✓ FIX COMPLETE! Refresh your browser now.' as final_status;
