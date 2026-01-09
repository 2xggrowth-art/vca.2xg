-- ================================================
-- FIX PROFILES RLS - This might be the root cause
-- ================================================

-- Check current profiles RLS
SELECT 'Current profiles RLS status:' as check;
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- Show current profiles policies
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Drop all profiles policies and recreate simple ones
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own profile
CREATE POLICY "users_view_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can view ANY profile (needed for joins)
-- This is safe because profiles don't contain sensitive data
CREATE POLICY "users_view_all_profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 4: Service role can do everything
CREATE POLICY "service_role_all"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

SELECT '✓ Profiles RLS policies updated' as status;

-- Verify policies
SELECT
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '✓✓✓ PROFILES FIX COMPLETE' as final_status;
