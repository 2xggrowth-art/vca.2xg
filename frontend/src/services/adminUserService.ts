import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export const adminUserService = {
  /**
   * Create a new user (admin only)
   * Note: This creates a user via Supabase Auth signUp, then updates their profile.
   * The user will need to verify their email or be manually verified.
   */
  async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
  }) {
    // First, create the user in Supabase Auth
    // Note: This requires the user to verify their email unless email confirmation is disabled
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.fullName,
          role: userData.role,
        }
      }
    });

    if (authError) {
      throw new Error(authError.message || 'Failed to create user');
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    // Update the profile with the role and full name
    // The profile should be auto-created by a trigger, but we update it to be safe
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.fullName,
        role: userData.role,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't throw here - user was created, profile will be updated on first login
    }

    return {
      success: true,
      user: authData.user,
      message: 'User created successfully. They may need to verify their email.'
    };
  },

  /**
   * Soft delete a user (admin only)
   * This doesn't delete the user from Supabase Auth (requires service role key),
   * but deactivates them by:
   * 1. Setting is_active = false in profiles
   * 2. Removing all their project assignments
   *
   * The user won't be able to access anything but their auth record remains.
   */
  async deleteUser(userId: string) {
    // First, check if the user exists and is not a super admin
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error('User not found');
    }

    if (profile.role === 'SUPER_ADMIN') {
      throw new Error('Cannot delete super admin users');
    }

    // Remove all project assignments for this user
    const { error: assignmentError } = await supabase
      .from('project_assignments')
      .delete()
      .eq('user_id', userId);

    if (assignmentError) {
      console.error('Failed to remove assignments:', assignmentError);
      // Continue anyway - we still want to deactivate the user
    }

    // Soft delete: Mark user as inactive and clear their role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        role: null, // Remove role so they can't access anything
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to deactivate user');
    }

    return {
      success: true,
      message: `User ${profile.full_name || profile.email} has been deactivated and removed from all projects.`
    };
  },

  /**
   * Reactivate a previously deactivated user
   */
  async reactivateUser(userId: string, role: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to reactivate user');
    }

    return { success: true };
  },

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to update user role');
    }

    return { success: true };
  }
};
