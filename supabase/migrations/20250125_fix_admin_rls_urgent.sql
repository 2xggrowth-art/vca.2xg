-- ============================================
-- URGENT FIX: Admin RLS Access Broken
-- ============================================
-- PROBLEM: The admins_select_all policy uses a subquery on profiles table
--          which itself may have RLS, causing a circular dependency
--
-- SOLUTION: Create a SECURITY DEFINER function that bypasses RLS to check
--           if the current user is an admin
-- ============================================

-- Step 1: Create a helper function with SECURITY DEFINER
-- This function can read the profiles table without RLS restrictions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('SUPER_ADMIN', 'CREATOR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a helper function to check if user is production team
CREATE OR REPLACE FUNCTION is_production_team()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop and recreate the admin policies using the helper function
DROP POLICY IF EXISTS "admins_select_all" ON viral_analyses;
DROP POLICY IF EXISTS "admins_update_all" ON viral_analyses;
DROP POLICY IF EXISTS "admins_delete_all" ON viral_analyses;

-- Admins can SELECT all analyses
CREATE POLICY "admins_select_all"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can UPDATE all analyses
CREATE POLICY "admins_update_all"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Admins can DELETE any analysis
CREATE POLICY "admins_delete_all"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 4: Fix the production team policy to use the helper function
DROP POLICY IF EXISTS "production_team_select_approved" ON viral_analyses;

CREATE POLICY "production_team_select_approved"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    status = 'APPROVED'
    AND is_production_team()
  );

-- Step 5: Verify policies
SELECT '=== POLICIES AFTER URGENT FIX ===' as status;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- Step 6: Test that admin can see data
SELECT '=== TESTING ADMIN ACCESS ===' as status;
SELECT COUNT(*) as total_analyses FROM viral_analyses;

SELECT '✅ URGENT RLS FIX COMPLETE!' as status;
SELECT 'Run this SQL in Supabase SQL Editor to fix admin access' as instructions;
