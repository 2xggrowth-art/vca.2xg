-- Check if there are any analyses in the database
SELECT
  id,
  user_id,
  hook,
  status,
  created_at,
  (SELECT email FROM profiles WHERE id = viral_analyses.user_id) as user_email
FROM viral_analyses
ORDER BY created_at DESC
LIMIT 10;

-- Check profiles and roles
SELECT id, email, role, full_name, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('viral_analyses', 'profiles');

-- Check RLS policies on viral_analyses
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;
