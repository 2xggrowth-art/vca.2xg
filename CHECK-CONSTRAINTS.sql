-- ================================================
-- CHECK FOR PROBLEMATIC CONSTRAINTS
-- ================================================

-- 1. List ALL constraints on viral_analyses
SELECT
  conname as constraint_name,
  contype as type,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
    ELSE contype::text
  END as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'viral_analyses'::regclass
ORDER BY contype, conname;

-- 2. Check for any triggers
SELECT
  tgname as trigger_name,
  tgtype,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'viral_analyses'::regclass
AND tgisinternal = false;

-- 3. Try a simple select to see if it works
SELECT 'Testing basic query...' as status;

BEGIN;
  SET LOCAL ROLE postgres;

  SELECT COUNT(*) as total FROM viral_analyses;

  SELECT
    id,
    user_id,
    LEFT(hook, 30) as hook,
    status,
    production_stage,
    priority
  FROM viral_analyses
  LIMIT 3;

ROLLBACK;

-- 4. Check if any columns have problematic defaults
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_default IS NOT NULL
ORDER BY ordinal_position;

SELECT '✓ Constraint check complete' as status;
