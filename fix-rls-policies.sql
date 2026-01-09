-- ================================================
-- FIX RLS POLICIES FOR VIRAL_ANALYSES
-- This ensures users can see their own analyses
-- ================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can view all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can update all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Admins can delete all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Production team can view assigned analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Creators can view all analyses" ON viral_analyses;
DROP POLICY IF EXISTS "Creators can update any analysis" ON viral_analyses;

-- Enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own analyses
CREATE POLICY "Users can view own analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
ON viral_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own PENDING analyses
CREATE POLICY "Users can update own analyses"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'PENDING')
WITH CHECK (auth.uid() = user_id AND status = 'PENDING');

-- Policy 4: Users can delete their own PENDING analyses
CREATE POLICY "Users can delete own analyses"
ON viral_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'PENDING');

-- Policy 5: Admins can view all analyses
CREATE POLICY "Admins can view all analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
);

-- Policy 6: Admins can update all analyses
CREATE POLICY "Admins can update all analyses"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
);

-- Policy 7: Admins can delete all analyses
CREATE POLICY "Admins can delete all analyses"
ON viral_analyses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'SUPER_ADMIN'
  )
);

-- Policy 8: Production team can view assigned analyses
CREATE POLICY "Production team can view assigned analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_assignments.analysis_id = viral_analyses.id
    AND project_assignments.user_id = auth.uid()
  )
);

-- Policy 9: Creators can view all analyses
CREATE POLICY "Creators can view all analyses"
ON viral_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
);

-- Policy 10: Creators can update any analysis
CREATE POLICY "Creators can update any analysis"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'CREATOR'
  )
);

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '✓✓✓ RLS POLICIES FIXED!' as status;
