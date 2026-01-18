-- Add Disapproval Feature for Approved Scripts
-- This allows admins to disapprove already-approved scripts and send them back for revision

-- 1. Add disapproval tracking fields to viral_analyses table
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS disapproval_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_disapproved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;

-- 2. Create function to handle disapproval
CREATE OR REPLACE FUNCTION disapprove_script(
    analysis_uuid UUID,
    reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the analysis to move it back to pending
    UPDATE viral_analyses
    SET
        status = 'PENDING',
        disapproval_count = disapproval_count + 1,
        last_disapproved_at = NOW(),
        disapproval_reason = reason,
        -- Reset production stage to NOT_STARTED if it was in progress
        production_stage = CASE
            WHEN production_stage IN ('NOT_STARTED', 'PRE_PRODUCTION') THEN production_stage
            ELSE 'NOT_STARTED'
        END,
        updated_at = NOW()
    WHERE id = analysis_uuid
    
    AND status = 'APPROVED';

    -- Add note to production_notes
    UPDATE viral_analyses
    SET production_notes = COALESCE(production_notes || E'\n\n', '') ||
        '🔴 DISAPPROVED on ' || NOW()::TEXT || E'\nReason: ' || reason
    WHERE id = analysis_uuid;

    -- Optionally: Remove team assignments if needed
    -- Uncomment if you want to unassign team when disapproved
    -- UPDATE project_assignments
    -- SET videographer_id = NULL, editor_id = NULL, posting_manager_id = NULL
    -- WHERE analysis_id = analysis_uuid;

END;
$$;

-- 3. Add comment for documentation
COMMENT ON FUNCTION disapprove_script IS
'Allows admin to disapprove an already-approved script and send it back to PENDING status.
Increments disapproval counter and resets production stage if needed.';

-- 4. Add index for better query performance on disapproved scripts
CREATE INDEX IF NOT EXISTS idx_viral_analyses_disapproval
ON viral_analyses(disapproval_count)
WHERE disapproval_count > 0;

-- 5. Create view for tracking disapprovals
CREATE OR REPLACE VIEW disapproved_scripts AS
SELECT
    va.id,
    va.content_id,
    va.hook,
    va.status,
    va.disapproval_count,
    va.rejection_count,
    va.last_disapproved_at,
    va.disapproval_reason,
    va.production_stage,
    p.full_name as script_writer_name,
    p.email as script_writer_email,
    va.created_at,
    va.updated_at
FROM viral_analyses va
LEFT JOIN profiles p ON va.user_id = p.id
WHERE va.disapproval_count > 0
ORDER BY va.last_disapproved_at DESC;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION disapprove_script TO authenticated;
GRANT SELECT ON disapproved_scripts TO authenticated;

-- Verification queries
-- Check if fields were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name IN ('disapproval_count', 'last_disapproved_at', 'disapproval_reason');

-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'disapprove_script';

-- Check if view exists
SELECT table_name
FROM information_schema.views
WHERE table_name = 'disapproved_scripts';
