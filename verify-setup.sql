-- ================================================
-- VERIFY SETUP - Run this to check everything
-- ================================================

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'viral_analyses';

-- 2. Check all RLS policies
SELECT
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- 3. Check your user's profile
SELECT
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles
WHERE email ILIKE '%arsalan%' OR email ILIKE '%ahmed%'
LIMIT 5;

-- 4. Check all analyses
SELECT
  id,
  user_id,
  LEFT(hook, 50) as hook_preview,
  status,
  created_at,
  (SELECT email FROM profiles WHERE id = viral_analyses.user_id) as user_email,
  (SELECT role FROM profiles WHERE id = viral_analyses.user_id) as user_role
FROM viral_analyses
ORDER BY created_at DESC;

-- 5. Test if admin can see analyses (using your actual user ID)
-- Replace 'YOUR_USER_ID' with your actual UUID from step 3
SELECT
  'If this query returns TRUE, admin can see all analyses' as test_result,
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  ) as is_admin;

-- 6. Check if project_assignments table exists (for production workflow)
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'project_assignments'
  ) as project_assignments_exists;

SELECT '✓ Verification complete - check results above' as status;
