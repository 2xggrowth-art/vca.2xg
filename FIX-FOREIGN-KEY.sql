-- ================================================
-- FIX FOREIGN KEY RELATIONSHIP
-- This will allow Supabase joins to work
-- ================================================

-- Step 1: Check current foreign keys
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
WHERE tc.table_name = 'viral_analyses'
AND tc.constraint_type = 'FOREIGN KEY';

-- Step 2: Drop existing foreign key if it exists
ALTER TABLE viral_analyses
DROP CONSTRAINT IF EXISTS viral_analyses_user_id_fkey;

-- Step 3: Create the foreign key properly
ALTER TABLE viral_analyses
ADD CONSTRAINT viral_analyses_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

SELECT '✓ Foreign key created' as status;

-- Step 4: Test the join query that's failing
SELECT
  va.*,
  p.email,
  p.full_name,
  p.avatar_url
FROM viral_analyses va
LEFT JOIN profiles p ON p.id = va.user_id
ORDER BY va.created_at DESC
LIMIT 3;

SELECT '✓✓✓ Foreign key fix complete' as final_status;
