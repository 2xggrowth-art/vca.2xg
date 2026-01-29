-- ============================================
-- CLEANUP: Remove Editor Assignments from Planning Stage Projects
-- ============================================
-- PROBLEM: Some projects in PLANNING stage were incorrectly assigned to editors
--          Editors should only be assigned after videographer uploads raw footage
--          and marks shooting complete (READY_FOR_EDIT stage)
--
-- SOLUTION: Delete editor assignments for projects still in planning stages
-- ============================================

-- Step 1: Preview what will be deleted (dry run)
SELECT
  'WILL DELETE' as action,
  pa.id as assignment_id,
  va.content_id,
  va.production_stage,
  p.email as editor_email,
  pa.created_at as assigned_at
FROM project_assignments pa
JOIN viral_analyses va ON va.id = pa.analysis_id
JOIN profiles p ON p.id = pa.user_id
WHERE pa.role = 'EDITOR'
  AND (
    va.production_stage IS NULL
    OR va.production_stage IN ('PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED', 'SHOOTING')
  );

-- Step 2: Delete the incorrect assignments
DELETE FROM project_assignments
WHERE role = 'EDITOR'
  AND analysis_id IN (
    SELECT id FROM viral_analyses
    WHERE production_stage IS NULL
       OR production_stage IN ('PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED', 'SHOOTING')
  );

-- Step 3: Verify cleanup
SELECT '=== REMAINING EDITOR ASSIGNMENTS ===' as status;
SELECT
  va.content_id,
  va.production_stage,
  p.email as editor_email
FROM project_assignments pa
JOIN viral_analyses va ON va.id = pa.analysis_id
JOIN profiles p ON p.id = pa.user_id
WHERE pa.role = 'EDITOR'
ORDER BY va.production_stage, va.content_id;

SELECT '✅ CLEANUP COMPLETE - Editor assignments removed from planning stage projects!' as status;
