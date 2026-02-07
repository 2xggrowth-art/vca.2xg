-- Migration: Add anon SELECT policies for app-v2
-- Date: 2026-02-05
-- Purpose: Allow anonymous reads from app-v2 which uses Supabase Cloud with anon key
-- Note: This is needed because app-v2 uses Authentik for auth, not Supabase Auth,
--       so the JWT tokens are not valid for Supabase. All queries run as anon role.
-- IMPORTANT: This allows public read access to these tables. Consider routing
--            queries through backend with service role key for better security.

-- viral_analyses - needed for dashboard stats, queue stats, listing analyses
DROP POLICY IF EXISTS "Anon can read viral_analyses" ON public.viral_analyses;
CREATE POLICY "Anon can read viral_analyses"
  ON public.viral_analyses FOR SELECT TO anon
  USING (true);

-- profiles - needed for user counts, team listing
DROP POLICY IF EXISTS "Anon can read profiles" ON public.profiles;
CREATE POLICY "Anon can read profiles"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- profile_list - needed for profile dropdowns
DROP POLICY IF EXISTS "Anon can read profile_list" ON public.profile_list;
CREATE POLICY "Anon can read profile_list"
  ON public.profile_list FOR SELECT TO anon
  USING (true);

-- industries - needed for industry dropdowns
DROP POLICY IF EXISTS "Anon can read industries" ON public.industries;
CREATE POLICY "Anon can read industries"
  ON public.industries FOR SELECT TO anon
  USING (true);

-- project_assignments - needed for viewing who is assigned to projects
DROP POLICY IF EXISTS "Anon can read project_assignments" ON public.project_assignments;
CREATE POLICY "Anon can read project_assignments"
  ON public.project_assignments FOR SELECT TO anon
  USING (true);

-- production_files - needed for viewing uploaded files
DROP POLICY IF EXISTS "Anon can read production_files" ON public.production_files;
CREATE POLICY "Anon can read production_files"
  ON public.production_files FOR SELECT TO anon
  USING (true);

-- Grant usage on necessary sequences (if any)
-- Note: This is typically needed for serial/identity columns

-- Add comments explaining the security model
COMMENT ON POLICY "Anon can read viral_analyses" ON public.viral_analyses IS
  'Allows app-v2 to read analyses. App-v2 uses Authentik auth, not Supabase auth.';
COMMENT ON POLICY "Anon can read profiles" ON public.profiles IS
  'Allows app-v2 to read user profiles for display purposes.';
