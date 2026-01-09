-- ================================================
-- TEST DIRECT QUERY - Find the exact error
-- ================================================

-- Test 1: Can we select from viral_analyses at all?
SELECT 'Test 1: Basic query' as test;
SELECT COUNT(*) FROM viral_analyses;

-- Test 2: Can we select specific columns?
SELECT 'Test 2: Specific columns' as test;
SELECT
  id,
  user_id,
  hook,
  status,
  created_at
FROM viral_analyses
LIMIT 1;

-- Test 3: Can we select with user_id filter?
SELECT 'Test 3: With user_id filter' as test;
SELECT
  id,
  user_id,
  hook,
  status
FROM viral_analyses
WHERE user_id = '801fd572-6d55-434e-a3f4-50314fc93e07'
LIMIT 1;

-- Test 4: Can we order by created_at?
SELECT 'Test 4: With ORDER BY' as test;
SELECT
  id,
  hook,
  status
FROM viral_analyses
WHERE user_id = '801fd572-6d55-434e-a3f4-50314fc93e07'
ORDER BY created_at DESC
LIMIT 1;

-- Test 5: Check for any NULL or invalid data
SELECT 'Test 5: Check for issues' as test;
SELECT
  id,
  user_id,
  CASE
    WHEN hook IS NULL THEN 'hook is NULL'
    WHEN status IS NULL THEN 'status is NULL'
    WHEN created_at IS NULL THEN 'created_at is NULL'
    ELSE 'OK'
  END as data_status
FROM viral_analyses
WHERE user_id = '801fd572-6d55-434e-a3f4-50314fc93e07';

-- Test 6: Check RLS is not blocking
SELECT 'Test 6: RLS check' as test;
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'viral_analyses';

-- Test 7: Try the EXACT query that's failing
SELECT 'Test 7: EXACT query from frontend' as test;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '801fd572-6d55-434e-a3f4-50314fc93e07';

SELECT *
FROM viral_analyses
WHERE user_id = '801fd572-6d55-434e-a3f4-50314fc93e07'
ORDER BY created_at DESC;

RESET ROLE;

SELECT '✓ Tests complete - check which one failed' as status;
