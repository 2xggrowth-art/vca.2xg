import { supabase } from '@/lib/supabase';
import type { ViralAnalysis, AnalysisFormData } from '@/types';

export const analysesService = {
  // Get all analyses for current user
  async getMyAnalyses(): Promise<ViralAnalysis[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('viral_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single analysis
  async getAnalysis(id: string): Promise<ViralAnalysis> {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Upload voice note to Supabase Storage
  async uploadVoiceNote(userId: string, blob: Blob, section: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${userId}/${section}_${timestamp}.webm`;

    const { error } = await supabase.storage
      .from('voice-notes')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('voice-notes')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // Upload audio file (for "our idea" audio)
  async uploadAudio(userId: string, blob: Blob, prefix: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${userId}/${prefix}_${timestamp}.webm`;

    const { error } = await supabase.storage
      .from('voice-notes')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('voice-notes')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // Create new analysis
  async createAnalysis(formData: AnalysisFormData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upload all voice notes and audio recordings
    let hookVoiceUrl = '';
    let whyViralVoiceUrl = '';
    let howToReplicateVoiceUrl = '';
    let ourIdeaAudioUrl = '';
    let stopFeelAudioUrl = '';
    let immediateUnderstandingAudioUrl = '';
    let hookCarrierAudioUrl = '';
    let hookWithoutAudioRecordingUrl = '';
    let audioAloneStopsScrollRecordingUrl = '';
    let dominantEmotionFirst6AudioUrl = '';
    let understandingBySecond6AudioUrl = '';

    // Original voice notes
    if (formData.hookVoiceNote) {
      hookVoiceUrl = await this.uploadVoiceNote(user.id, formData.hookVoiceNote, 'hook');
    }
    if (formData.whyViralVoiceNote) {
      whyViralVoiceUrl = await this.uploadVoiceNote(user.id, formData.whyViralVoiceNote, 'why_viral');
    }
    if (formData.howToReplicateVoiceNote) {
      howToReplicateVoiceUrl = await this.uploadVoiceNote(user.id, formData.howToReplicateVoiceNote, 'how_to_replicate');
    }

    // Level 3 production planning audio
    if (formData.ourIdeaAudio) {
      ourIdeaAudioUrl = await this.uploadAudio(user.id, formData.ourIdeaAudio, 'our_idea');
    }

    // Level 3 hook study audio recordings
    if (formData.stopFeelAudio) {
      stopFeelAudioUrl = await this.uploadAudio(user.id, formData.stopFeelAudio, 'stop_feel');
    }
    if (formData.immediateUnderstandingAudio) {
      immediateUnderstandingAudioUrl = await this.uploadAudio(user.id, formData.immediateUnderstandingAudio, 'immediate_understanding');
    }
    if (formData.hookCarrierAudio) {
      hookCarrierAudioUrl = await this.uploadAudio(user.id, formData.hookCarrierAudio, 'hook_carrier');
    }
    if (formData.hookWithoutAudioRecording) {
      hookWithoutAudioRecordingUrl = await this.uploadAudio(user.id, formData.hookWithoutAudioRecording, 'hook_without_audio');
    }
    if (formData.audioAloneStopsScrollRecording) {
      audioAloneStopsScrollRecordingUrl = await this.uploadAudio(user.id, formData.audioAloneStopsScrollRecording, 'audio_alone_stops_scroll');
    }
    if (formData.dominantEmotionFirst6Audio) {
      dominantEmotionFirst6AudioUrl = await this.uploadAudio(user.id, formData.dominantEmotionFirst6Audio, 'dominant_emotion_first_6');
    }
    if (formData.understandingBySecond6Audio) {
      understandingBySecond6AudioUrl = await this.uploadAudio(user.id, formData.understandingBySecond6Audio, 'understanding_by_second_6');
    }

    const { data, error } = await supabase
      .from('viral_analyses')
      .insert({
        user_id: user.id,
        // Original fields
        reference_url: formData.referenceUrl,
        hook: formData.hook || '',
        hook_voice_note_url: hookVoiceUrl,
        why_viral: formData.whyViral || '',
        why_viral_voice_note_url: whyViralVoiceUrl,
        how_to_replicate: formData.howToReplicate || '',
        how_to_replicate_voice_note_url: howToReplicateVoiceUrl,
        target_emotion: formData.targetEmotion || 'Not specified',
        expected_outcome: formData.expectedOutcome || 'Not specified',

        // Level 1: Basic Info (9 fields)
        platform: formData.platform || null,
        content_type: formData.contentType || null,
        shoot_type: formData.shootType || null,
        characters_involved: formData.charactersInvolved || null,
        creator_name: formData.creatorName || null,
        unusual_element: formData.unusualElement || null,
        works_without_audio: formData.worksWithoutAudio || null,
        content_rating: formData.contentRating || null,
        replication_strength: formData.replicationStrength || null,

        // Level 2: Emotional & Physical Reactions (9 fields)
        body_reactions: formData.bodyReactions || [],
        emotion_first_6_sec: formData.emotionFirst6Sec || null,
        challenged_belief: formData.challengedBelief || null,
        emotional_identity_impact: formData.emotionalIdentityImpact || [],
        if_he_can_why_cant_you: formData.ifHeCanWhyCantYou || null,
        feel_like_commenting: formData.feelLikeCommenting || null,
        read_comments: formData.readComments || null,
        sharing_number: formData.sharingNumber || null,
        video_action: formData.videoAction || null,

        // Level 2: Production Details (6 fields)
        industry_id: formData.industryId || null,
        profile_id: formData.profileId || null,
        total_people_involved: formData.totalPeopleInvolved || null,
        shoot_possibility: formData.shootPossibility || null,

        // Level 3: Hook Study & Analysis (21 fields)
        stop_feel: formData.stopFeel || null,
        stop_feel_explanation: formData.stopFeelExplanation || null,
        stop_feel_audio_url: stopFeelAudioUrl || null,
        immediate_understanding: formData.immediateUnderstanding || null,
        immediate_understanding_audio_url: immediateUnderstandingAudioUrl || null,
        hook_carrier: formData.hookCarrier || null,
        hook_carrier_audio_url: hookCarrierAudioUrl || null,
        hook_without_audio: formData.hookWithoutAudio || null,
        hook_without_audio_recording_url: hookWithoutAudioRecordingUrl || null,
        audio_alone_stops_scroll: formData.audioAloneStopsScroll || null,
        audio_alone_stops_scroll_recording_url: audioAloneStopsScrollRecordingUrl || null,
        dominant_emotion_first_6: formData.dominantEmotionFirst6 || null,
        dominant_emotion_first_6_audio_url: dominantEmotionFirst6AudioUrl || null,
        understanding_by_second_6: formData.understandingBySecond6 || null,
        understanding_by_second_6_audio_url: understandingBySecond6AudioUrl || null,
        content_rating_level_3: formData.contentRatingLevel3 || null,

        // Level 3: Production Planning (6 fields)
        on_screen_text_hook: formData.onScreenTextHook || null,
        our_idea_audio_url: ourIdeaAudioUrl || null,
        shoot_location: formData.shootLocation || null,
        planning_date: formData.planningDate || null,
        additional_requirements: formData.additionalRequirements || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Set the tag associations
    const { contentConfigService } = await import('./contentConfigService');

    if (formData.hookTagIds && formData.hookTagIds.length > 0) {
      await contentConfigService.setAnalysisHookTags(data.id, formData.hookTagIds);
    }

    if (formData.characterTagIds && formData.characterTagIds.length > 0) {
      await contentConfigService.setAnalysisCharacterTags(data.id, formData.characterTagIds);
    }

    return data;
  },

  // Update analysis
  async updateAnalysis(id: string, formData: AnalysisFormData): Promise<ViralAnalysis> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upload new audio files if present, otherwise keep existing URLs
    let hookVoiceUrl = formData.hookVoiceNoteUrl;
    let whyViralVoiceUrl = formData.whyViralVoiceNoteUrl;
    let howToReplicateVoiceUrl = formData.howToReplicateVoiceNoteUrl;
    let ourIdeaAudioUrl = formData.ourIdeaAudioUrl;
    let stopFeelAudioUrl = formData.stopFeelAudioUrl;
    let immediateUnderstandingAudioUrl = formData.immediateUnderstandingAudioUrl;
    let hookCarrierAudioUrl = formData.hookCarrierAudioUrl;
    let hookWithoutAudioRecordingUrl = formData.hookWithoutAudioRecordingUrl;
    let audioAloneStopsScrollRecordingUrl = formData.audioAloneStopsScrollRecordingUrl;
    let dominantEmotionFirst6AudioUrl = formData.dominantEmotionFirst6AudioUrl;
    let understandingBySecond6AudioUrl = formData.understandingBySecond6AudioUrl;

    // Original voice notes
    if (formData.hookVoiceNote) {
      hookVoiceUrl = await this.uploadVoiceNote(user.id, formData.hookVoiceNote, 'hook');
    }
    if (formData.whyViralVoiceNote) {
      whyViralVoiceUrl = await this.uploadVoiceNote(user.id, formData.whyViralVoiceNote, 'why_viral');
    }
    if (formData.howToReplicateVoiceNote) {
      howToReplicateVoiceUrl = await this.uploadVoiceNote(user.id, formData.howToReplicateVoiceNote, 'how_to_replicate');
    }

    // Level 3 production planning audio
    if (formData.ourIdeaAudio) {
      ourIdeaAudioUrl = await this.uploadAudio(user.id, formData.ourIdeaAudio, 'our_idea');
    }

    // Level 3 hook study audio recordings
    if (formData.stopFeelAudio) {
      stopFeelAudioUrl = await this.uploadAudio(user.id, formData.stopFeelAudio, 'stop_feel');
    }
    if (formData.immediateUnderstandingAudio) {
      immediateUnderstandingAudioUrl = await this.uploadAudio(user.id, formData.immediateUnderstandingAudio, 'immediate_understanding');
    }
    if (formData.hookCarrierAudio) {
      hookCarrierAudioUrl = await this.uploadAudio(user.id, formData.hookCarrierAudio, 'hook_carrier');
    }
    if (formData.hookWithoutAudioRecording) {
      hookWithoutAudioRecordingUrl = await this.uploadAudio(user.id, formData.hookWithoutAudioRecording, 'hook_without_audio');
    }
    if (formData.audioAloneStopsScrollRecording) {
      audioAloneStopsScrollRecordingUrl = await this.uploadAudio(user.id, formData.audioAloneStopsScrollRecording, 'audio_alone_stops_scroll');
    }
    if (formData.dominantEmotionFirst6Audio) {
      dominantEmotionFirst6AudioUrl = await this.uploadAudio(user.id, formData.dominantEmotionFirst6Audio, 'dominant_emotion_first_6');
    }
    if (formData.understandingBySecond6Audio) {
      understandingBySecond6AudioUrl = await this.uploadAudio(user.id, formData.understandingBySecond6Audio, 'understanding_by_second_6');
    }

    const { data, error } = await supabase
      .from('viral_analyses')
      .update({
        // Original fields
        reference_url: formData.referenceUrl,
        hook: formData.hook || '',
        hook_voice_note_url: hookVoiceUrl,
        why_viral: formData.whyViral || '',
        why_viral_voice_note_url: whyViralVoiceUrl,
        how_to_replicate: formData.howToReplicate || '',
        how_to_replicate_voice_note_url: howToReplicateVoiceUrl,
        target_emotion: formData.targetEmotion || 'Not specified',
        expected_outcome: formData.expectedOutcome || 'Not specified',

        // Level 1: Basic Info (9 fields)
        platform: formData.platform || null,
        content_type: formData.contentType || null,
        shoot_type: formData.shootType || null,
        characters_involved: formData.charactersInvolved || null,
        creator_name: formData.creatorName || null,
        unusual_element: formData.unusualElement || null,
        works_without_audio: formData.worksWithoutAudio || null,
        content_rating: formData.contentRating || null,
        replication_strength: formData.replicationStrength || null,

        // Level 2: Emotional & Physical Reactions (9 fields)
        body_reactions: formData.bodyReactions || [],
        emotion_first_6_sec: formData.emotionFirst6Sec || null,
        challenged_belief: formData.challengedBelief || null,
        emotional_identity_impact: formData.emotionalIdentityImpact || [],
        if_he_can_why_cant_you: formData.ifHeCanWhyCantYou || null,
        feel_like_commenting: formData.feelLikeCommenting || null,
        read_comments: formData.readComments || null,
        sharing_number: formData.sharingNumber || null,
        video_action: formData.videoAction || null,

        // Level 2: Production Details (6 fields)
        industry_id: formData.industryId || null,
        profile_id: formData.profileId || null,
        total_people_involved: formData.totalPeopleInvolved || null,
        shoot_possibility: formData.shootPossibility || null,

        // Level 3: Hook Study & Analysis (21 fields)
        stop_feel: formData.stopFeel || null,
        stop_feel_explanation: formData.stopFeelExplanation || null,
        stop_feel_audio_url: stopFeelAudioUrl || null,
        immediate_understanding: formData.immediateUnderstanding || null,
        immediate_understanding_audio_url: immediateUnderstandingAudioUrl || null,
        hook_carrier: formData.hookCarrier || null,
        hook_carrier_audio_url: hookCarrierAudioUrl || null,
        hook_without_audio: formData.hookWithoutAudio || null,
        hook_without_audio_recording_url: hookWithoutAudioRecordingUrl || null,
        audio_alone_stops_scroll: formData.audioAloneStopsScroll || null,
        audio_alone_stops_scroll_recording_url: audioAloneStopsScrollRecordingUrl || null,
        dominant_emotion_first_6: formData.dominantEmotionFirst6 || null,
        dominant_emotion_first_6_audio_url: dominantEmotionFirst6AudioUrl || null,
        understanding_by_second_6: formData.understandingBySecond6 || null,
        understanding_by_second_6_audio_url: understandingBySecond6AudioUrl || null,
        content_rating_level_3: formData.contentRatingLevel3 || null,

        // Level 3: Production Planning (6 fields)
        on_screen_text_hook: formData.onScreenTextHook || null,
        our_idea_audio_url: ourIdeaAudioUrl || null,
        shoot_location: formData.shootLocation || null,
        planning_date: formData.planningDate || null,
        additional_requirements: formData.additionalRequirements || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update tag associations
    const { contentConfigService } = await import('./contentConfigService');

    if (formData.hookTagIds) {
      await contentConfigService.setAnalysisHookTags(id, formData.hookTagIds);
    }
    if (formData.characterTagIds) {
      await contentConfigService.setAnalysisCharacterTags(id, formData.characterTagIds);
    }

    return data;
  },

  // Delete analysis
  async deleteAnalysis(id: string): Promise<void> {
    const { error } = await supabase
      .from('viral_analyses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
