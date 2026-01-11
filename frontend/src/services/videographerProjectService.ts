import { supabase } from '@/lib/supabase';
import type { ViralAnalysis } from '@/types';

export interface CreateVideographerProjectData {
  title: string; // This will be the hook
  reference_url: string;
  description?: string;
  estimated_shoot_date?: string;
  people_required?: number;
}

export const videographerProjectService = {
  /**
   * Create a new viral analysis entry for videographer-initiated projects
   */
  async createProject(data: CreateVideographerProjectData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create viral_analysis entry with SHOOTING stage
    const { data: analysis, error } = await supabase
      .from('viral_analyses')
      .insert({
        user_id: user.id,
        reference_url: data.reference_url,
        hook: data.title,
        how_to_replicate: data.description || 'Videographer-initiated project',
        target_emotion: 'N/A',
        expected_outcome: 'N/A',
        status: 'APPROVED', // Auto-approve videographer projects
        production_stage: 'SHOOTING',
        priority: 'NORMAL',
        total_people_involved: data.people_required || 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Assign videographer to the project
    const { error: assignmentError } = await supabase
      .from('project_assignments')
      .insert({
        analysis_id: analysis.id,
        user_id: user.id,
        role: 'VIDEOGRAPHER',
        assigned_by: user.id,
      });

    if (assignmentError) {
      console.error('Failed to create assignment:', assignmentError);
      // Don't throw - the project was created successfully
    }

    // Fetch the full analysis with assignments populated
    const { data: fullAnalysis, error: fetchError } = await supabase
      .from('viral_analyses')
      .select(`
        *,
        profiles:user_id (email, full_name, avatar_url),
        assignments:project_assignments (
          *,
          user:profiles!project_assignments_user_id_fkey (id, email, full_name, avatar_url, role)
        )
      `)
      .eq('id', analysis.id)
      .single();

    if (fetchError) throw fetchError;

    // Transform assignments into specific roles
    const result: ViralAnalysis = {
      ...fullAnalysis,
      email: fullAnalysis.profiles?.email,
      full_name: fullAnalysis.profiles?.full_name,
      avatar_url: fullAnalysis.profiles?.avatar_url,
      videographer: fullAnalysis.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      editor: fullAnalysis.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      posting_manager: fullAnalysis.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
    };

    return result;
  },
};
