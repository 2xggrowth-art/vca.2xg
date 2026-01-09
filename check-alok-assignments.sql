-- Check if Alok has any project assignments

SELECT '=== 1. FIND ALOK USER ID ===' as step;
SELECT id, email, full_name, role
FROM profiles
WHERE email = 'alok@bch.com';

SELECT '';
SELECT '=== 2. CHECK PROJECT ASSIGNMENTS FOR ALOK ===' as step;
SELECT pa.*, va.hook, va.status, va.production_stage
FROM project_assignments pa
JOIN viral_analyses va ON pa.analysis_id = va.id
WHERE pa.user_id = '57020089-f81e-45fc-adc1-ab653f40c394';

SELECT '';
SELECT '=== 3. ALL PROJECT ASSIGNMENTS ===' as step;
SELECT pa.id, pa.analysis_id, pa.role, p.email as assigned_user
FROM project_assignments pa
JOIN profiles p ON pa.user_id = p.id;

SELECT '';
SELECT '=== 4. ALL APPROVED ANALYSES ===' as step;
SELECT id, hook, status, production_stage, created_at
FROM viral_analyses
WHERE status = 'APPROVED'
ORDER BY created_at DESC;
