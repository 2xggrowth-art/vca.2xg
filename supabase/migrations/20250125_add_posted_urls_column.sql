-- Add posted_urls JSONB column for tracking multi-platform posts
-- This allows storing multiple posted URLs when the same video is posted to different platforms

ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posted_urls JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN viral_analyses.posted_urls IS 'Array of {url, posted_at} objects tracking posts to multiple platforms';

-- Create index for potential queries on posted_urls
CREATE INDEX IF NOT EXISTS idx_viral_analyses_posted_urls ON viral_analyses USING gin(posted_urls);
