-- Fix: Add missing RLS policy to allow team members to see assigned analyses

SELECT '=== ADDING TEAM MEMBER ACCESS POLICY ===' as step;

-- Drop the policy if it exists (in case it was partially created)
DROP POLICY IF EXISTS "team_select_assigned" ON viral_analyses;
DROP POLICY IF EXISTS "team_update_assigned" ON viral_analyses;

-- Policy: Team members can see analyses they're assigned to
CREATE POLICY "team_select_assigned"
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

-- Policy: Team members can update analyses they're assigned to
CREATE POLICY "team_update_assigned"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT analysis_id
    FROM project_assignments
    WHERE user_id = auth.uid()
  )
);

SELECT '✅ Team member access policies created!' as status;

-- Verify the policies were created
SELECT '';
SELECT '=== VERIFICATION: All viral_analyses policies ===' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;
