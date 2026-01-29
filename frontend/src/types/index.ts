export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCRIPT_WRITER: 'SCRIPT_WRITER',
  CREATOR: 'CREATOR',
  VIDEOGRAPHER: 'VIDEOGRAPHER',
  EDITOR: 'EDITOR',
  POSTING_MANAGER: 'POSTING_MANAGER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// ============================================
// PRODUCTION STAGES - V2.0 (Simplified)
// ============================================
// Old stages mapped to new:
//   NOT_STARTED, PRE_PRODUCTION, PLANNED -> PLANNING
//   SHOOT_REVIEW -> READY_FOR_EDIT
//   EDIT_REVIEW, FINAL_REVIEW -> READY_TO_POST
//   SHOOTING, EDITING, READY_TO_POST, POSTED -> unchanged
// ============================================

export const ProductionStage = {
  // V2.0 Stages (New)
  PLANNING: 'PLANNING',             // Available for videographer to pick
  SHOOTING: 'SHOOTING',             // Videographer filming
  READY_FOR_EDIT: 'READY_FOR_EDIT', // Available for editor to pick (has raw files)
  EDITING: 'EDITING',               // Editor working
  READY_TO_POST: 'READY_TO_POST',   // Available for posting manager
  POSTED: 'POSTED',                 // Complete

  // Legacy stages (kept for backwards compatibility with historical data)
  // These should not be used for new projects
  NOT_STARTED: 'NOT_STARTED',       // @deprecated - use PLANNING
  PRE_PRODUCTION: 'PRE_PRODUCTION', // @deprecated - use PLANNING
  PLANNED: 'PLANNED',               // @deprecated - use PLANNING
  SHOOT_REVIEW: 'SHOOT_REVIEW',     // @deprecated - use READY_FOR_EDIT
  EDIT_REVIEW: 'EDIT_REVIEW',       // @deprecated - use READY_TO_POST
  FINAL_REVIEW: 'FINAL_REVIEW',     // @deprecated - use READY_TO_POST
} as const;

// New stages only (for new UI components)
export const ProductionStageV2 = {
  PLANNING: 'PLANNING',
  SHOOTING: 'SHOOTING',
  READY_FOR_EDIT: 'READY_FOR_EDIT',
  EDITING: 'EDITING',
  READY_TO_POST: 'READY_TO_POST',
  POSTED: 'POSTED',
} as const;

export type ProductionStageV2 = typeof ProductionStageV2[keyof typeof ProductionStageV2];

export type ProductionStage = typeof ProductionStage[keyof typeof ProductionStage];

export const Priority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

export const AssignmentRole = {
  VIDEOGRAPHER: 'VIDEOGRAPHER',
  EDITOR: 'EDITOR',
  POSTING_MANAGER: 'POSTING_MANAGER',
} as const;

export type AssignmentRole = typeof AssignmentRole[keyof typeof AssignmentRole];

// Posting platforms for posting manager
export const PostingPlatform = {
  INSTAGRAM_REEL: 'INSTAGRAM_REEL',
  INSTAGRAM_POST: 'INSTAGRAM_POST',
  INSTAGRAM_STORY: 'INSTAGRAM_STORY',
  TIKTOK: 'TIKTOK',
  YOUTUBE_SHORTS: 'YOUTUBE_SHORTS',
  YOUTUBE_VIDEO: 'YOUTUBE_VIDEO',
} as const;

export type PostingPlatform = typeof PostingPlatform[keyof typeof PostingPlatform];

// Platform display names for UI
export const PostingPlatformLabels: Record<PostingPlatform, string> = {
  INSTAGRAM_REEL: 'Instagram Reel',
  INSTAGRAM_POST: 'Instagram Post',
  INSTAGRAM_STORY: 'Instagram Story',
  TIKTOK: 'TikTok',
  YOUTUBE_SHORTS: 'YouTube Shorts',
  YOUTUBE_VIDEO: 'YouTube Video',
};

export const FileType = {
  // Video components
  A_ROLL: 'A_ROLL',           // Main footage/talking head
  B_ROLL: 'B_ROLL',           // Supporting/overlay footage
  HOOK: 'HOOK',               // First 3-6 seconds
  BODY: 'BODY',               // Main content
  CTA: 'CTA',                 // Call to action

  // Audio
  AUDIO_CLIP: 'AUDIO_CLIP',   // Audio files/voiceovers

  // Legacy types (kept for backward compatibility)
  RAW_FOOTAGE: 'RAW_FOOTAGE',
  EDITED_VIDEO: 'EDITED_VIDEO',
  FINAL_VIDEO: 'FINAL_VIDEO',
  ASSET: 'ASSET',
  OTHER: 'OTHER',
} as const;

export type FileType = typeof FileType[keyof typeof FileType];

// New types for enhanced script submission
export interface Industry {
  id: string;
  name: string;
  short_code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HookTag {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileListItem {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterTag {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// CAST COMPOSITION (Structured Demographics)
// ============================================
export interface CastComposition {
  man: number;
  woman: number;
  boy: number;
  girl: number;
  teen_boy: number;
  teen_girl: number;
  senior_man: number;
  senior_woman: number;
  include_owner: boolean;
  total: number; // Auto-calculated by database trigger
}

// Default empty cast composition
export const DEFAULT_CAST_COMPOSITION: CastComposition = {
  man: 0,
  woman: 0,
  boy: 0,
  girl: 0,
  teen_boy: 0,
  teen_girl: 0,
  senior_man: 0,
  senior_woman: 0,
  include_owner: false,
  total: 0,
};

// Cast category labels for UI
export const CastCategoryLabels: Record<keyof Omit<CastComposition, 'total' | 'include_owner'>, string> = {
  man: 'Men',
  woman: 'Women',
  boy: 'Boys',
  girl: 'Girls',
  teen_boy: 'Teen Boys',
  teen_girl: 'Teen Girls',
  senior_man: 'Senior Men',
  senior_woman: 'Senior Women',
};

// Cast filter interface for admin filtering
export interface CastFilter {
  minMen?: number;
  maxMen?: number;
  minWomen?: number;
  maxWomen?: number;
  minBoys?: number;
  maxBoys?: number;
  minGirls?: number;
  maxGirls?: number;
  needsChildren?: boolean;
  needsSeniors?: boolean;
  needsTeens?: boolean;
  ownerRequired?: boolean | null; // true, false, or null (any)
  minTotal?: number;
  maxTotal?: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  // Workflow v2.0: Trusted writer auto-approval
  is_trusted_writer?: boolean;
}

export interface ProjectAssignment {
  id: string;
  analysis_id: string;
  user_id: string;
  role: AssignmentRole;
  assigned_by: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Populated user data
  user?: Profile;
  assigned_by_user?: Profile;
}

export interface ViralAnalysis {
  id: string;
  user_id: string;
  reference_url: string;
  title?: string; // Title of the content
  hook?: string;
  hook_voice_note_url?: string;
  why_viral?: string;
  why_viral_voice_note_url?: string;
  how_to_replicate?: string;
  how_to_replicate_voice_note_url?: string;
  target_emotion: string;
  expected_outcome: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;

  // Level 1: Basic Info (9 fields)
  platform?: string;
  content_type?: string;
  shoot_type?: string;
  characters_involved?: string;
  creator_name?: string;
  unusual_element?: string;
  works_without_audio?: string;
  content_rating?: number;
  replication_strength?: number;

  // Level 2: Emotional & Physical Reactions (9 fields)
  body_reactions?: string[];
  emotion_first_6_sec?: string;
  challenged_belief?: string;
  emotional_identity_impact?: string[];
  if_he_can_why_cant_you?: string;
  feel_like_commenting?: string;
  read_comments?: string;
  sharing_number?: number;
  video_action?: string;

  // Level 2: Production Details (6 fields)
  industry_id?: string;
  profile_id?: string;
  total_people_involved?: number;
  shoot_possibility?: 25 | 50 | 75 | 100;

  // Level 3: Hook Study & Analysis (21 fields)
  stop_feel?: string;
  stop_feel_explanation?: string;
  stop_feel_audio_url?: string;
  immediate_understanding?: string;
  immediate_understanding_audio_url?: string;
  hook_carrier?: string;
  hook_carrier_audio_url?: string;
  hook_without_audio?: string;
  hook_without_audio_recording_url?: string;
  audio_alone_stops_scroll?: string;
  audio_alone_stops_scroll_recording_url?: string;
  dominant_emotion_first_6?: string;
  dominant_emotion_first_6_audio_url?: string;
  understanding_by_second_6?: string;
  understanding_by_second_6_audio_url?: string;
  content_rating_level_3?: number;

  // Level 3: Production Planning (6 fields)
  on_screen_text_hook?: string;
  our_idea_audio_url?: string;
  shoot_location?: string;
  planning_date?: string;
  additional_requirements?: string;

  // System fields
  content_id?: string; // Auto-generated (e.g., BCH-1001)
  syed_sir_presence?: 'YES' | 'NO';

  // Populated related data
  industry?: Industry;
  profile?: ProfileListItem;
  hook_tags?: HookTag[]; // Many-to-many
  character_tags?: CharacterTag[]; // Many-to-many (legacy)

  // Structured cast composition (new - preferred over character_tags)
  cast_composition?: CastComposition;

  // Review fields
  reviewed_by?: string;
  reviewed_at?: string;
  feedback?: string;
  feedback_voice_note_url?: string;
  hook_strength?: number;
  content_quality?: number;
  viral_potential?: number;
  replication_clarity?: number;
  overall_score?: number;

  // Production workflow fields
  production_stage?: ProductionStage;
  priority?: Priority;
  deadline?: string;
  budget?: number;
  production_notes?: string;
  production_started_at?: string;
  production_completed_at?: string;
  planned_date?: string; // Date when shoot is planned
  admin_remarks?: string; // Admin remarks visible to all team members

  // Rejection and dissolution tracking
  rejection_count?: number;
  is_dissolved?: boolean;
  dissolution_reason?: string;

  // Disapproval tracking (for approved scripts sent back)
  disapproval_count?: number;
  last_disapproved_at?: string;
  disapproval_reason?: string;

  // Google Drive / File management
  raw_footage_drive_url?: string;
  edited_video_drive_url?: string;
  final_video_url?: string;

  // Workflow v2.0: Posting manager fields
  posting_platform?: PostingPlatform;      // Platform for posting
  posting_caption?: string;                // Caption/description text
  posting_heading?: string;                // Title for YouTube/TikTok
  posting_hashtags?: string[];             // Array of hashtags
  scheduled_post_time?: string;            // When to post (ISO string)
  posted_url?: string;                     // Link to live post
  posted_at?: string;                      // Actual post time (ISO string)
  posted_urls?: Array<{ url: string; posted_at: string }>; // Multi-platform posts tracking

  // Assignments
  assignments?: ProjectAssignment[];
  videographer?: Profile;
  editor?: Profile;
  posting_manager?: Profile;

  // Admin view includes user info
  email?: string;
  full_name?: string;
  avatar_url?: string;
  reviewer_name?: string;
  reviewer_email?: string;

  // Files
  production_files?: ProductionFile[];
}

export interface AnalysisFormData {
  // Existing fields
  referenceUrl: string;
  title: string; // Title of the content (added after reference URL)
  hook: string;
  hookVoiceNote: Blob | null;
  hookVoiceNoteUrl: string;
  whyViral: string;
  whyViralVoiceNote: Blob | null;
  whyViralVoiceNoteUrl: string;
  howToReplicate: string;
  howToReplicateVoiceNote: Blob | null;
  howToReplicateVoiceNoteUrl: string;
  targetEmotion: string;
  expectedOutcome: string;

  // New Level 1 fields
  platform: string;
  contentType: string;
  shootType: string;
  charactersInvolved: string;
  creatorName: string;
  unusualElement: string;
  hookTypes: string[]; // Multi-select: Visual Hook, Audio Hook, SFX Hook, Onscreen Hook
  worksWithoutAudio: string;
  contentRating: number;
  replicationStrength: number;

  // Level 2 fields - Emotional & Physical Reactions
  bodyReactions: string[]; // Multi-select: Breath held, Leaned closer, etc.
  emotionFirst6Sec: string; // Shock, Curiosity, Fear, etc.
  challengedBelief: string; // Yes/No
  emotionalIdentityImpact: string[]; // Multi-select: Inspired, Inferior, etc.
  ifHeCanWhyCantYou: string; // Yes/No
  feelLikeCommenting: string; // Yes/No
  readComments: string; // Yes/No
  sharingNumber: number; // Numeric count
  videoAction: string; // None, Follow, Learn more, Buy, Try it

  // Level 2 fields - Production Details
  industryId: string;
  profileId: string;
  hookTagIds: string[]; // Multi-select
  totalPeopleInvolved: number;
  characterTagIds: string[]; // Multi-select
  shootPossibility: 25 | 50 | 75 | 100;

  // Level 3 fields - Hook Study & Analysis
  stopFeel: string; // Reflexive/Conscious/Weak pause
  stopFeelExplanation: string;
  stopFeelAudio: Blob | null;
  stopFeelAudioUrl: string;
  immediateUnderstanding: string;
  immediateUnderstandingAudio: Blob | null;
  immediateUnderstandingAudioUrl: string;
  hookCarrier: string;
  hookCarrierAudio: Blob | null;
  hookCarrierAudioUrl: string;
  hookWithoutAudio: string;
  hookWithoutAudioRecording: Blob | null;
  hookWithoutAudioRecordingUrl: string;
  audioAloneStopsScroll: string;
  audioAloneStopsScrollRecording: Blob | null;
  audioAloneStopsScrollRecordingUrl: string;
  dominantEmotionFirst6: string;
  dominantEmotionFirst6Audio: Blob | null;
  dominantEmotionFirst6AudioUrl: string;
  understandingBySecond6: string;
  understandingBySecond6Audio: Blob | null;
  understandingBySecond6AudioUrl: string;
  contentRatingLevel3: number;

  // Level 3 fields - Production Planning
  onScreenTextHook: string;
  ourIdeaAudio: Blob | null;
  ourIdeaAudioUrl: string;
  shootLocation: string;
  planningDate: string;
  additionalRequirements: string;

  // Custom fields from Form Builder (dynamic)
  [key: string]: any; // Allow any custom field
}

export interface ReviewAnalysisData {
  status: 'APPROVED' | 'REJECTED';
  feedback?: string;
  feedbackVoiceNote?: Blob | null;
  hookStrength: number;
  contentQuality: number;
  viralPotential: number;
  replicationClarity: number;
  profile_id?: string; // Required when approving - used to generate content_id
}

export interface AssignTeamData {
  videographerId?: string;
  editorId?: string;
  postingManagerId?: string;
  autoAssignVideographer?: boolean;
  autoAssignEditor?: boolean;
  autoAssignPostingManager?: boolean;
  // Production Details (filled by admin on approval)
  industryId?: string;
  profileId?: string;
  hookTagIds?: string[];
  characterTagIds?: string[];
  totalPeopleInvolved?: number;
  shootPossibility?: 25 | 50 | 75 | 100;
  // Admin remarks visible to all team members
  adminRemarks?: string;
}

export interface UpdateProductionStageData {
  production_stage: ProductionStage;
  production_notes?: string;
}

export interface UpdateProductionDetailsData {
  priority?: Priority;
  deadline?: string;
  budget?: number;
  production_notes?: string;
}

export interface ProductionFile {
  id: string;
  analysis_id: string;
  file_type: 'raw-footage' | 'edited-video' | 'final-video';
  file_name: string;
  file_url: string;
  file_id: string; // Google Drive or Supabase Storage file ID
  file_size?: number;
  uploaded_by?: string;
  uploaded_at: string;
  is_deleted: boolean;
  deleted_at?: string;
  mime_type?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Populated uploader data
  uploader?: Profile;
}

export interface UploadFileData {
  analysisId: string;
  fileName: string;
  fileType: FileType;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  isPrimary?: boolean;
}

// Admin-only fields update
export interface UpdateAdminFieldsData {
  additionalRequirements?: string;
  syedSirPresence?: 'YES' | 'NO';
  planningDate?: string;
}

// ============================================
// WORKFLOW V2.0 - New Interfaces
// ============================================

// Videographer picks a project from PLANNING queue
export interface PickProjectData {
  analysisId: string;
  profileId?: string;             // OPTIONAL - can be set later, content_id generated when profile selected
  hookTagIds?: string[];
  castComposition?: CastComposition;  // Structured cast composition instead of freeform character tags
  deadline?: string;              // Videographer can set their own deadline
}

// Editor picks a project from READY_FOR_EDIT queue
export interface PickEditProjectData {
  analysisId: string;
}

// Posting manager sets posting details
export interface SetPostingDetailsData {
  analysisId: string;
  postingPlatform: PostingPlatform;
  postingCaption: string;
  postingHeading?: string;        // Required for YouTube/TikTok
  postingHashtags?: string[];
  scheduledPostTime?: string;     // ISO datetime string
}

// Mark project as posted with live URL
export interface MarkAsPostedData {
  analysisId: string;
  postedUrl: string;              // REQUIRED - link to live post
  keepInQueue?: boolean;          // Optional - keep in queue to post to more platforms
}

// Videographer marks shooting complete
export interface MarkShootingCompleteData {
  analysisId: string;
  productionNotes?: string;
}

// Editor marks editing complete
export interface MarkEditingCompleteData {
  analysisId: string;
  productionNotes?: string;
}

// Admin updates trusted writer status
export interface UpdateTrustedWriterData {
  userId: string;
  isTrustedWriter: boolean;
}

// Stage labels for UI display
export const ProductionStageLabels: Record<string, string> = {
  PLANNING: 'Planning',
  SHOOTING: 'Shooting',
  READY_FOR_EDIT: 'Ready for Edit',
  EDITING: 'Editing',
  READY_TO_POST: 'Ready to Post',
  POSTED: 'Posted',
  // Legacy labels
  NOT_STARTED: 'Not Started',
  PRE_PRODUCTION: 'Pre-Production',
  PLANNED: 'Planned',
  SHOOT_REVIEW: 'Shoot Review',
  EDIT_REVIEW: 'Edit Review',
  FINAL_REVIEW: 'Final Review',
};

// Stage colors for UI
export const ProductionStageColors: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-800',
  SHOOTING: 'bg-yellow-100 text-yellow-800',
  READY_FOR_EDIT: 'bg-purple-100 text-purple-800',
  EDITING: 'bg-orange-100 text-orange-800',
  READY_TO_POST: 'bg-green-100 text-green-800',
  POSTED: 'bg-gray-100 text-gray-800',
  // Legacy colors
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  PRE_PRODUCTION: 'bg-blue-100 text-blue-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  SHOOT_REVIEW: 'bg-purple-100 text-purple-800',
  EDIT_REVIEW: 'bg-green-100 text-green-800',
  FINAL_REVIEW: 'bg-green-100 text-green-800',
};
