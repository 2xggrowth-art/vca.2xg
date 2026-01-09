-- Allow Super Admins and Creators to update other users' profiles
-- This fixes the issue where role updates don't work from the Settings page

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create policy allowing admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  -- Super Admins and Creators can update any profile
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('SUPER_ADMIN', 'CREATOR')
  )
)
WITH CHECK (
  -- Super Admins and Creators can update any profile
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('SUPER_ADMIN', 'CREATOR')
  )
);

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '✅ Admin update policy created successfully!' as status;
