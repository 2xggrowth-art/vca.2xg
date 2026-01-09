-- Comprehensive diagnostic for assignment dropdown issue

SELECT '=== 1. CHECK RLS ON PROFILES TABLE ===' as step;
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

SELECT '';
SELECT '=== 2. CHECK ALL USERS AND ROLES ===' as step;
SELECT id, email, full_name, role
FROM profiles
ORDER BY role, email;

SELECT '';
SELECT '=== 3. CHECK SPECIFICALLY FOR EDITORS ===' as step;
SELECT id, email, full_name, role
FROM profiles
WHERE role = 'EDITOR';

SELECT '';
SELECT '=== 4. CHECK IF ALOK EXISTS ===' as step;
SELECT id, email, full_name, role
FROM profiles
WHERE email ILIKE '%alok%' OR full_name ILIKE '%alok%';

SELECT '';
SELECT '=== 5. USER COUNT BY ROLE ===' as step;
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

SELECT '';
SELECT '=== 6. CHECK TABLE PERMISSIONS ===' as step;
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role');
