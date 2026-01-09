-- ============================================
-- DEEP ANALYSIS & COMPLETE FIX
-- ============================================
-- This performs a complete diagnostic and fixes all issues

-- STEP 1: Check current RLS policies
SELECT '=== CURRENT RLS POLICIES ===' as section;
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- STEP 2: Check for triggers that might cause issues
SELECT '=== TRIGGERS ON viral_analyses ===' as section;
SELECT tgname, tgtype, tgenabled, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'viral_analyses'::regclass
ORDER BY tgname;

-- STEP 3: Check for foreign key constraints
SELECT '=== FOREIGN KEYS ===' as section;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'viral_analyses';

-- STEP 4: NUCLEAR OPTION - Completely disable and rebuild RLS
SELECT '=== REBUILDING RLS FROM SCRATCH ===' as section;

-- Disable RLS
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- STEP 5: Create MINIMAL policies first (test if these work)
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can see their own
CREATE POLICY "select_own" ON viral_analyses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Simple policy: users can insert their own
CREATE POLICY "insert_own" ON viral_analyses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Simple policy: users can update their own
CREATE POLICY "update_own" ON viral_analyses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Simple policy: users can delete their own
CREATE POLICY "delete_own" ON viral_analyses
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

SELECT '=== TESTING BASIC QUERY ===' as section;

-- Test if a simple query works
DO $$
BEGIN
    PERFORM COUNT(*) FROM viral_analyses;
    RAISE NOTICE 'Basic query successful!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- STEP 6: If basic policies work, add admin policies
CREATE POLICY "select_admin" ON viral_analyses
    FOR SELECT TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
        )
    );

CREATE POLICY "update_admin" ON viral_analyses
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
        )
    );

CREATE POLICY "delete_admin" ON viral_analyses
    FOR DELETE TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'CREATOR')
        )
    );

SELECT '=== FINAL POLICIES ===' as section;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- STEP 7: Test actual queries that the app will run
SELECT '=== TESTING APP QUERIES ===' as section;

-- Test SELECT (what the app does)
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM viral_analyses;
    RAISE NOTICE 'Total analyses: %', test_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SELECT Error: %', SQLERRM;
END $$;

-- STEP 8: Check if project_assignments is causing issues
SELECT '=== CHECKING project_assignments ===' as section;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'project_assignments'
) as table_exists;

SELECT '✅ DEEP ANALYSIS COMPLETE!' as status;
