-- ================================================
-- COMPLETE DIAGNOSTIC
-- ================================================

-- 1. Show all users and their analyses
SELECT '=== ALL USERS ===' as section;
SELECT
  p.id,
  p.email,
  p.role,
  p.full_name,
  COUNT(va.id) as analysis_count
FROM profiles p
LEFT JOIN viral_analyses va ON va.user_id = p.id
GROUP BY p.id, p.email, p.role, p.full_name
ORDER BY p.created_at;

-- 2. Show analyses with user info
SELECT '=== ALL ANALYSES WITH USERS ===' as section;
SELECT
  va.id as analysis_id,
  va.user_id,
  p.email as user_email,
  p.role as user_role,
  LEFT(va.hook, 40) as hook_preview,
  va.status,
  va.created_at
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
ORDER BY va.created_at DESC;

-- 3. Check specific user that's getting 500 error
SELECT '=== USER: 801fd572-6d55-434e-a3f4-50314fc93e07 ===' as section;
SELECT
  id,
  email,
  role,
  full_name
FROM profiles
WHERE id = '801fd572-6d55-434e-a3f4-50314fc93e07';

-- Check their analyses
SELECT
  COUNT(*) as analysis_count
FROM viral_analyses
WHERE user_id = '801fd572-6d55-434e-a3f4-50314fc93e07';

-- 4. Check user that OWNS the analyses
SELECT '=== USER: 66d7afe6-05f5-40f7-90c0-4ad6d5e0f252 ===' as section;
SELECT
  id,
  email,
  role,
  full_name
FROM profiles
WHERE id = '66d7afe6-05f5-40f7-90c0-4ad6d5e0f252';

-- Their analyses
SELECT
  id,
  LEFT(hook, 40) as hook_preview,
  status
FROM viral_analyses
WHERE user_id = '66d7afe6-05f5-40f7-90c0-4ad6d5e0f252';

-- 5. Test RLS for the 500 error user
SELECT '=== TESTING RLS FOR 801fd572... ===' as section;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '801fd572-6d55-434e-a3f4-50314fc93e07';

SELECT COUNT(*) as accessible_analyses
FROM viral_analyses;

RESET ROLE;

-- 6. Check if there's a constraint causing issues
SELECT '=== CHECKING CONSTRAINTS ===' as section;
SELECT
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'viral_analyses'::regclass
AND contype = 'c'  -- CHECK constraints
ORDER BY conname;

SELECT '✓✓✓ DIAGNOSTIC COMPLETE' as status;
