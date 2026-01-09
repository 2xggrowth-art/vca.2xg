-- ================================================
-- DIAGNOSE AND FIX DATABASE ISSUES
-- ================================================

-- Step 1: Check what columns exist in viral_analyses
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
ORDER BY ordinal_position;

-- Step 2: Check for any constraint violations
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'viral_analyses'::regclass;

-- Step 3: Try to query viral_analyses directly (bypass RLS)
SET LOCAL ROLE postgres;
SELECT
  id,
  user_id,
  hook,
  status,
  production_stage,  -- This might fail if column doesn't exist
  created_at
FROM viral_analyses
LIMIT 3;
RESET ROLE;

-- Step 4: If the above fails, add missing columns safely
DO $$
BEGIN
  -- Add production_stage if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_stage'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_stage TEXT;
    RAISE NOTICE 'Added production_stage column';
  END IF;

  -- Add priority if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'priority'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN priority TEXT DEFAULT 'NORMAL';
    RAISE NOTICE 'Added priority column';
  END IF;

  -- Add deadline if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN deadline TIMESTAMPTZ;
    RAISE NOTICE 'Added deadline column';
  END IF;

  -- Add budget if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'budget'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN budget DECIMAL(10, 2);
    RAISE NOTICE 'Added budget column';
  END IF;

  -- Add production_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_notes'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_notes TEXT;
    RAISE NOTICE 'Added production_notes column';
  END IF;

  -- Add production_started_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_started_at'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_started_at TIMESTAMPTZ;
    RAISE NOTICE 'Added production_started_at column';
  END IF;

  -- Add production_completed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viral_analyses' AND column_name = 'production_completed_at'
  ) THEN
    ALTER TABLE viral_analyses ADD COLUMN production_completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added production_completed_at column';
  END IF;
END $$;

-- Step 5: Verify all columns now exist
SELECT '=== COLUMN VERIFICATION ===' as status;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN (
  'production_stage',
  'priority',
  'deadline',
  'budget',
  'production_notes',
  'production_started_at',
  'production_completed_at'
)
ORDER BY column_name;

-- Step 6: Test a simple query
SELECT '=== TEST QUERY ===' as status;
SELECT
  id,
  user_id,
  LEFT(hook, 30) as hook_preview,
  status,
  production_stage,
  priority
FROM viral_analyses
ORDER BY created_at DESC
LIMIT 3;

SELECT '✓✓✓ DIAGNOSIS COMPLETE - Check results above' as final_status;
