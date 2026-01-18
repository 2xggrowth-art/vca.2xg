-- ========================================
-- FIX DUPLICATE CONTENT_IDS AND PREVENT FUTURE DUPLICATES
-- ========================================

-- Step 1: Check current duplicates
SELECT 'CURRENT DUPLICATES:' as info;
SELECT
  content_id,
  COUNT(*) as count,
  array_agg(id::text) as analysis_ids,
  array_agg(created_at::text ORDER BY created_at) as created_dates
FROM viral_analyses
WHERE content_id IS NOT NULL
GROUP BY content_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Fix existing duplicates by regenerating IDs for newer entries
DO $$
DECLARE
  duplicate_record RECORD;
  industry_code TEXT;
  next_number INTEGER;
  new_id TEXT;
  keep_first_id UUID;
BEGIN
  -- For each duplicate content_id
  FOR duplicate_record IN
    SELECT content_id
    FROM viral_analyses
    WHERE content_id IS NOT NULL
    GROUP BY content_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Processing duplicate content_id: %', duplicate_record.content_id;

    -- Get the ID of the first (oldest) record to keep its content_id
    SELECT id INTO keep_first_id
    FROM viral_analyses
    WHERE content_id = duplicate_record.content_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- Update all other duplicates
    FOR duplicate_record IN
      SELECT id, industry_id, created_at
      FROM viral_analyses
      WHERE content_id = duplicate_record.content_id
      AND id != keep_first_id
      ORDER BY created_at
    LOOP
      -- Get industry code
      SELECT COALESCE(short_code, 'GEN') INTO industry_code
      FROM industries
      WHERE id = duplicate_record.industry_id;

      IF industry_code IS NULL THEN
        industry_code := 'GEN';
      END IF;

      -- Get next available number for this industry
      SELECT COALESCE(MAX(
        CASE
          WHEN content_id ~ (industry_code || '-[0-9]+$')
          THEN CAST(SUBSTRING(content_id FROM '[0-9]+$') AS INTEGER)
          ELSE 0
        END
      ), 1000) + 1
      INTO next_number
      FROM viral_analyses
      WHERE content_id LIKE industry_code || '-%';

      -- Generate new unique ID
      new_id := industry_code || '-' || next_number;

      -- Ensure uniqueness with timestamp suffix if needed
      WHILE EXISTS (SELECT 1 FROM viral_analyses WHERE content_id = new_id) LOOP
        next_number := next_number + 1;
        new_id := industry_code || '-' || next_number;
      END LOOP;

      -- Update the record
      UPDATE viral_analyses
      SET content_id = new_id
      WHERE id = duplicate_record.id;

      RAISE NOTICE 'Updated analysis % with new content_id: %', duplicate_record.id, new_id;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS auto_generate_content_id ON viral_analyses;
DROP FUNCTION IF EXISTS generate_content_id();

-- Step 4: Create improved content_id generation function
CREATE OR REPLACE FUNCTION generate_content_id()
RETURNS TRIGGER AS $$
DECLARE
  industry_code TEXT;
  next_number INTEGER;
  new_content_id TEXT;
  max_attempts INTEGER := 50;
  attempt INTEGER := 0;
BEGIN
  -- Only generate if content_id is not already set
  IF NEW.content_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get industry short code
  SELECT short_code INTO industry_code
  FROM industries
  WHERE id = NEW.industry_id;

  -- If no industry, use default 'GEN'
  IF industry_code IS NULL THEN
    industry_code := 'GEN';
  END IF;

  -- Try to generate unique content_id with retry logic
  LOOP
    attempt := attempt + 1;

    -- Get next number for this industry
    -- Using LOCK TABLE would be too aggressive, so we use a SELECT with careful logic
    SELECT COALESCE(MAX(
      CASE
        WHEN content_id ~ ('^' || industry_code || '-[0-9]+$')
        THEN CAST(SUBSTRING(content_id FROM '[0-9]+$') AS INTEGER)
        ELSE 0
      END
    ), 1000) + 1
    INTO next_number
    FROM viral_analyses
    WHERE content_id LIKE industry_code || '-%';

    -- Generate new content ID
    new_content_id := industry_code || '-' || next_number;

    -- Check if this ID already exists
    IF NOT EXISTS (SELECT 1 FROM viral_analyses WHERE content_id = new_content_id) THEN
      NEW.content_id := new_content_id;
      RETURN NEW;
    END IF;

    -- If we've tried too many times, use a timestamp-based fallback
    IF attempt >= max_attempts THEN
      -- Use epoch timestamp to ensure uniqueness
      new_content_id := industry_code || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
      NEW.content_id := new_content_id;
      RAISE WARNING 'Used fallback content_id generation: %', new_content_id;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
CREATE TRIGGER auto_generate_content_id
  BEFORE INSERT ON viral_analyses
  FOR EACH ROW
  WHEN (NEW.content_id IS NULL)
  EXECUTE FUNCTION generate_content_id();

-- Step 6: Add unique constraint to prevent future duplicates
-- First check if constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'viral_analyses_content_id_unique'
  ) THEN
    ALTER TABLE viral_analyses
    ADD CONSTRAINT viral_analyses_content_id_unique UNIQUE (content_id);
    RAISE NOTICE 'Added unique constraint on content_id';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Step 7: Verify the fix
SELECT 'VERIFICATION - REMAINING DUPLICATES (should be empty):' as info;
SELECT
  content_id,
  COUNT(*) as count
FROM viral_analyses
WHERE content_id IS NOT NULL
GROUP BY content_id
HAVING COUNT(*) > 1;

-- Step 8: Show content_id distribution by industry
SELECT 'CONTENT_ID DISTRIBUTION BY INDUSTRY:' as info;
SELECT
  SUBSTRING(content_id FROM '^[A-Z]+') as industry_prefix,
  COUNT(*) as total_scripts,
  MIN(content_id) as first_id,
  MAX(content_id) as last_id
FROM viral_analyses
WHERE content_id IS NOT NULL
GROUP BY SUBSTRING(content_id FROM '^[A-Z]+')
ORDER BY total_scripts DESC;

-- Step 9: Confirm trigger exists
SELECT 'TRIGGER VERIFICATION:' as info;
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'auto_generate_content_id';
