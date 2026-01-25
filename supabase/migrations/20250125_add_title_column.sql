-- Add title column to viral_analyses table
-- This column stores a short title/name for the content

ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add comment for documentation
COMMENT ON COLUMN viral_analyses.title IS 'Short title or name for the content piece';
