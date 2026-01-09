-- ================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- This is causing the 500 error!
-- ================================================

-- Step 1: Drop ALL policies on viral_analyses (clean slate)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

SELECT '✓ Step 1: All old policies dropped' as status;

-- Step 2: Create NEW, NON-RECURSIVE policies
-- These policies use only auth.uid() and profiles table, NOT viral_analyses itself

-- Policy 1: Users see their own analyses (simple, no recursion)
CREATE POLICY "select_own"
ON viral_analyses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users insert their own analyses
CREATE POLICY "insert_own"
ON viral_analyses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users update their own PENDING analyses
CREATE POLICY "update_own_pending"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING')
WITH CHECK (user_id = auth.uid() AND status = 'PENDING');

-- Policy 4: Users delete their own PENDING analyses
CREATE POLICY "delete_own_pending"
ON viral_analyses
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING');

-- Policy 5: Admins see ALL (checks profiles table, not viral_analyses)
CREATE POLICY "select_admin"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 6: Admins update ALL
CREATE POLICY "update_admin"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 7: Admins delete ALL
CREATE POLICY "delete_admin"
ON viral_analyses
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'CREATOR')
);

-- Policy 8: Team members see assigned analyses (no recursion - uses project_assignments)
CREATE POLICY "select_assigned"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
);

SELECT '✓ Step 2: New non-recursive policies created' as status;

-- Step 3: Verify policies
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

-- Step 4: Test the fix
SELECT '=== TESTING ===' as status;

-- This should work now without infinite recursion
SELECT COUNT(*) as total_analyses FROM viral_analyses;

SELECT
  id,
  user_id,
  LEFT(hook, 40) as hook_preview,
  status
FROM viral_analyses
ORDER BY created_at DESC
LIMIT 3;

SELECT '✓✓✓ INFINITE RECURSION FIXED!' as final_status;
SELECT 'Refresh your browser now with Cmd+Shift+R' as next_step;
