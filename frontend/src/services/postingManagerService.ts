/**
 * Posting Manager Service - Workflow v2.0
 *
 * Handles:
 * - Fetching projects ready to post
 * - Setting posting details (platform, caption, heading, hashtags)
 * - Marking projects as posted with live URL
 * - Calendar/schedule management
 */

import { supabase } from '@/lib/supabase';
import type {
  ViralAnalysis,
  SetPostingDetailsData,
  MarkAsPostedData,
} from '@/types';

export const postingManagerService = {
  /**
   * Get projects ready to post (READY_TO_POST stage)
   */
  async getReadyToPostProjects(): Promise<ViralAnalysis[]> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url),
        assignments:project_assignments(
          *,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url, role)
        ),
        production_files(*)
      `)
      .eq('status', 'APPROVED')
      .eq('production_stage', 'READY_TO_POST')
      .order('scheduled_post_time', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('deadline', { ascending: true });

    if (error) throw error;

    return (data || []).map((project: any) => ({
      ...project,
      email: project.profiles?.email,
      full_name: project.profiles?.full_name,
      avatar_url: project.profiles?.avatar_url,
      videographer: project.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: project.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: project.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    }));
  },

  /**
   * Get scheduled posts for calendar view
   * Includes both READY_TO_POST (scheduled) and POSTED
   */
  async getScheduledPosts(startDate?: string, endDate?: string): Promise<ViralAnalysis[]> {
    let query = supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url),
        assignments:project_assignments(
          *,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url, role)
        )
      `)
      .eq('status', 'APPROVED')
      .in('production_stage', ['READY_TO_POST', 'POSTED'])
      .not('scheduled_post_time', 'is', null);

    if (startDate) {
      query = query.gte('scheduled_post_time', startDate);
    }
    if (endDate) {
      query = query.lte('scheduled_post_time', endDate);
    }

    const { data, error } = await query.order('scheduled_post_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((project: any) => ({
      ...project,
      email: project.profiles?.email,
      full_name: project.profiles?.full_name,
      avatar_url: project.profiles?.avatar_url,
      videographer: project.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: project.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: project.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    }));
  },

  /**
   * Set posting details (platform, caption, heading, hashtags, schedule)
   */
  async setPostingDetails(data: SetPostingDetailsData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate required fields
    if (!data.postingPlatform) {
      throw new Error('Platform selection is required');
    }
    if (!data.postingCaption) {
      throw new Error('Caption is required');
    }

    // YouTube and TikTok require heading
    const requiresHeading = ['YOUTUBE_SHORTS', 'YOUTUBE_VIDEO', 'TIKTOK'].includes(data.postingPlatform);
    if (requiresHeading && !data.postingHeading) {
      throw new Error('Heading/title is required for YouTube and TikTok posts');
    }

    const updateData: any = {
      posting_platform: data.postingPlatform,
      posting_caption: data.postingCaption,
    };

    if (data.postingHeading) {
      updateData.posting_heading = data.postingHeading;
    }
    if (data.postingHashtags && data.postingHashtags.length > 0) {
      updateData.posting_hashtags = data.postingHashtags;
    }
    if (data.scheduledPostTime) {
      updateData.scheduled_post_time = data.scheduledPostTime;
    }

    const { error } = await supabase
      .from('viral_analyses')
      .update(updateData)
      .eq('id', data.analysisId);

    if (error) throw error;

    // Assign posting manager if not already assigned
    const { data: existingAssignment } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('analysis_id', data.analysisId)
      .eq('role', 'POSTING_MANAGER')
      .single();

    if (!existingAssignment) {
      await supabase.from('project_assignments').insert({
        analysis_id: data.analysisId,
        user_id: user.id,
        role: 'POSTING_MANAGER',
        assigned_by: user.id,
      });
    }

    return this.getProjectById(data.analysisId);
  },

  /**
   * Schedule a post for a specific date/time
   */
  async schedulePost(analysisId: string, scheduledTime: string): Promise<ViralAnalysis> {
    const { error } = await supabase
      .from('viral_analyses')
      .update({
        scheduled_post_time: scheduledTime,
      })
      .eq('id', analysisId);

    if (error) throw error;

    return this.getProjectById(analysisId);
  },

  /**
   * Mark project as posted with the live URL
   * If keepInQueue is true, clears posting details for next platform while keeping project in queue
   */
  async markAsPosted(data: MarkAsPostedData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate posted URL
    if (!data.postedUrl) {
      throw new Error('Posted URL is required');
    }

    // Basic URL validation
    try {
      new URL(data.postedUrl);
    } catch {
      throw new Error('Please enter a valid URL');
    }

    if (data.keepInQueue) {
      // Keep project in queue for posting to more platforms
      // Store this post URL in posted_urls array and clear posting details
      const { data: currentProject } = await supabase
        .from('viral_analyses')
        .select('posted_urls')
        .eq('id', data.analysisId)
        .single();

      // Append to posted_urls array (JSONB field tracking all platform posts)
      const existingUrls = currentProject?.posted_urls || [];
      const newPost = {
        url: data.postedUrl,
        posted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('viral_analyses')
        .update({
          // Keep production_stage as READY_TO_POST
          posted_urls: [...existingUrls, newPost],
          // Clear posting details for next platform setup
          posting_platform: null,
          posting_caption: null,
          posting_heading: null,
          posting_hashtags: null,
          scheduled_post_time: null,
        })
        .eq('id', data.analysisId);

      if (error) throw error;
    } else {
      // Final post - move to POSTED stage
      const { error } = await supabase
        .from('viral_analyses')
        .update({
          production_stage: 'POSTED',
          posted_url: data.postedUrl,
          posted_at: new Date().toISOString(),
          production_completed_at: new Date().toISOString(),
        })
        .eq('id', data.analysisId);

      if (error) throw error;
    }

    return this.getProjectById(data.analysisId);
  },

  /**
   * Get posted projects for tracking/analytics
   */
  async getPostedProjects(limit: number = 50): Promise<ViralAnalysis[]> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url),
        assignments:project_assignments(
          *,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url, role)
        )
      `)
      .eq('status', 'APPROVED')
      .eq('production_stage', 'POSTED')
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((project: any) => ({
      ...project,
      email: project.profiles?.email,
      full_name: project.profiles?.full_name,
      avatar_url: project.profiles?.avatar_url,
      videographer: project.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: project.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: project.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    }));
  },

  /**
   * Get posting stats for dashboard
   */
  async getPostingStats(): Promise<{
    readyToPost: number;
    scheduledToday: number;
    postedThisWeek: number;
    postedThisMonth: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Ready to post count
    const { count: readyToPost } = await supabase
      .from('viral_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'APPROVED')
      .eq('production_stage', 'READY_TO_POST');

    // Scheduled for today
    const { count: scheduledToday } = await supabase
      .from('viral_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'APPROVED')
      .eq('production_stage', 'READY_TO_POST')
      .gte('scheduled_post_time', startOfDay)
      .lt('scheduled_post_time', endOfDay);

    // Posted this week
    const { count: postedThisWeek } = await supabase
      .from('viral_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('production_stage', 'POSTED')
      .gte('posted_at', startOfWeek);

    // Posted this month
    const { count: postedThisMonth } = await supabase
      .from('viral_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('production_stage', 'POSTED')
      .gte('posted_at', startOfMonth);

    return {
      readyToPost: readyToPost || 0,
      scheduledToday: scheduledToday || 0,
      postedThisWeek: postedThisWeek || 0,
      postedThisMonth: postedThisMonth || 0,
    };
  },

  /**
   * Get a single project by ID
   */
  async getProjectById(analysisId: string): Promise<ViralAnalysis> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url),
        assignments:project_assignments(
          *,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url, role)
        ),
        production_files(*)
      `)
      .eq('id', analysisId)
      .single();

    if (error) throw error;

    return {
      ...data,
      email: data.profiles?.email,
      full_name: data.profiles?.full_name,
      avatar_url: data.profiles?.avatar_url,
      videographer: data.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: data.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: data.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    };
  },

  /**
   * Get edited video files for a project (for preview before posting)
   */
  async getEditedVideoFiles(analysisId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('production_files')
      .select(`
        *,
        uploader:profiles!production_files_uploaded_by_fkey(id, email, full_name, avatar_url)
      `)
      .eq('analysis_id', analysisId)
      .in('file_type', ['EDITED_VIDEO', 'FINAL_VIDEO'])
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
