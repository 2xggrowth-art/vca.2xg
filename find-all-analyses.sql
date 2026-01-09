-- Check ALL analyses in the system (bypassing RLS by checking as admin)
SELECT 
  va.id,
  va.hook,
  va.status,
  va.created_at,
  va.user_id,
  p.email as creator_email,
  p.full_name as creator_name
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
ORDER BY va.created_at DESC;

-- Count total analyses
SELECT COUNT(*) as total_analyses FROM viral_analyses;

-- Check if there are analyses with user_ids that don't exist in profiles
SELECT 
  va.id,
  va.hook,
  va.status,
  va.user_id as orphaned_user_id,
  va.created_at
FROM viral_analyses va
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = va.user_id
);

-- Show Babita's NEW user ID
SELECT id as new_babita_id, email, full_name 
FROM profiles 
WHERE email = 'babita@gmail.com';
