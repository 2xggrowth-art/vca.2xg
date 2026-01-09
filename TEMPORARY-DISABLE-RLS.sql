-- ================================================
-- TEMPORARY DISABLE RLS - For Testing Only
-- This will help us confirm if RLS is causing the 500 error
-- ================================================

-- WARNING: This makes all data visible to all users
-- Only use for testing, then re-enable RLS after

-- Disable RLS temporarily
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments DISABLE ROW LEVEL SECURITY;

SELECT '⚠️ RLS DISABLED - All data is now public!' as warning;
SELECT 'Refresh your browser now to see if data appears' as next_step;
SELECT 'If it works, run RE-ENABLE-RLS.sql after testing' as reminder;

-- Show current data
SELECT
  COUNT(*) as total_analyses
FROM viral_analyses;

SELECT
  id,
  user_id,
  LEFT(hook, 50) as hook_preview,
  status,
  created_at
FROM viral_analyses
ORDER BY created_at DESC
LIMIT 5;
