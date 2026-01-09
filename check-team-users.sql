-- Check all users and their roles
SELECT '=== ALL USERS ===' as section;
SELECT id, email, full_name, role, created_at
FROM profiles
ORDER BY role, full_name;

SELECT '';
SELECT '=== VIDEOGRAPHERS ===' as section;
SELECT id, email, full_name, role
FROM profiles
WHERE role = 'VIDEOGRAPHER';

SELECT '';
SELECT '=== EDITORS ===' as section;
SELECT id, email, full_name, role
FROM profiles
WHERE role = 'EDITOR';

SELECT '';
SELECT '=== POSTING MANAGERS ===' as section;
SELECT id, email, full_name, role
FROM profiles
WHERE role = 'POSTING_MANAGER';

SELECT '';
SELECT '=== USER COUNTS BY ROLE ===' as section;
SELECT role, COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;
