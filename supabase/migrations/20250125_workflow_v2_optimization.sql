-- Migration: Workflow v2.0 Optimization
-- Date: 2025-01-25
-- Purpose:
--   1. Add trusted writer flag to profiles
--   2. Add posting manager fields (platform, caption, heading, posted_url, etc.)
--   3. Migrate old production stages to new simplified stages
--   4. Preserve historical data

-- ============================================
-- PART 1: Add trusted writer flag to profiles
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_trusted_writer BOOLEAN DEFAULT FALSE;

-- Index for quick lookups of trusted writers
CREATE INDEX IF NOT EXISTS idx_profiles_trusted_writer
ON profiles(is_trusted_writer) WHERE is_trusted_writer = TRUE;

COMMENT ON COLUMN profiles.is_trusted_writer IS
'If true, scripts from this writer are auto-approved to PLANNING stage';

-- ============================================
-- PART 2: Add posting manager fields
-- ============================================

-- Platform selection for posting
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posting_platform VARCHAR(50);

COMMENT ON COLUMN viral_analyses.posting_platform IS
'Platform for posting: INSTAGRAM_REEL, INSTAGRAM_POST, TIKTOK, YOUTUBE_SHORTS, YOUTUBE_VIDEO';

-- Caption/description text
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posting_caption TEXT;

COMMENT ON COLUMN viral_analyses.posting_caption IS
'Caption/description text for the post';

-- Title/heading for YouTube/TikTok
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posting_heading VARCHAR(255);

COMMENT ON COLUMN viral_analyses.posting_heading IS
'Title/heading for YouTube or TikTok posts';

-- Hashtags array
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posting_hashtags TEXT[];

COMMENT ON COLUMN viral_analyses.posting_hashtags IS
'Array of hashtags for the post';

-- Scheduled post time
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS scheduled_post_time TIMESTAMPTZ;

COMMENT ON COLUMN viral_analyses.scheduled_post_time IS
'When the post is scheduled to go live';

-- Link to the live post (for tracking)
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posted_url VARCHAR(500);

COMMENT ON COLUMN viral_analyses.posted_url IS
'URL to the live post (Instagram/TikTok/YouTube link)';

-- Actual post time
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

COMMENT ON COLUMN viral_analyses.posted_at IS
'Actual timestamp when the content was posted';

-- ============================================
-- PART 3: Migrate production stages
-- ============================================
-- Old stages: NOT_STARTED, PRE_PRODUCTION, PLANNED, SHOOTING, SHOOT_REVIEW,
--             EDITING, EDIT_REVIEW, FINAL_REVIEW, READY_TO_POST, POSTED
-- New stages: PLANNING, SHOOTING, READY_FOR_EDIT, EDITING, READY_TO_POST, POSTED

-- Map old stages to new stages (preserving historical data)
-- NOT_STARTED, PRE_PRODUCTION, PLANNED -> PLANNING
UPDATE viral_analyses
SET production_stage = 'PLANNING'
WHERE production_stage IN ('NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED')
AND status = 'APPROVED';

-- SHOOT_REVIEW -> READY_FOR_EDIT
UPDATE viral_analyses
SET production_stage = 'READY_FOR_EDIT'
WHERE production_stage = 'SHOOT_REVIEW';

-- EDIT_REVIEW, FINAL_REVIEW -> READY_TO_POST
UPDATE viral_analyses
SET production_stage = 'READY_TO_POST'
WHERE production_stage IN ('EDIT_REVIEW', 'FINAL_REVIEW');

-- SHOOTING, EDITING, READY_TO_POST, POSTED remain unchanged (same names)

-- ============================================
-- PART 4: Create helper function to check if project has raw footage
-- ============================================

CREATE OR REPLACE FUNCTION has_raw_footage(p_analysis_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM production_files
        WHERE analysis_id = p_analysis_id
        AND file_type IN ('RAW_FOOTAGE', 'A_ROLL', 'B_ROLL', 'HOOK', 'BODY', 'CTA', 'AUDIO_CLIP')
        AND is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION has_raw_footage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_raw_footage(UUID) TO service_role;

-- ============================================
-- PART 5: Create helper function to check if project has edited video
-- ============================================

CREATE OR REPLACE FUNCTION has_edited_video(p_analysis_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM production_files
        WHERE analysis_id = p_analysis_id
        AND file_type IN ('EDITED_VIDEO', 'FINAL_VIDEO')
        AND is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION has_edited_video(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_edited_video(UUID) TO service_role;

-- ============================================
-- PART 6: Create indexes for new queries
-- ============================================

-- Index for PLANNING stage queries (videographer queue)
CREATE INDEX IF NOT EXISTS idx_viral_analyses_planning_queue
ON viral_analyses(production_stage, status, priority, created_at)
WHERE production_stage = 'PLANNING' AND status = 'APPROVED';

-- Index for READY_FOR_EDIT stage queries (editor queue)
CREATE INDEX IF NOT EXISTS idx_viral_analyses_edit_queue
ON viral_analyses(production_stage, status, priority, created_at)
WHERE production_stage = 'READY_FOR_EDIT' AND status = 'APPROVED';

-- Index for READY_TO_POST stage queries (posting manager queue)
CREATE INDEX IF NOT EXISTS idx_viral_analyses_post_queue
ON viral_analyses(production_stage, status, scheduled_post_time, priority)
WHERE production_stage = 'READY_TO_POST' AND status = 'APPROVED';

-- Index for posted_url lookups (tracking)
CREATE INDEX IF NOT EXISTS idx_viral_analyses_posted_url
ON viral_analyses(posted_url) WHERE posted_url IS NOT NULL;

-- ============================================
-- PART 7: Create RLS policies for new fields (if needed)
-- ============================================

-- No new RLS policies needed - existing policies cover the new columns

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_planning_count INTEGER;
    v_ready_for_edit_count INTEGER;
    v_ready_to_post_count INTEGER;
    v_trusted_writers INTEGER;
BEGIN
    -- Count migrated stages
    SELECT COUNT(*) INTO v_planning_count
    FROM viral_analyses WHERE production_stage = 'PLANNING';

    SELECT COUNT(*) INTO v_ready_for_edit_count
    FROM viral_analyses WHERE production_stage = 'READY_FOR_EDIT';

    SELECT COUNT(*) INTO v_ready_to_post_count
    FROM viral_analyses WHERE production_stage = 'READY_TO_POST';

    SELECT COUNT(*) INTO v_trusted_writers
    FROM profiles WHERE is_trusted_writer = TRUE;

    RAISE NOTICE '=== WORKFLOW V2.0 MIGRATION COMPLETE ===';
    RAISE NOTICE 'Projects in PLANNING stage: %', v_planning_count;
    RAISE NOTICE 'Projects in READY_FOR_EDIT stage: %', v_ready_for_edit_count;
    RAISE NOTICE 'Projects in READY_TO_POST stage: %', v_ready_to_post_count;
    RAISE NOTICE 'Trusted writers: %', v_trusted_writers;
    RAISE NOTICE '';
    RAISE NOTICE 'New fields added:';
    RAISE NOTICE '  - profiles.is_trusted_writer';
    RAISE NOTICE '  - viral_analyses.posting_platform';
    RAISE NOTICE '  - viral_analyses.posting_caption';
    RAISE NOTICE '  - viral_analyses.posting_heading';
    RAISE NOTICE '  - viral_analyses.posting_hashtags';
    RAISE NOTICE '  - viral_analyses.scheduled_post_time';
    RAISE NOTICE '  - viral_analyses.posted_url';
    RAISE NOTICE '  - viral_analyses.posted_at';
    RAISE NOTICE '';
    RAISE NOTICE 'Stage mapping:';
    RAISE NOTICE '  NOT_STARTED, PRE_PRODUCTION, PLANNED -> PLANNING';
    RAISE NOTICE '  SHOOT_REVIEW -> READY_FOR_EDIT';
    RAISE NOTICE '  EDIT_REVIEW, FINAL_REVIEW -> READY_TO_POST';
END $$;
