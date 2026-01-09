-- Fix: Remove recursive policies and create non-recursive ones

SELECT '=== FIXING RECURSIVE POLICY ISSUE ===' as step;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "team_select_assigned" ON viral_analyses;
DROP POLICY IF EXISTS "team_update_assigned" ON viral_analyses;

-- Recreate with security definer function to avoid recursion
-- First, create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.user_has_assignment(analysis_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_assignments
    WHERE analysis_id = analysis_uuid
    AND user_id = user_uuid
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_has_assignment(UUID, UUID) TO authenticated;

-- Now create non-recursive policies using the function
CREATE POLICY "team_select_assigned"
ON viral_analyses
FOR SELECT
TO authenticated
USING (public.user_has_assignment(id, auth.uid()));

CREATE POLICY "team_update_assigned"
ON viral_analyses
FOR UPDATE
TO authenticated
USING (public.user_has_assignment(id, auth.uid()))
WITH CHECK (public.user_has_assignment(id, auth.uid()));

SELECT '✅ Non-recursive policies created!' as status;

-- Verify the policies
SELECT '';
SELECT '=== VERIFICATION: All viral_analyses policies ===' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;

SELECT '';
SELECT '=== TEST: Check if function works ===' as step;
-- This should return true if Alok is assigned to the analysis
SELECT public.user_has_assignment(
  '218be2e8-7936-487f-83a2-f11a94ffe149'::uuid,
  '57020089-f81e-45fc-adc1-ab653f40c394'::uuid
) as alok_is_assigned;
