-- Migration: Fix content_id generation to replace old GEN- format
-- Date: 2025-01-22
-- Purpose: Update the function to replace old GEN- format content IDs with new BCH format

-- Drop and recreate the function to handle old GEN- format content_ids
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

    -- Format: BCHNEX001, BCHFIT002, etc.
    v_content_id := v_profile_code || LPAD(v_sequence_num::TEXT, 3, '0');

    -- Update the analysis with the new content_id
    UPDATE viral_analyses
    SET content_id = v_content_id
    WHERE id = p_analysis_id;

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_content_id_on_approval(UUID, UUID) TO service_role;
