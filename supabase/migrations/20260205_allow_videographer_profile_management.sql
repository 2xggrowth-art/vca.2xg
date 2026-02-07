-- Migration: Allow all authenticated users to manage profiles
-- Date: 2026-02-05
-- Purpose: Enable videographers and other roles to create/update/delete profiles
-- Previously only SUPER_ADMIN and CREATOR could modify profiles

-- Allow all authenticated users to insert profiles
DROP POLICY IF EXISTS "Only admins can insert profile list" ON public.profile_list;
CREATE POLICY "Authenticated users can insert profile list"
  ON public.profile_list FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update profiles
DROP POLICY IF EXISTS "Only admins can update profile list" ON public.profile_list;
CREATE POLICY "Authenticated users can update profile list"
  ON public.profile_list FOR UPDATE TO authenticated
  USING (true);

-- Allow all authenticated users to delete (soft delete) profiles
DROP POLICY IF EXISTS "Only admins can delete profile list" ON public.profile_list;
CREATE POLICY "Authenticated users can delete profile list"
  ON public.profile_list FOR DELETE TO authenticated
  USING (true);
