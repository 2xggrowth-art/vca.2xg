-- ================================================
-- RE-ENABLE RLS - Run this after testing
-- ================================================

-- Re-enable RLS
ALTER TABLE viral_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

SELECT '✓ RLS RE-ENABLED - Data is secure again' as status;
