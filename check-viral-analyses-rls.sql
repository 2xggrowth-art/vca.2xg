-- Check RLS policies on viral_analyses table

SELECT '=== RLS POLICIES ON VIRAL_ANALYSES ===' as step;
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '';
SELECT '=== TEST IF ALOK CAN SEE THE ANALYSIS ===' as step;
-- Test as if we're Alok (user_id: 57020089-f81e-45fc-adc1-ab653f40c394)
SELECT id, hook, status, user_id
FROM viral_analyses
WHERE id = '218be2e8-7936-487f-83a2-f11a94ffe149';

SELECT '';
SELECT '=== CHECK WHO CREATED THE ANALYSIS ===' as step;
SELECT va.id, va.hook, va.user_id, p.email as creator_email
FROM viral_analyses va
JOIN profiles p ON va.user_id = p.id
WHERE va.id = '218be2e8-7936-487f-83a2-f11a94ffe149';
