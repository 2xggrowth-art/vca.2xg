-- ================================================
-- COMPLETE FIX - Resolve all database issues
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Verify current state
SELECT '=== STEP 1: Checking current state ===' as status;

SELECT COUNT(*) as total_analyses FROM viral_analyses;
SELECT COUNT(*) as total_profiles FROM profiles;

-- Step 2: Fix the foreign key relationship for Supabase joins
SELECT '=== STEP 2: Fixing foreign key ===' as status;

ALTER TABLE viral_analyses
DROP CONSTRAINT IF EXISTS viral_analyses_user_id_fkey;

ALTER TABLE viral_analyses
ADD CONSTRAINT viral_analyses_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

SELECT '✓ Foreign key created' as status;

-- Step 3: Test the join query that's failing
SELECT '=== STEP 3: Testing join query ===' as status;

SELECT
  va.id,
  va.user_id,
  va.hook,
  va.status,
  va.created_at,
  p.email,
  p.full_name,
  p.avatar_url
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
ORDER BY va.created_at DESC
LIMIT 5;

-- Step 4: Clean any NULL user_id values (these would cause issues)
SELECT '=== STEP 4: Checking for NULL user_ids ===' as status;

SELECT COUNT(*) as analyses_with_null_user_id
FROM viral_analyses
WHERE user_id IS NULL;

-- If any NULL user_ids exist, you'll need to either delete them or assign them to a user
-- Uncomment the line below if you want to delete analyses with NULL user_id:
-- DELETE FROM viral_analyses WHERE user_id IS NULL;

-- Step 5: Re-enable RLS with proper non-recursive policies
SELECT '=== STEP 5: Setting up RLS properly ===' as status;

-- First, drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for viral_analyses
-- Policy 1: Users see their own analyses
CREATE POLICY "users_select_own"
ON viral_analyses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users insert their own analyses
CREATE POLICY "users_insert_own"
ON viral_analyses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users update their own PENDING analyses
CREATE POLICY "users_update_own_pending"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING')
WITH CHECK (user_id = auth.uid());

-- Policy 4: Users delete their own PENDING analyses
CREATE POLICY "users_delete_own_pending"
ON viral_analyses
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING');

-- Policy 5: Admins and creators see ALL analyses
CREATE POLICY "admins_select_all"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 6: Admins and creators update ALL analyses
CREATE POLICY "admins_update_all"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 7: Admins and creators delete ALL analyses
CREATE POLICY "admins_delete_all"
ON viral_analyses
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 8: Team members see assigned analyses
CREATE POLICY "team_select_assigned"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
);

-- Policy 9: Team members update assigned analyses
CREATE POLICY "team_update_assigned"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
);

SELECT '✓ RLS policies created' as status;

-- Step 6: Set up RLS for profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Everyone can read profiles (needed for joins and dropdowns)
CREATE POLICY "profiles_select_all"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

SELECT '✓ Profiles RLS policies created' as status;

-- Step 7: Set up RLS for project_assignments table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_assignments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON project_assignments';
    END LOOP;
END $$;

-- Users can see their own assignments
CREATE POLICY "assignments_select_own"
ON project_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can see all assignments
CREATE POLICY "assignments_select_admin"
ON project_assignments
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Admins can create assignments
CREATE POLICY "assignments_insert_admin"
ON project_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Admins can update assignments
CREATE POLICY "assignments_update_admin"
ON project_assignments
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Admins can delete assignments
CREATE POLICY "assignments_delete_admin"
ON project_assignments
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

SELECT '✓ Project assignments RLS policies created' as status;

-- Step 8: Final verification - test queries with RLS enabled
SELECT '=== STEP 8: Final verification ===' as status;

-- This should show all policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('viral_analyses', 'profiles', 'project_assignments')
ORDER BY tablename, policyname;

-- Test count
SELECT COUNT(*) as total_analyses_visible FROM viral_analyses;

-- Test join
SELECT
  va.id,
  va.hook,
  va.status,
  p.email as user_email,
  p.role as user_role
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
ORDER BY va.created_at DESC
LIMIT 3;

SELECT '✓✓✓ COMPLETE FIX DONE!' as final_status;
SELECT '🎉 Now refresh your browser with Cmd+Shift+R' as next_step;
SELECT 'The admin dashboard should now show all analyses with proper joins' as confirmation;
