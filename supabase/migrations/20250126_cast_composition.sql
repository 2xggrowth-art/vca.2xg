-- ============================================
-- Migration: Add Structured Cast Composition
-- ============================================
-- This migration adds a JSONB column for structured cast tracking
-- while preserving the existing character_tags many-to-many relationship
-- ============================================

-- Step 1: Add the cast_composition JSONB column
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS cast_composition JSONB DEFAULT '{
  "man": 0,
  "woman": 0,
  "boy": 0,
  "girl": 0,
  "teen_boy": 0,
  "teen_girl": 0,
  "senior_man": 0,
  "senior_woman": 0,
  "include_owner": false,
  "total": 0
}'::jsonb;

-- Step 2: Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_viral_analyses_cast_composition
ON viral_analyses USING GIN (cast_composition);

-- Step 3: The GIN index above is sufficient for JSONB queries
-- Expression indexes on JSONB fields are optional and can be added later if needed

-- Step 4: Create a function to auto-calculate total
CREATE OR REPLACE FUNCTION calculate_cast_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total from individual counts
  NEW.cast_composition = jsonb_set(
    NEW.cast_composition,
    '{total}',
    to_jsonb(
      COALESCE((NEW.cast_composition->>'man')::int, 0) +
      COALESCE((NEW.cast_composition->>'woman')::int, 0) +
      COALESCE((NEW.cast_composition->>'boy')::int, 0) +
      COALESCE((NEW.cast_composition->>'girl')::int, 0) +
      COALESCE((NEW.cast_composition->>'teen_boy')::int, 0) +
      COALESCE((NEW.cast_composition->>'teen_girl')::int, 0) +
      COALESCE((NEW.cast_composition->>'senior_man')::int, 0) +
      COALESCE((NEW.cast_composition->>'senior_woman')::int, 0)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-calculate total on insert/update
DROP TRIGGER IF EXISTS trg_calculate_cast_total ON viral_analyses;

CREATE TRIGGER trg_calculate_cast_total
BEFORE INSERT OR UPDATE OF cast_composition ON viral_analyses
FOR EACH ROW
WHEN (NEW.cast_composition IS NOT NULL)
EXECUTE FUNCTION calculate_cast_total();

-- Step 6: Initialize existing rows with default cast_composition
UPDATE viral_analyses
SET cast_composition = '{
  "man": 0,
  "woman": 0,
  "boy": 0,
  "girl": 0,
  "teen_boy": 0,
  "teen_girl": 0,
  "senior_man": 0,
  "senior_woman": 0,
  "include_owner": false,
  "total": 0
}'::jsonb
WHERE cast_composition IS NULL;

-- Step 7: Add comment for documentation
COMMENT ON COLUMN viral_analyses.cast_composition IS 'Structured cast composition with counts for each demographic category. Total is auto-calculated via trigger.';

-- Step 8: Verification
SELECT
  'Cast composition column added successfully' as status,
  COUNT(*) as total_rows,
  COUNT(cast_composition) as rows_with_cast
FROM viral_analyses;
