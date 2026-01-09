-- Check Babita's user ID
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'babita@gmail.com';

-- Check if there are any analyses for Babita
SELECT 
  va.id,
  va.hook,
  va.status,
  va.created_at,
  va.user_id,
  p.email as creator_email
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
WHERE va.user_id = (SELECT id FROM profiles WHERE email = 'babita@gmail.com');

-- Check total analyses in system
SELECT COUNT(*) as total_analyses FROM viral_analyses;

-- Check RLS policies for viral_analyses
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'viral_analyses'
ORDER BY policyname;
