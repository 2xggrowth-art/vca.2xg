import { supabase } from '@/lib/supabase';
import type { Industry, HookTag, ProfileListItem, CharacterTag } from '@/types';

export const contentConfigService = {
  // =============== INDUSTRIES ===============
  async getAllIndustries(): Promise<Industry[]> {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createIndustry(industry: {
    name: string;
    short_code: string;
    description?: string;
  }): Promise<Industry> {
    const { data, error } = await supabase
      .from('industries')
      .insert(industry)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateIndustry(
    id: string,
    updates: Partial<Pick<Industry, 'name' | 'short_code' | 'description' | 'is_active'>>
  ): Promise<Industry> {
    const { data, error } = await supabase
      .from('industries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteIndustry(id: string): Promise<void> {
    const { error } = await supabase
      .from('industries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =============== HOOK TAGS ===============
  async getAllHookTags(): Promise<HookTag[]> {
    const { data, error } = await supabase
      .from('hook_tags')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createHookTag(tag: {
    name: string;
    description?: string;
  }): Promise<HookTag> {
    const { data, error } = await supabase
      .from('hook_tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHookTag(
    id: string,
    updates: Partial<Pick<HookTag, 'name' | 'description' | 'is_active'>>
  ): Promise<HookTag> {
    const { data, error } = await supabase
      .from('hook_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHookTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('hook_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =============== PROFILE LIST ===============
  async getAllProfiles(): Promise<ProfileListItem[]> {
    const { data, error } = await supabase
      .from('profile_list')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createProfile(profile: {
    name: string;
    description?: string;
  }): Promise<ProfileListItem> {
    const { data, error } = await supabase
      .from('profile_list')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(
    id: string,
    updates: Partial<Pick<ProfileListItem, 'name' | 'description' | 'is_active'>>
  ): Promise<ProfileListItem> {
    const { data, error } = await supabase
      .from('profile_list')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProfile(id: string): Promise<void> {
    // Soft delete - set is_active to false instead of hard delete
    // This avoids foreign key constraint violations when profiles are in use
    const { error } = await supabase
      .from('profile_list')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  // =============== CHARACTER TAGS ===============
  async getAllCharacterTags(): Promise<CharacterTag[]> {
    const { data, error } = await supabase
      .from('character_tags')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createCharacterTag(tag: {
    name: string;
    description?: string;
  }): Promise<CharacterTag> {
    const { data, error} = await supabase
      .from('character_tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCharacterTag(
    id: string,
    updates: Partial<Pick<CharacterTag, 'name' | 'description' | 'is_active'>>
  ): Promise<CharacterTag> {
    const { data, error } = await supabase
      .from('character_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCharacterTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('character_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =============== ANALYSIS TAG ASSOCIATIONS ===============
  async setAnalysisHookTags(analysisId: string, tagIds: string[]): Promise<void> {
    // First, remove all existing associations
    await supabase
      .from('analysis_hook_tags')
      .delete()
      .eq('analysis_id', analysisId);

    // Then add new associations
    if (tagIds.length > 0) {
      const associations = tagIds.map(tagId => ({
        analysis_id: analysisId,
        hook_tag_id: tagId,
      }));

      const { error } = await supabase
        .from('analysis_hook_tags')
        .insert(associations);

      if (error) throw error;
    }
  },

  async setAnalysisCharacterTags(analysisId: string, tagIds: string[]): Promise<void> {
    // First, remove all existing associations
    await supabase
      .from('analysis_character_tags')
      .delete()
      .eq('analysis_id', analysisId);

    // Then add new associations
    if (tagIds.length > 0) {
      const associations = tagIds.map(tagId => ({
        analysis_id: analysisId,
        character_tag_id: tagId,
      }));

      const { error } = await supabase
        .from('analysis_character_tags')
        .insert(associations);

      if (error) throw error;
    }
  },

  async getAnalysisHookTags(analysisId: string): Promise<HookTag[]> {
    const { data, error } = await supabase
      .from('analysis_hook_tags')
      .select(`
        hook_tag:hook_tags (*)
      `)
      .eq('analysis_id', analysisId);

    if (error) throw error;
    return (data || []).map((item: any) => item.hook_tag).filter(Boolean);
  },

  async getAnalysisCharacterTags(analysisId: string): Promise<CharacterTag[]> {
    const { data, error } = await supabase
      .from('analysis_character_tags')
      .select(`
        character_tag:character_tags (*)
      `)
      .eq('analysis_id', analysisId);

    if (error) throw error;
    return (data || []).map((item: any) => item.character_tag).filter(Boolean);
  },
};
