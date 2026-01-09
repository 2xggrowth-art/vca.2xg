-- Check RLS policies on project_assignments table

SELECT '=== RLS POLICIES ON PROJECT_ASSIGNMENTS ===' as step;
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'project_assignments';

SELECT '';
SELECT '=== RLS ENABLED? ===' as step;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'project_assignments';
