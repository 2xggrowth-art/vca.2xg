-- Migration: Permanent Content ID Tracking
-- Date: 2025-01-24
-- Purpose: Ensure content IDs are never reused, even after project deletion

-- Step 1: Create a table to permanently track all used content IDs
CREATE TABLE IF NOT EXISTS used_content_ids (
    content_id TEXT PRIMARY KEY,
    analysis_id UUID,  -- Can be NULL if the project was deleted
    profile_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- When the associated project was deleted (if applicable)
);

-- Step 2: Populate the table with all existing content IDs
INSERT INTO used_content_ids (content_id, analysis_id, profile_id, created_at)
SELECT
    content_id,
    id as analysis_id,
    profile_id,
    created_at
FROM viral_analyses
WHERE content_id IS NOT NULL AND content_id != ''
ON CONFLICT (content_id) DO NOTHING;

-- Step 3: Create a trigger to automatically track new content IDs
CREATE OR REPLACE FUNCTION track_content_id()
RETURNS TRIGGER AS $$
BEGIN
    -- When content_id is set or updated
    IF NEW.content_id IS NOT NULL AND NEW.content_id != '' THEN
        INSERT INTO used_content_ids (content_id, analysis_id, profile_id, created_at)
        VALUES (NEW.content_id, NEW.id, NEW.profile_id, NOW())
        ON CONFLICT (content_id) DO UPDATE
        SET analysis_id = NEW.id,
            profile_id = NEW.profile_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_content_id_trigger ON viral_analyses;
CREATE TRIGGER track_content_id_trigger
    AFTER INSERT OR UPDATE OF content_id ON viral_analyses
    FOR EACH ROW
    EXECUTE FUNCTION track_content_id();

-- Step 4: Create a trigger to mark content IDs as deleted (but keep them reserved)
CREATE OR REPLACE FUNCTION mark_content_id_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- When a viral_analysis is deleted, mark the content_id as deleted but keep it reserved
    IF OLD.content_id IS NOT NULL AND OLD.content_id != '' THEN
        UPDATE used_content_ids
        SET deleted_at = NOW(),
            analysis_id = NULL  -- Clear the reference since project is deleted
        WHERE content_id = OLD.content_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_content_id_deleted_trigger ON viral_analyses;
CREATE TRIGGER mark_content_id_deleted_trigger
    BEFORE DELETE ON viral_analyses
    FOR EACH ROW
    EXECUTE FUNCTION mark_content_id_deleted();

-- Step 5: Update the generate_content_id_on_approval function to check used_content_ids
CREATE OR REPLACE FUNCTION generate_content_id_on_approval(
    p_analysis_id UUID,
    p_profile_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_profile_name TEXT;
    v_profile_code TEXT;
    v_sequence_num INTEGER;
    v_content_id TEXT;
    v_existing_content_id TEXT;
    v_max_attempts INTEGER := 100;
    v_attempt INTEGER := 0;
BEGIN
    -- Check if content_id already exists for this analysis
    SELECT content_id INTO v_existing_content_id
    FROM viral_analyses
    WHERE id = p_analysis_id;

    -- If content_id already exists AND is in new BCH format, return it (don't regenerate)
    -- But if it's in old GEN- format, we should regenerate it
    IF v_existing_content_id IS NOT NULL
       AND v_existing_content_id != ''
       AND v_existing_content_id NOT LIKE 'GEN-%' THEN
        RETURN v_existing_content_id;
    END IF;

    -- Get profile name
    SELECT name INTO v_profile_name
    FROM profile_list
    WHERE id = p_profile_id;

    IF v_profile_name IS NULL THEN
        RAISE EXCEPTION 'Profile not found with id: %', p_profile_id;
    END IF;

    -- Generate profile code: BCH + first 3 letters of profile name (uppercase)
    v_profile_code := 'BCH' || UPPER(LEFT(REGEXP_REPLACE(v_profile_name, '[^a-zA-Z]', '', 'g'), 3));

    -- Get the next sequence number by checking BOTH viral_analyses AND used_content_ids
    -- This ensures we never reuse a content ID even if the project was deleted
    SELECT COALESCE(MAX(seq_num), 0) + 1 INTO v_sequence_num
    FROM (
        -- Check current viral_analyses
        SELECT
            CASE
                WHEN content_id ~ ('^' || v_profile_code || '[0-9]+$')
                THEN CAST(SUBSTRING(content_id FROM LENGTH(v_profile_code) + 1) AS INTEGER)
                ELSE 0
            END as seq_num
        FROM viral_analyses
        WHERE content_id LIKE v_profile_code || '%'

        UNION ALL

        -- Check used_content_ids (includes deleted projects)
        SELECT
            CASE
                WHEN content_id ~ ('^' || v_profile_code || '[0-9]+$')
                THEN CAST(SUBSTRING(content_id FROM LENGTH(v_profile_code) + 1) AS INTEGER)
                ELSE 0
            END as seq_num
        FROM used_content_ids
        WHERE content_id LIKE v_profile_code || '%'
    ) combined;

    -- Generate the content ID
    v_content_id := v_profile_code || LPAD(v_sequence_num::TEXT, 3, '0');

    -- Double-check uniqueness against used_content_ids (belt and suspenders)
    WHILE EXISTS (SELECT 1 FROM used_content_ids WHERE content_id = v_content_id) LOOP
        v_attempt := v_attempt + 1;
        IF v_attempt >= v_max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique content_id after % attempts', v_max_attempts;
        END IF;
        v_sequence_num := v_sequence_num + 1;
        v_content_id := v_profile_code || LPAD(v_sequence_num::TEXT, 3, '0');
    END LOOP;

    -- Update the analysis with the new content_id
    UPDATE viral_analyses
    SET content_id = v_content_id,
        profile_id = p_profile_id
    WHERE id = p_analysis_id;

    -- The trigger will automatically add this to used_content_ids

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE ON used_content_ids TO authenticated;
GRANT SELECT, INSERT, UPDATE ON used_content_ids TO service_role;
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO service_role;

-- Step 7: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_used_content_ids_prefix ON used_content_ids (content_id text_pattern_ops);

-- Verification
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM used_content_ids;
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Total content IDs tracked: %', v_count;
    RAISE NOTICE 'Content IDs will now be permanently reserved even after project deletion.';
END $$;
