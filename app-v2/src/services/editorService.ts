/**
 * Editor Service - Editor API
 *
 * Handles:
 * - Fetching available projects (READY_FOR_EDIT stage with raw files)
 * - Picking projects (assign self, move to EDITING)
 * - Managing my projects (EDITING, READY_TO_POST)
 * - Marking editing complete
 */

import { supabase, auth } from '@/lib/api';
import type { ViralAnalysis } from '@/types';

export interface EditorStats {
  inProgress: number;
  available: number;
  completed: number;
}

export interface PickEditProjectData {
  analysisId: string;
}

export interface MarkEditingCompleteData {
  analysisId: string;
  productionNotes?: string;
}

// Raw file types that indicate footage is ready for editing
const RAW_FILE_TYPES = ['RAW_FOOTAGE', 'A_ROLL', 'B_ROLL', 'HOOK', 'BODY', 'CTA', 'AUDIO_CLIP', 'OTHER', 'raw-footage'];

// Edited file types that indicate editing is complete
const EDITED_FILE_TYPES = ['EDITED_VIDEO', 'FINAL_VIDEO', 'edited-video', 'final-video'];

export const editorService = {
  /**
   * Get available projects in READY_FOR_EDIT stage
   * Only includes projects that have raw footage and no editor assigned
   */
  async getAvailableProjects(): Promise<ViralAnalysis[]> {
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
      .eq('status', 'APPROVED')
      .eq('production_stage', 'READY_FOR_EDIT')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Filter: Only projects without an editor AND with raw footage
    const projects = (data || []) as any[];
    const availableProjects = projects.filter((project: any) => {
      // Check if already has editor
      const hasEditor = project.assignments?.some(
        (a: any) => a.role === 'EDITOR'
      );
      if (hasEditor) return false;

      // Check if has raw footage files
      const hasRawFiles = project.production_files?.some(
        (f: any) => RAW_FILE_TYPES.includes(f.file_type) && !f.is_deleted
      );
      return hasRawFiles;
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
        videographer: project.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      })) as ViralAnalysis[];
  },

  /**
   * Get my assigned projects (as editor)
   */
  async getMyProjects(): Promise<ViralAnalysis[]> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get my assignments as editor
    const { data: assignments, error: assignError } = await supabase
      .from('project_assignments')
      .select('analysis_id')
      .eq('user_id', user.id)
      .eq('role', 'EDITOR');

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
      posting_manager: project.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    })) as ViralAnalysis[];
  },

  /**
   * Get stats for dashboard
   */
  async getMyStats(): Promise<EditorStats> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get available projects count
    const availableProjects = await this.getAvailableProjects();
    const available = availableProjects.length;

    // Get my projects
    const myProjects = await this.getMyProjects();

    // In progress = EDITING stage
    const inProgress = myProjects.filter(
      (p) => p.production_stage === 'EDITING'
    ).length;

    // Completed = READY_TO_POST or POSTED stages
    const completedStages = ['READY_TO_POST', 'POSTED'];
    const completed = myProjects.filter(
      (p) => completedStages.includes(p.production_stage || '')
    ).length;

    return { inProgress, available, completed };
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
   * Pick a project from the READY_FOR_EDIT queue
   */
  async pickProject(data: PickEditProjectData): Promise<ViralAnalysis> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if project is still available
    const { data: project, error: fetchError } = await supabase
      .from('viral_analyses')
      .select('id, production_stage')
      .eq('id', data.analysisId)
      .single();

    if (fetchError) throw fetchError;

    const projectData = project as { id: string; production_stage?: string };
    if (projectData.production_stage !== 'READY_FOR_EDIT') {
      throw new Error('This project is no longer available for editing');
    }

    // Check if already assigned to an editor
    const { data: existingAssignment, error: assignCheckError } = await supabase
      .from('project_assignments')
      .select('id')
      .eq('analysis_id', data.analysisId)
      .eq('role', 'EDITOR')
      .maybeSingle();

    if (assignCheckError) {
      throw new Error('Failed to check project availability');
    }
    if (existingAssignment) {
      throw new Error('This project has already been picked by another editor');
    }

    // Verify raw footage exists
    const { count: rawFilesCount } = await supabase
      .from('production_files')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_id', data.analysisId)
      .in('file_type', RAW_FILE_TYPES)
      .eq('is_deleted', false);

    if (!rawFilesCount || rawFilesCount === 0) {
      throw new Error('This project has no raw footage files');
    }

    // Update the analysis to EDITING stage
    const { error: updateError } = await supabase
      .from('viral_analyses')
      .update({
        production_stage: 'EDITING',
      })
      .eq('id', data.analysisId);

    if (updateError) throw updateError;

    // Assign editor to the project
    const { error: assignmentError } = await supabase
      .from('project_assignments')
      .insert({
        analysis_id: data.analysisId,
        user_id: user.id,
        role: 'EDITOR',
        assigned_by: user.id,
      });

    if (assignmentError) throw assignmentError;

    return this.getProjectById(data.analysisId);
  },

  /**
   * Mark editing as complete - move to READY_TO_POST
   */
  async markEditingComplete(data: MarkEditingCompleteData): Promise<ViralAnalysis> {
    const { data: { user } } = await auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify edited files exist
    const { count: editedCount, error: countError } = await supabase
      .from('production_files')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_id', data.analysisId)
      .in('file_type', EDITED_FILE_TYPES)
      .eq('is_deleted', false);

    if (countError) throw new Error('Failed to verify files');
    if (!editedCount || editedCount === 0) {
      throw new Error('Please upload at least one edited video before marking as complete');
    }

    // Update the analysis
    const updateData: Record<string, unknown> = {
      production_stage: 'READY_TO_POST',
    };

    if (data.productionNotes) {
      // Get current notes and append
      const { data: currentProject } = await supabase
        .from('viral_analyses')
        .select('production_notes')
        .eq('id', data.analysisId)
        .single();

      const projectInfo = currentProject as { production_notes?: string } | null;
      const existingNotes = projectInfo?.production_notes || '';
      updateData.production_notes = existingNotes
        ? `${existingNotes}\n\n[Editor Notes]\n${data.productionNotes}`
        : `[Editor Notes]\n${data.productionNotes}`;
    }

    const { error: updateError } = await supabase
      .from('viral_analyses')
      .update(updateData)
      .eq('id', data.analysisId);

    if (updateError) throw updateError;

    return this.getProjectById(data.analysisId);
  },

  /**
   * Get raw footage files for a project (for preview in editor)
   */
  async getRawFootageFiles(analysisId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('production_files')
      .select('*')
      .eq('analysis_id', analysisId)
      .in('file_type', RAW_FILE_TYPES)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as any[];
  },

  /**
   * Get edited files for a project
   */
  async getEditedFiles(analysisId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('production_files')
      .select('*')
      .eq('analysis_id', analysisId)
      .in('file_type', EDITED_FILE_TYPES)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as any[];
  },

  /**
   * Reject a project - hides it from available list (stored in localStorage)
   */
  getRejectedProjectIds(): string[] {
    try {
      const raw = localStorage.getItem('editor_rejected_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  rejectProject(analysisId: string): void {
    const rejected = this.getRejectedProjectIds();
    if (!rejected.includes(analysisId)) {
      rejected.push(analysisId);
      localStorage.setItem('editor_rejected_projects', JSON.stringify(rejected));
    }
  },

  unrejectProject(analysisId: string): void {
    const rejected = this.getRejectedProjectIds().filter(id => id !== analysisId);
    localStorage.setItem('editor_rejected_projects', JSON.stringify(rejected));
  },
};
