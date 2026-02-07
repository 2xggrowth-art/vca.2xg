/**
 * Videographer Service - Videographer API
 *
 * Handles:
 * - Fetching available projects (PLANNING stage)
 * - Picking projects (assign self, move to SHOOTING)
 * - Managing my projects (SHOOTING, READY_FOR_EDIT)
 * - Marking shooting complete
 */

import { supabase, auth } from '@/lib/api';
import type { ViralAnalysis } from '@/types';

export interface VideographerStats {
  activeShoots: number;      // Currently shooting
  totalShoots: number;       // All my projects ever
  scripts: number;           // Scripts I submitted
  completed: number;         // Completed shoots
  available: number;         // Available to pick
}

export interface PickProjectData {
  analysisId: string;
  profileId?: string;
  deadline?: string;
}

export const videographerService = {
  /**
   * Get available projects in PLANNING stage
   * These are approved scripts waiting to be picked by a videographer
   */
  async getAvailableProjects(): Promise<ViralAnalysis[]> {
    // First, get IDs of projects that already have a videographer assigned
    const { data: assignedProjects } = await supabase
      .from('project_assignments')
      .select('analysis_id')
      .eq('role', 'VIDEOGRAPHER');

    const assignedList = (assignedProjects || []) as { analysis_id: string }[];
    const assignedIds = new Set(assignedList.map((a) => a.analysis_id));

    // Define valid planning stages
    const planningStages = ['PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED'];

    // Fetch approved projects
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url)
      `)
      .eq('status', 'APPROVED')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter to projects in planning stage without videographer
    const projects = (data || []) as any[];

    const availableProjects = projects.filter((project: any) => {
      // Skip if already has a videographer
      if (assignedIds.has(project.id)) return false;

      // Check production stage - must be in planning or not started
      const stage = project.production_stage;
      const isInPlanningStage = planningStages.includes(stage) || !stage;

      return isInPlanningStage;
    });

    // Get rejected projects from localStorage
    const rejectedIds = this.getRejectedProjectIds();

    return availableProjects
      .filter((p: any) => !rejectedIds.includes(p.id))
      .map((project: any) => ({
        ...project,
        email: project.profiles?.email,
        full_name: project.profiles?.full_name,
        avatar_url: project.profiles?.avatar_url,
      })) as ViralAnalysis[];
  },

  /**
   * Get my assigned projects (as videographer)
   */
  async getMyProjects(): Promise<ViralAnalysis[]> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get my assignments as videographer
    const { data: assignments, error: assignError } = await supabase
      .from('project_assignments')
      .select('analysis_id')
      .eq('user_id', user.id)
      .eq('role', 'VIDEOGRAPHER');

    if (assignError) throw assignError;
    const assignmentsList = (assignments || []) as { analysis_id: string }[];
    if (assignmentsList.length === 0) return [];

    const analysisIds = assignmentsList.map((a) => a.analysis_id);

    // Fetch the full projects
    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name),
        profiles:user_id(email, full_name, avatar_url),
        assignments:project_assignments(
          id, role,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url)
        ),
        production_files(*)
      `)
      .in('id', analysisIds)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projectList = (data || []) as any[];
    return projectList.map((project: any) => ({
      ...project,
      email: project.profiles?.email,
      full_name: project.profiles?.full_name,
      avatar_url: project.profiles?.avatar_url,
      videographer: project.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: project.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
    })) as ViralAnalysis[];
  },

  /**
   * Get scripts I submitted (analyses I created)
   */
  async getMyScripts(): Promise<ViralAnalysis[]> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        industry:industries(id, name, short_code),
        profile:profile_list(id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ViralAnalysis[];
  },

  /**
   * Get stats for dashboard
   */
  async getMyStats(): Promise<VideographerStats> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get available projects count
    const availableProjects = await this.getAvailableProjects();
    const available = availableProjects.length;

    // Get my projects (as videographer)
    const myProjects = await this.getMyProjects();

    // Active shoots = SHOOTING stage
    const activeShoots = myProjects.filter(
      (p) => p.production_stage === 'SHOOTING'
    ).length;

    // Total shoots = all my projects
    const totalShoots = myProjects.length;

    // Completed = READY_FOR_EDIT or later stages
    const completedStages = ['READY_FOR_EDIT', 'EDITING', 'READY_TO_POST', 'POSTED'];
    const completed = myProjects.filter(
      (p) => completedStages.includes(p.production_stage || '')
    ).length;

    // Get scripts I submitted (analyses I created)
    const { count: scriptsCount } = await supabase
      .from('viral_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return {
      activeShoots,
      totalShoots,
      scripts: scriptsCount || 0,
      completed,
      available,
    };
  },

  /**
   * Get a single project by ID with full details
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
          id, role,
          user:profiles!project_assignments_user_id_fkey(id, email, full_name, avatar_url)
        ),
        production_files(*)
      `)
      .eq('id', analysisId)
      .single();

    if (error) throw error;

    const analysis = data as any;
    return {
      ...analysis,
      email: analysis.profiles?.email,
      full_name: analysis.profiles?.full_name,
      avatar_url: analysis.profiles?.avatar_url,
      videographer: analysis.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: analysis.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: analysis.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    } as ViralAnalysis;
  },

  /**
   * Pick a project from the PLANNING queue
   */
  async pickProject(data: PickProjectData): Promise<ViralAnalysis> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if project is still available
    const { data: project, error: fetchError } = await supabase
      .from('viral_analyses')
      .select('id, production_stage, content_id, profile_id')
      .eq('id', data.analysisId)
      .single();

    if (fetchError) throw fetchError;

    const projectData = project as { id: string; production_stage?: string; content_id?: string; profile_id?: string };
    const planningStages = ['PLANNING', 'NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED'];
    const isInPlanningStage = planningStages.includes(projectData.production_stage || '') || !projectData.production_stage;
    if (!isInPlanningStage) {
      throw new Error('This project is no longer available');
    }

    // Check if already assigned
    const { data: existingAssignment, error: assignCheckError } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('analysis_id', data.analysisId)
      .eq('role', 'VIDEOGRAPHER')
      .maybeSingle();

    if (assignCheckError) {
      throw new Error('Failed to check project availability');
    }
    if (existingAssignment) {
      throw new Error('This project has already been picked');
    }

    // Generate content_id if profile provided and not already set
    if (data.profileId && !projectData.content_id) {
      await supabase.rpc('generate_content_id_on_approval', {
        p_analysis_id: data.analysisId,
        p_profile_id: data.profileId,
      });
    }

    // Update the analysis
    const updateData: Record<string, unknown> = {
      production_stage: 'SHOOTING',
      production_started_at: new Date().toISOString(),
    };

    if (data.profileId) {
      updateData.profile_id = data.profileId;
    }

    if (data.deadline) {
      updateData.deadline = data.deadline;
    }

    const { error: updateError } = await supabase
      .from('viral_analyses')
      .update(updateData)
      .eq('id', data.analysisId);

    if (updateError) throw updateError;

    // Assign videographer
    const { error: assignmentError } = await supabase
      .from('project_assignments')
      .insert({
        analysis_id: data.analysisId,
        user_id: user.id,
        role: 'VIDEOGRAPHER',
        assigned_by: user.id,
      });

    if (assignmentError) throw assignmentError;

    return this.getProjectById(data.analysisId);
  },

  /**
   * Mark shooting as complete - move to READY_FOR_EDIT
   */
  async markShootingComplete(analysisId: string, productionNotes?: string): Promise<ViralAnalysis> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify files exist
    const rawFileTypes = ['RAW_FOOTAGE', 'A_ROLL', 'B_ROLL', 'HOOK', 'BODY', 'CTA', 'AUDIO_CLIP', 'OTHER', 'raw-footage'];

    const { count: fileCount, error: countError } = await supabase
      .from('production_files')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_id', analysisId)
      .in('file_type', rawFileTypes)
      .eq('is_deleted', false);

    if (countError) throw new Error('Failed to verify files');
    if (!fileCount || fileCount === 0) {
      throw new Error('Please upload at least one file before marking as complete');
    }

    // Update the analysis
    const updateData: Record<string, unknown> = {
      production_stage: 'READY_FOR_EDIT',
    };

    if (productionNotes) {
      // Get current notes and append instead of overwriting
      const { data: currentProject } = await supabase
        .from('viral_analyses')
        .select('production_notes')
        .eq('id', analysisId)
        .single();

      const projectInfo = currentProject as { production_notes?: string } | null;
      const existingNotes = projectInfo?.production_notes || '';
      updateData.production_notes = existingNotes
        ? `${existingNotes}\n\n[Videographer Notes]\n${productionNotes}`
        : `[Videographer Notes]\n${productionNotes}`;
    }

    const { error: updateError } = await supabase
      .from('viral_analyses')
      .update(updateData)
      .eq('id', analysisId);

    if (updateError) throw updateError;

    return this.getProjectById(analysisId);
  },

  /**
   * Get content profiles list
   */
  async getProfiles(): Promise<{ id: string; name: string; is_active?: boolean }[]> {
    const { data, error } = await supabase
      .from('profile_list')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as { id: string; name: string; is_active?: boolean }[];
  },

  /**
   * Create a new content profile
   */
  async createProfile(name: string): Promise<{ id: string; name: string }> {
    const { data, error } = await supabase
      .from('profile_list')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data as { id: string; name: string };
  },

  /**
   * Delete a content profile (soft delete - sets is_active to false)
   */
  async deleteProfile(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('profile_list')
      .update({ is_active: false })
      .eq('id', profileId);

    if (error) throw error;
  },

  /**
   * Reject a project - hides it from available list (stored in localStorage)
   */
  getRejectedProjectIds(): string[] {
    try {
      const raw = localStorage.getItem('videographer_rejected_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  rejectProject(analysisId: string): void {
    const rejected = this.getRejectedProjectIds();
    if (!rejected.includes(analysisId)) {
      rejected.push(analysisId);
      localStorage.setItem('videographer_rejected_projects', JSON.stringify(rejected));
    }
  },

  unrejectProject(analysisId: string): void {
    const rejected = this.getRejectedProjectIds().filter(id => id !== analysisId);
    localStorage.setItem('videographer_rejected_projects', JSON.stringify(rejected));
  },
};
