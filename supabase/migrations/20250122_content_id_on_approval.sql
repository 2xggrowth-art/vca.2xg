-- Migration: Change content_id generation to happen on admin approval
-- Date: 2025-01-22
-- Purpose:
--   1. Remove auto-generation of content_id on script submission
--   2. Generate content_id only when admin approves with format: BCH{PROFILE_3_LETTERS}{SEQ_NUM}

-- Step 1: Drop the existing trigger that auto-generates content_id on INSERT
DROP TRIGGER IF EXISTS auto_generate_content_id ON viral_analyses;

-- Step 2: Create new function to generate content_id on approval
-- This function takes an analysis UUID and profile_id, and generates the content_id
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
BEGIN
    -- Check if content_id already exists for this analysis
    SELECT content_id INTO v_existing_content_id
    FROM viral_analyses
    WHERE id = p_analysis_id;

    -- If content_id already exists, return it (don't regenerate)
    IF v_existing_content_id IS NOT NULL AND v_existing_content_id != '' THEN
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

    -- Get the next sequence number for this profile code
    SELECT COALESCE(MAX(
        CASE
            WHEN content_id ~ ('^' || v_profile_code || '[0-9]+$')
            THEN CAST(SUBSTRING(content_id FROM LENGTH(v_profile_code) + 1) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO v_sequence_num
    FROM viral_analyses
    WHERE content_id LIKE v_profile_code || '%';

    -- Format: BCHFIT001, BCHFIT002, etc.
    v_content_id := v_profile_code || LPAD(v_sequence_num::TEXT, 3, '0');

    -- Update the analysis with the new content_id
    UPDATE viral_analyses
    SET content_id = v_content_id
    WHERE id = p_analysis_id;

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Make content_id nullable (if not already) since it won't be generated on insert
ALTER TABLE viral_analyses ALTER COLUMN content_id DROP NOT NULL;

-- Step 4: Set default to NULL instead of any auto-generation
ALTER TABLE viral_analyses ALTER COLUMN content_id SET DEFAULT NULL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO service_role;
