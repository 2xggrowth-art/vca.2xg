/**
 * Admin Service - Admin API
 *
 * Handles:
 * - Fetching all analyses
 * - Reviewing/scoring analyses
 * - Dashboard stats
 * - Queue stats for pipeline
 */

import { supabase, auth, storage } from '@/lib/api';
import type { ViralAnalysis } from '@/types';

export interface ReviewData {
  status: 'APPROVED' | 'REJECTED';
  feedback?: string;
  feedbackVoiceNote?: Blob | null;
  hookStrength: number;
  contentQuality: number;
  viralPotential: number;
  replicationClarity: number;
  profileId?: string;
}

export interface DashboardStats {
  totalAnalyses: number;
  totalUsers: number;
  pendingAnalyses: number;
  approvedAnalyses: number;
  rejectedAnalyses: number;
}

export interface QueueStats {
  pending: number;
  planning: number;
  shooting: number;
  readyForEdit: number;
  editing: number;
  readyToPost: number;
  posted: number;
  totalActive: number;
}

export const adminService = {
  /**
   * Get all analyses with user info (admin only)
   */
  async getAllAnalyses(): Promise<ViralAnalysis[]> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        ),
        assignments:project_assignments (
          id,
          role,
          user:profiles!project_assignments_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        ),
        industry:industries (
          id,
          name,
          short_code
        ),
        profile:profile_list (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten the nested profile data and parse assignments
    const analyses = (data || []) as any[];
    return analyses.map((analysis: any) => {
      const videographer = analysis.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user;
      const editor = analysis.assignments?.find((a: any) => a.role === 'EDITOR')?.user;
      const posting_manager = analysis.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user;

      return {
        ...analysis,
        email: analysis.profiles?.email,
        full_name: analysis.profiles?.full_name,
        avatar_url: analysis.profiles?.avatar_url,
        videographer,
        editor,
        posting_manager,
      };
    }) as ViralAnalysis[];
  },

  /**
   * Get pending analyses
   */
  async getPendingAnalyses(): Promise<ViralAnalysis[]> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        ),
        industry:industries (id, name, short_code),
        profile:profile_list (id, name)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const pendingList = (data || []) as any[];
    return pendingList.map((analysis: any) => ({
      ...analysis,
      email: analysis.profiles?.email,
      full_name: analysis.profiles?.full_name,
      avatar_url: analysis.profiles?.avatar_url,
    })) as ViralAnalysis[];
  },

  /**
   * Get single analysis by ID
   */
  async getAnalysis(id: string): Promise<ViralAnalysis> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        ),
        industry:industries (id, name, short_code),
        profile:profile_list (id, name),
        assignments:project_assignments (
          id,
          role,
          user:profiles!project_assignments_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url,
            role
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const analysis = data as any;
    const videographer = analysis.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user;
    const editor = analysis.assignments?.find((a: any) => a.role === 'EDITOR')?.user;
    const posting_manager = analysis.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user;

    return {
      ...analysis,
      email: analysis.profiles?.email,
      full_name: analysis.profiles?.full_name,
      avatar_url: analysis.profiles?.avatar_url,
      videographer,
      editor,
      posting_manager,
    } as ViralAnalysis;
  },

  /**
   * Review analysis with scoring
   */
  async reviewAnalysis(id: string, reviewData: ReviewData): Promise<ViralAnalysis> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate feedback for rejections
    if (reviewData.status === 'REJECTED' && !reviewData.feedback) {
      throw new Error('Feedback is required when rejecting an analysis');
    }

    // Calculate overall score
    const overall_score = (
      reviewData.hookStrength +
      reviewData.contentQuality +
      reviewData.viralPotential +
      reviewData.replicationClarity
    ) / 4;

    // Upload voice feedback if provided
    let feedback_voice_note_url: string | undefined;
    if (reviewData.feedbackVoiceNote) {
      const fileName = `feedback-${id}-${Date.now()}.webm`;
      const { error: uploadError } = await storage
        .from('voice-notes')
        .upload(fileName, reviewData.feedbackVoiceNote, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      feedback_voice_note_url = publicUrl;
    }

    // Increment rejection counter if rejecting
    if (reviewData.status === 'REJECTED') {
      await supabase.rpc('increment_rejection_counter', {
        analysis_uuid: id,
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      status: reviewData.status,
      feedback: reviewData.feedback,
      feedback_voice_note_url,
      hook_strength: reviewData.hookStrength,
      content_quality: reviewData.contentQuality,
      viral_potential: reviewData.viralPotential,
      replication_clarity: reviewData.replicationClarity,
      overall_score: parseFloat(overall_score.toFixed(1)),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    // If approving, set production_stage to PLANNING
    if (reviewData.status === 'APPROVED') {
      updateData.production_stage = 'PLANNING';
    }

    // If profile_id is provided, update it
    if (reviewData.profileId) {
      updateData.profile_id = reviewData.profileId;
    }

    const { data, error } = await supabase
      .from('viral_analyses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Generate content_id if approving with profile
    if (reviewData.status === 'APPROVED' && reviewData.profileId) {
      await supabase.rpc('generate_content_id_on_approval', {
        p_analysis_id: id,
        p_profile_id: reviewData.profileId,
      });
    }

    return data as ViralAnalysis;
  },

  /**
   * Get dashboard stats
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [analysesResult, usersResult] = await Promise.all([
      supabase.from('viral_analyses').select('status', { count: 'exact' }),
      supabase.from('profiles').select('role', { count: 'exact' }),
    ]);

    if (analysesResult.error) throw analysesResult.error;
    if (usersResult.error) throw usersResult.error;

    const totalAnalyses = analysesResult.count || 0;
    const totalUsers = usersResult.count || 0;

    const { data: statusCounts } = await supabase
      .from('viral_analyses')
      .select('status');

    const statusData = (statusCounts || []) as { status: string }[];
    const pending = statusData.filter((a) => a.status === 'PENDING').length;
    const approved = statusData.filter((a) => a.status === 'APPROVED').length;
    const rejected = statusData.filter((a) => a.status === 'REJECTED').length;

    return {
      totalAnalyses,
      totalUsers,
      pendingAnalyses: pending,
      approvedAnalyses: approved,
      rejectedAnalyses: rejected,
    };
  },

  /**
   * Get queue stats for pipeline overview
   */
  async getQueueStats(): Promise<QueueStats> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select('status, production_stage');

    if (error) throw error;

    const analyses = (data || []) as { status: string; production_stage?: string }[];

    const pending = analyses.filter((a) => a.status === 'PENDING').length;
    const approved = analyses.filter((a) => a.status === 'APPROVED');

    const planningStages = ['PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED'];
    const planning = approved.filter((a) => planningStages.includes(a.production_stage || '') || !a.production_stage).length;
    const shooting = approved.filter((a) => a.production_stage === 'SHOOTING').length;
    const readyForEdit = approved.filter((a) => ['READY_FOR_EDIT', 'SHOOT_REVIEW'].includes(a.production_stage || '')).length;
    const editing = approved.filter((a) => a.production_stage === 'EDITING').length;
    const readyToPost = approved.filter((a) => ['READY_TO_POST', 'EDIT_REVIEW', 'FINAL_REVIEW'].includes(a.production_stage || '')).length;
    const posted = approved.filter((a) => a.production_stage === 'POSTED').length;

    const totalActive = planning + shooting + readyForEdit + editing + readyToPost;

    return {
      pending,
      planning,
      shooting,
      readyForEdit,
      editing,
      readyToPost,
      posted,
      totalActive,
    };
  },

  /**
   * Get all team members (users)
   */
  async getTeamMembers(): Promise<{
    id: string;
    email: string;
    full_name?: string;
    role: string;
    avatar_url?: string;
    created_at: string;
    is_trusted_writer?: boolean;
  }[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role')
      .order('full_name');

    if (error) throw error;
    return (data || []) as {
      id: string;
      email: string;
      full_name?: string;
      role: string;
      avatar_url?: string;
      created_at: string;
      is_trusted_writer?: boolean;
    }[];
  },

  /**
   * Get team stats by role
   */
  async getTeamStats(): Promise<{
    admins: number;
    writers: number;
    videographers: number;
    editors: number;
    postingManagers: number;
    total: number;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role');

    if (error) throw error;

    const users = (data || []) as { role: string }[];
    return {
      admins: users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'admin').length,
      writers: users.filter((u) => u.role === 'SCRIPT_WRITER' || u.role === 'script_writer').length,
      videographers: users.filter((u) => u.role === 'VIDEOGRAPHER' || u.role === 'videographer').length,
      editors: users.filter((u) => u.role === 'EDITOR' || u.role === 'editor').length,
      postingManagers: users.filter((u) => u.role === 'POSTING_MANAGER' || u.role === 'posting_manager').length,
      total: users.length,
    };
  },

  /**
   * Get analytics data
   */
  async getAnalyticsData(): Promise<{
    scriptsThisWeek: number;
    scriptsLastWeek: number;
    approvalRate: number;
    avgTimeToApproval: number;
    topWriters: { name: string; count: number }[];
    stageDistribution: { stage: string; count: number }[];
  }> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Get all analyses with user info
    const { data: analyses, error } = await supabase
      .from('viral_analyses')
      .select(`
        id, status, created_at, reviewed_at,
        profiles:user_id (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allAnalyses = (analyses || []) as any[];

    // Calculate this week's scripts
    const scriptsThisWeek = allAnalyses.filter((a: any) =>
      new Date(a.created_at) >= startOfWeek
    ).length;

    // Calculate last week's scripts
    const scriptsLastWeek = allAnalyses.filter((a: any) => {
      const date = new Date(a.created_at);
      return date >= startOfLastWeek && date < startOfWeek;
    }).length;

    // Calculate approval rate
    const reviewed = allAnalyses.filter((a: any) => a.status !== 'PENDING');
    const approved = reviewed.filter((a: any) => a.status === 'APPROVED');
    const approvalRate = reviewed.length > 0 ? Math.round((approved.length / reviewed.length) * 100) : 0;

    // Calculate average time to approval (in hours)
    const approvedWithTimes = approved.filter((a: any) => a.reviewed_at);
    let avgTimeToApproval = 0;
    if (approvedWithTimes.length > 0) {
      const totalHours = approvedWithTimes.reduce((sum: number, a: any) => {
        const created = new Date(a.created_at).getTime();
        const reviewed = new Date(a.reviewed_at).getTime();
        return sum + (reviewed - created) / (1000 * 60 * 60);
      }, 0);
      avgTimeToApproval = Math.round(totalHours / approvedWithTimes.length);
    }

    // Get top writers
    const writerCounts: Record<string, { name: string; count: number }> = {};
    allAnalyses.forEach((a: any) => {
      const name = a.profiles?.full_name || a.profiles?.email || 'Unknown';
      if (!writerCounts[name]) {
        writerCounts[name] = { name, count: 0 };
      }
      writerCounts[name].count++;
    });
    const topWriters = Object.values(writerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get stage distribution
    const { data: stageData } = await supabase
      .from('viral_analyses')
      .select('production_stage')
      .eq('status', 'APPROVED');

    const stageCounts: Record<string, number> = {};
    const stageList = (stageData || []) as { production_stage?: string }[];
    stageList.forEach((a) => {
      const stage = a.production_stage || 'PLANNING';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    const stageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
    }));

    return {
      scriptsThisWeek,
      scriptsLastWeek,
      approvalRate,
      avgTimeToApproval,
      topWriters,
      stageDistribution,
    };
  },

  /**
   * Get analyses by production stage
   */
  async getAnalysesByStage(stage: string): Promise<ViralAnalysis[]> {
    let stageFilter: string[];

    switch (stage) {
      case 'planning':
        stageFilter = ['PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED'];
        break;
      case 'shooting':
        stageFilter = ['SHOOTING'];
        break;
      case 'ready_for_edit':
        stageFilter = ['READY_FOR_EDIT', 'SHOOT_REVIEW'];
        break;
      case 'editing':
        stageFilter = ['EDITING'];
        break;
      case 'ready_to_post':
        stageFilter = ['READY_TO_POST', 'EDIT_REVIEW', 'FINAL_REVIEW'];
        break;
      case 'posted':
        stageFilter = ['POSTED'];
        break;
      default:
        stageFilter = [stage.toUpperCase()];
    }

    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        profiles:user_id (email, full_name, avatar_url),
        profile:profile_list (id, name),
        assignments:project_assignments (
          id, role,
          user:profiles!project_assignments_user_id_fkey (id, email, full_name)
        )
      `)
      .eq('status', 'APPROVED')
      .in('production_stage', stageFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const stageAnalyses = (data || []) as any[];
    return stageAnalyses.map((analysis: any) => ({
      ...analysis,
      email: analysis.profiles?.email,
      full_name: analysis.profiles?.full_name,
      avatar_url: analysis.profiles?.avatar_url,
      videographer: analysis.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: analysis.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
    })) as ViralAnalysis[];
  },

  /**
   * Reset a user's password (Admin only)
   */
  async resetUserPassword(userId: string, temporaryPassword: string): Promise<{ success: boolean }> {
    const token = auth.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ temporaryPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to reset password');
    }

    return { success: true };
  },
};
