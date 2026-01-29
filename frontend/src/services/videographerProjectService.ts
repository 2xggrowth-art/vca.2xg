import { supabase } from '@/lib/supabase';
import type { ViralAnalysis } from '@/types';

export interface CreateVideographerProjectData {
  referenceUrl: string;
  title: string;
  shootType?: string;
  creatorName?: string;
  hookTypes?: string[];
  worksWithoutAudio?: string;
  profileId: string;
}

export const videographerProjectService = {
  /**
   * Create a new viral analysis entry for videographer-initiated projects
   * Includes all production details and generates proper content_id
   */
  async createProject(data: CreateVideographerProjectData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get BCH industry ID (default industry)
    const { data: bchIndustry } = await supabase
      .from('industries')
      .select('id')
      .eq('short_code', 'BCH')
      .single();

    if (!bchIndustry) {
      throw new Error('BCH industry not found');
    }

    // Create viral_analysis entry with SHOOTING stage
    const { data: analysis, error } = await supabase
      .from('viral_analyses')
      .insert({
        user_id: user.id,
        reference_url: data.referenceUrl,
        title: data.title,
        shoot_type: data.shootType || null,
        creator_name: data.creatorName || null,
        works_without_audio: data.worksWithoutAudio || null,
        status: 'APPROVED', // Auto-approve videographer projects
        production_stage: 'SHOOTING',
        priority: 'NORMAL',
        industry_id: bchIndustry.id,
        profile_id: data.profileId,
        production_started_at: new Date().toISOString(),
        // Required fields with defaults for videographer-initiated projects
        target_emotion: 'Not specified',
        expected_outcome: 'Not specified',
      })
      .select()
      .single();

    if (error) throw error;

    // Generate content_id using the RPC function
    const { data: contentIdResult, error: contentIdError } = await supabase.rpc(
      'generate_content_id_on_approval',
      {
        p_analysis_id: analysis.id,
        p_profile_id: data.profileId,
      }
    );

    if (contentIdError) {
      console.error('Failed to generate content_id:', contentIdError);
      // Don't throw - the project was created successfully
    } else {
      console.log('Generated content_id:', contentIdResult);
    }

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

    // Store hook types as comma-separated string in hook field (for filtering/display)
    if (data.hookTypes && data.hookTypes.length > 0) {
      await supabase
        .from('viral_analyses')
        .update({ hook: data.hookTypes.join(', ') })
        .eq('id', analysis.id);
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
