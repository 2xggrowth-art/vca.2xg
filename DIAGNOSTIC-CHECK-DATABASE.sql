-- ========================================
-- DIAGNOSTIC: Check Database Structure
-- ========================================
-- Run this first to see what tables exist in your database

-- Step 1: List all tables in the public schema
SELECT 'ALL TABLES IN PUBLIC SCHEMA:' as info;
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Check if viral_analyses table exists (with different possible names)
SELECT 'CHECKING FOR VIRAL ANALYSES TABLE:' as info;
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name LIKE '%viral%' OR table_name LIKE '%analys%'
ORDER BY table_name;

-- Step 3: If viral_analyses exists, show its structure
SELECT 'VIRAL_ANALYSES COLUMNS (if table exists):' as info;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check if content_id column exists
SELECT 'CHECKING FOR CONTENT_ID COLUMN:' as info;
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name = 'content_id';

-- Step 5: Check current schema search path
SELECT 'CURRENT SCHEMA SEARCH PATH:' as info;
SHOW search_path;

-- Step 6: Try to count records (will fail if table doesn't exist)
DO $$
BEGIN
  BEGIN
    EXECUTE 'SELECT COUNT(*) FROM viral_analyses';
    RAISE NOTICE 'viral_analyses table exists and is accessible';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'viral_analyses table does NOT exist in current schema';
  END;
END $$;
