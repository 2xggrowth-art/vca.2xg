-- Add post performance metrics columns (manually entered by posting manager)
ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS post_views INTEGER DEFAULT 0;
ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS post_likes INTEGER DEFAULT 0;
ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS post_comments INTEGER DEFAULT 0;
