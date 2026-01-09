-- ============================================
-- COMPLETE FIX: Remove Infinite Recursion
-- ============================================
-- This completely rebuilds the RLS policies without recursion

-- Step 1: Temporarily disable RLS to clear the error state
ALTER TABLE viral_analyses DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'viral_analyses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON viral_analyses';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies

-- Allow users to see their own analyses
CREATE POLICY "viral_analyses_select_own"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to see all analyses
CREATE POLICY "viral_analyses_select_admin"
  ON viral_analyses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Allow production team to see assigned analyses (check project_assignments table exists first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_assignments') THEN
    EXECUTE '
      CREATE POLICY "viral_analyses_select_assigned"
        ON viral_analyses
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM project_assignments pa
            WHERE pa.analysis_id = viral_analyses.id
            AND pa.user_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;

-- Allow users to insert their own analyses
CREATE POLICY "viral_analyses_insert_own"
  ON viral_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own analyses
CREATE POLICY "viral_analyses_update_own"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any analysis
CREATE POLICY "viral_analyses_update_admin"
  ON viral_analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Allow users to delete their own analyses
CREATE POLICY "viral_analyses_delete_own"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to delete any analysis
CREATE POLICY "viral_analyses_delete_admin"
  ON viral_analyses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('SUPER_ADMIN', 'CREATOR')
    )
  );

-- Verify the new policies
SELECT
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '✅ RLS policies completely rebuilt - recursion eliminated!' as status;

-- Test query to ensure no recursion
SELECT COUNT(*) as total_analyses FROM viral_analyses;
