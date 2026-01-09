-- ============================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================
-- This fixes the circular reference issue in viral_analyses policies

-- Step 1: Drop all existing viral_analyses policies
DROP POLICY IF EXISTS "Users can view own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can view all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can create own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can update all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can delete any analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Production team can view assigned analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Creators can view all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Creators can update any analysis" ON viral_analyses;

-- Step 2: Create NON-RECURSIVE policies

-- SELECT Policies
CREATE POLICY "Users can view own analyses"
  ON viral_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all analyses"
  ON viral_analyses FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Creators can view all analyses"
  ON viral_analyses FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'CREATOR'
    )
  );

CREATE POLICY "Production team can view assigned analyses"
  ON viral_analyses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT analysis_id
      FROM project_assignments
      WHERE user_id = auth.uid()
    )
  );

-- INSERT Policies
CREATE POLICY "Users can create own analyses"
  ON viral_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE Policies
CREATE POLICY "Users can update own analyses"
  ON viral_analyses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all analyses"
  ON viral_analyses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Creators can update any analysis"
  ON viral_analyses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'CREATOR'
    )
  );

-- DELETE Policies
CREATE POLICY "Users can delete own analyses"
  ON viral_analyses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete any analyses"
  ON viral_analyses FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'SUPER_ADMIN'
    )
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '✅ RLS policies fixed - no more infinite recursion!' as status;
