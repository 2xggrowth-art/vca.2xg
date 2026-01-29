# Workflow Optimization Plan

## Overview

This document outlines the current production workflow and the proposed optimized flow (Option C - Hybrid) with autonomous team operations and selective auto-approval for trusted script writers.

---

## PART 1: BACKEND & DATABASE ANALYSIS

### Current Database Schema

#### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User accounts | id, email, full_name, role, avatar_url |
| `viral_analyses` | Main project data | 100+ columns (see below) |
| `project_assignments` | Team assignments | analysis_id, user_id, role, assigned_by |
| `production_files` | Uploaded files | analysis_id, file_type, file_url, uploaded_by |
| `industries` | Industry lookup | name, short_code (BCH, REST, etc.) |
| `profile_list` | Content profiles | name (for content_id generation) |
| `hook_tags` | Hook type tags | name (audio hook, visual hook, etc.) |
| `character_tags` | Character types | name (just syed, 5 staff and syed, etc.) |
| `analysis_hook_tags` | Junction table | analysis_id, hook_tag_id |
| `analysis_character_tags` | Junction table | analysis_id, character_tag_id |
| `used_content_ids` | Permanent ID tracking | content_id, deleted_at |

#### viral_analyses Table - Complete Column List

**Core Fields:**
- id, user_id, reference_url, title, hook, hook_voice_note_url
- why_viral, why_viral_voice_note_url
- how_to_replicate, how_to_replicate_voice_note_url
- target_emotion, expected_outcome
- status (PENDING/APPROVED/REJECTED)
- created_at, updated_at

**Level 1 Fields (Script Writer):**
- platform, content_type, shoot_type, characters_involved
- creator_name, unusual_element, works_without_audio
- content_rating, replication_strength

**Level 2 Fields (Emotional/Physical):**
- body_reactions[], emotion_first_6_sec, challenged_belief
- emotional_identity_impact[], if_he_can_why_cant_you
- feel_like_commenting, read_comments, sharing_number, video_action

**Level 2 Fields (Production Details):**
- industry_id, profile_id, total_people_involved, shoot_possibility

**Level 3 Fields (Hook Study):**
- stop_feel, stop_feel_explanation, stop_feel_audio_url
- immediate_understanding, immediate_understanding_audio_url
- hook_carrier, hook_carrier_audio_url
- hook_without_audio, hook_without_audio_recording_url
- audio_alone_stops_scroll, audio_alone_stops_scroll_recording_url
- dominant_emotion_first_6, dominant_emotion_first_6_audio_url
- understanding_by_second_6, understanding_by_second_6_audio_url
- content_rating_level_3

**Level 3 Fields (Production Planning):**
- on_screen_text_hook, our_idea_audio_url
- shoot_location, planning_date, additional_requirements

**System Fields:**
- content_id (UNIQUE - format: BCHFIT001)
- syed_sir_presence (YES/NO)

**Review Fields:**
- reviewed_by, reviewed_at, feedback, feedback_voice_note_url
- hook_strength, content_quality, viral_potential, replication_clarity
- overall_score

**Production Workflow Fields:**
- production_stage (10 current stages)
- priority (LOW/NORMAL/HIGH/URGENT)
- deadline, budget, production_notes
- production_started_at, production_completed_at
- planned_date, admin_remarks

**Tracking Fields:**
- rejection_count, is_dissolved, dissolution_reason
- disapproval_count, last_disapproved_at, disapproval_reason

**File URL Fields:**
- raw_footage_drive_url, edited_video_drive_url, final_video_url

### Current RPC Functions

| Function | Purpose |
|----------|---------|
| `generate_content_id_on_approval` | Creates BCH{PROFILE}{SEQ} content ID |
| `increment_rejection_counter` | Tracks rejections, auto-dissolves at 5 |
| `disapprove_script` | Returns approved script to PENDING |
| `get_videographer_workload` | Calculates workload for auto-assign |

### Current Services

| Service | Functions |
|---------|-----------|
| `analysesService` | getMyAnalyses, createAnalysis, updateAnalysis, deleteAnalysis |
| `adminService` | getAllAnalyses, reviewAnalysis, disapproveScript, getDashboardStats |
| `assignmentService` | assignTeam, autoAssign*, updateProductionStage, getMyAssignedAnalyses |
| `productionFilesService` | uploadFile, getFiles, deleteFile, approveFile, rejectFile |
| `contentConfigService` | CRUD for industries, profiles, hook_tags, character_tags |
| `videographerProjectService` | createProject (videographer-initiated) |

### Data NOT Being Displayed (Identified Issues)

1. **Redundant Date Fields:**
   - `planning_date` (Level 3 form field)
   - `planned_date` (added in migration for admin)
   - Both exist, potentially confusing

2. **Unused/Hidden Fields:**
   - `syed_sir_presence` - stored but not prominently displayed
   - Many Level 3 audio URLs stored but rarely shown
   - `production_files.approval_status` - has approval workflow but rarely used

3. **Missing from UI:**
   - `dissolution_reason` - not shown when script is dissolved
   - `budget` field - exists but not displayed in most views
   - Team member workload stats not visible to admins

---

## PART 2: CURRENT FLOW (10 Stages, 4 Admin Bottlenecks)

### Stage Diagram

```
┌─────────────────┐
│  SCRIPT WRITER  │
│  Submits Script │
└────────┬────────┘
         ▼
┌─────────────────┐
│ ADMIN APPROVAL  │ ◄── BOTTLENECK #1
│   (Required)    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  NOT_STARTED    │
│  (No team yet)  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ ADMIN ASSIGNS   │ ◄── Manual assignment required
│ Team Members    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ PRE_PRODUCTION  │
│ (Team assigned) │
└────────┬────────┘
         ▼
┌─────────────────┐
│ ADMIN SETS DATE │ ◄── Manual date setting
│   PLANNED       │
└────────┬────────┘
         ▼
┌─────────────────┐
│  VIDEOGRAPHER   │
│   SHOOTING      │
└────────┬────────┘
         ▼
┌─────────────────┐
│  SHOOT_REVIEW   │ ◄── BOTTLENECK #2 (Admin must approve raw footage)
│ Admin Approval  │
└────────┬────────┘
         ▼
┌─────────────────┐
│     EDITOR      │
│    EDITING      │
└────────┬────────┘
         ▼
┌─────────────────┐
│  EDIT_REVIEW    │ ◄── BOTTLENECK #3 (Admin must approve edited video)
│ Admin Approval  │
└────────┬────────┘
         ▼
┌─────────────────┐
│  FINAL_REVIEW   │ ◄── BOTTLENECK #4 (Admin confirms again)
│ Admin Approval  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ READY_TO_POST   │
│ Posting Manager │
└────────┬────────┘
         ▼
┌─────────────────┐
│     POSTED      │
│      Done       │
└─────────────────┘
```

### Current Production Stages (in types/index.ts)

```typescript
export const ProductionStage = {
  NOT_STARTED: 'NOT_STARTED',
  PRE_PRODUCTION: 'PRE_PRODUCTION',
  PLANNED: 'PLANNED',
  SHOOTING: 'SHOOTING',
  SHOOT_REVIEW: 'SHOOT_REVIEW',
  EDITING: 'EDITING',
  EDIT_REVIEW: 'EDIT_REVIEW',
  FINAL_REVIEW: 'FINAL_REVIEW',
  READY_TO_POST: 'READY_TO_POST',
  POSTED: 'POSTED',
};
```

### Current Pain Points

1. **Admin is single point of failure** - 4 approval gates means 4x waiting
2. **No self-assignment** - Team waits for admin to assign work
3. **Redundant reviews** - SHOOT_REVIEW + EDIT_REVIEW + FINAL_REVIEW = 3 quality gates
4. **Manual everything** - Admin must click through every step
5. **No trust levels** - All script writers treated equally regardless of track record
6. **Content ID timing issue** - Generated ONLY when admin selects profile in Production Details
7. **★ Profile selection bottleneck** - Admin MUST select profile, but videographer knows which profile they shot for. This creates:
   - Unnecessary admin work for every single project
   - Delays in content ID assignment
   - Videographer has no input on profile despite knowing the target account

---

## PART 3: PROPOSED FLOW (Option C - Hybrid + Auto-Approve)

### New Stage Diagram

```
┌─────────────────┐
│  SCRIPT WRITER  │
│  Submits Script │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │  Trusted?  │
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────────┐
│  YES   │  │     NO     │
│ Auto-  │  │   Admin    │
│Approve │  │  Approval  │
└───┬────┘  └─────┬──────┘
    │             │
    └──────┬──────┘
           ▼
┌─────────────────┐
│    PLANNING     │ ◄── Scripts available for videographers
│  (Queue View)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  VIDEOGRAPHER   │
│  Self-Picks &   │ ◄── Videographer chooses project
│ Selects Profile │     Gets Content ID on pick
└────────┬────────┘
         ▼
┌─────────────────┐
│    SHOOTING     │
│ Uploads Footage │
└────────┬────────┘
         │
         ▼ (Auto-move when footage uploaded)
┌─────────────────┐
│ READY_FOR_EDIT  │ ◄── Editors see available projects
│  (Queue View)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     EDITOR      │
│   Self-Picks    │ ◄── Editor chooses project
└────────┬────────┘
         ▼
┌─────────────────┐
│    EDITING      │
│ Uploads Video   │
└────────┬────────┘
         │
         ▼ (Auto-move when video uploaded)
┌─────────────────┐
│ READY_TO_POST   │ ◄── Posting managers see available projects
│  (Queue View)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POSTING_MANAGER │
│   Schedules &   │ ◄── Uses calendar view
│     Posts       │
└────────┬────────┘
         ▼
┌─────────────────┐
│     POSTED      │
│      Done       │
└─────────────────┘

         ┌─────────────────────────────────────┐
         │         ADMIN OVERSIGHT             │
         │  Can intervene at ANY stage:        │
         │  • Flag for review                  │
         │  • Send back to previous stage      │
         │  • Add remarks/feedback             │
         │  • Disapprove (returns to PENDING)  │
         └─────────────────────────────────────┘
```

### New Production Stages (Proposed)

```typescript
export const ProductionStage = {
  // Removed: NOT_STARTED, PRE_PRODUCTION, SHOOT_REVIEW, EDIT_REVIEW, FINAL_REVIEW
  PLANNING: 'PLANNING',           // NEW: Available for videographer pick
  SHOOTING: 'SHOOTING',           // Videographer filming
  READY_FOR_EDIT: 'READY_FOR_EDIT', // NEW: Available for editor pick
  EDITING: 'EDITING',             // Editor working
  READY_TO_POST: 'READY_TO_POST', // Available for posting
  POSTED: 'POSTED',               // Complete
};
```

### Key Changes Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| Stages | 10 | 6 |
| Admin Approvals | 4 required | 0-1 (only for non-trusted writers) |
| Team Assignment | Admin assigns | Self-pick from queue |
| **Profile Selection** | Admin selects in Production Details | **Videographer selects when picking project** (Admin can also pre-select optionally) |
| **Content ID** | Generated when admin selects profile | **Generated when profile is selected** (by videographer or admin) |
| Shoot Review | Required | Removed (auto-move) |
| Edit Review | Required | Removed (auto-move) |
| Final Review | Required | Removed (posting manager decides) |

### Profile Selection & Content ID - New Flow

**Current Problem:**
- Content ID is generated only when admin selects profile in "Production Details"
- Videographer has no input on which profile to assign, even though they know which profile they shot for
- This creates a bottleneck where admin must manually select profile for every project

**New Approach:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  PROFILE SELECTION OPTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPTION A: Videographer Selects (PRIMARY FLOW)                  │
│  ─────────────────────────────────────────────                  │
│  When videographer picks a project from PLANNING queue:         │
│  1. View available scripts                                      │
│  2. Click "Pick This Project"                                   │
│  3. ★ SELECT PROFILE (required) ★                               │
│  4. Add Hook Tags, Character Tags (optional)                    │
│  5. Confirm → Content ID generated, moves to SHOOTING           │
│                                                                 │
│  WHY: Videographer knows which profile/account they shot for    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPTION B: Admin Pre-Selects (OPTIONAL)                         │
│  ─────────────────────────────────────────                      │
│  Admin CAN pre-assign profile during/after approval:            │
│  • In NeedApprovalPage: Optional profile field                  │
│  • In ProductionStatusPage: Edit profile anytime                │
│                                                                 │
│  IF admin pre-selects profile:                                  │
│  → Content ID generated immediately                             │
│  → Videographer sees pre-assigned profile (can change)          │
│                                                                 │
│  IF admin does NOT select profile:                              │
│  → Content ID = NULL                                            │
│  → Videographer MUST select profile when picking                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONTENT ID GENERATION TRIGGER:                                 │
│  ─────────────────────────────────                              │
│  Content ID is generated the FIRST time profile is selected:    │
│  • Either by admin (optional, anytime)                          │
│  • Or by videographer (required, when picking project)          │
│                                                                 │
│  Once generated, Content ID is PERMANENT and cannot change      │
│  (tracked in used_content_ids table)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Summary:**
- **Videographer**: Must select profile when picking project (if not already set)
- **Admin**: Can optionally pre-select profile, but NOT required
- **Content ID**: Generated when profile is first selected, by whoever selects it first

---

## PART 4: FEATURE - TRUSTED SCRIPT WRITERS

### Concept

Some script writers have a proven track record. Their scripts can bypass admin approval and go directly to the Planning queue.

### Database Changes Required

```sql
-- Add trusted flag to profiles table
ALTER TABLE profiles ADD COLUMN is_trusted_writer BOOLEAN DEFAULT FALSE;

-- Add index for quick lookups
CREATE INDEX idx_profiles_trusted_writer ON profiles(is_trusted_writer) WHERE is_trusted_writer = TRUE;
```

### Admin Settings UI

In Team Members page, add toggle for SCRIPT_WRITER users:

```
┌─────────────────────────────────────────────────────┐
│  Team Member: John Doe                              │
│  Role: SCRIPT_WRITER                                │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [✓] Trusted Writer - Auto-approve scripts   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Stats: 45 scripts submitted, 43 approved (95%)    │
└─────────────────────────────────────────────────────┘
```

### Flow Logic

```
When script is submitted (analysesService.createAnalysis):

  1. Get user profile
  2. Check is_trusted_writer flag

  IF is_trusted_writer = TRUE:
    → Set status = 'APPROVED'
    → Set production_stage = 'PLANNING'
    → Skip admin review queue entirely

  ELSE:
    → Set status = 'PENDING'
    → production_stage = NULL
    → Requires admin approval
    → On approval: admin sets production_stage = 'PLANNING'
```

---

## PART 5: DETAILED STAGE SPECIFICATIONS

### Stage 1: PENDING (Script Submission)

**Who:** Script Writer
**Action:** Submits script via simplified wizard
**Fields:** Reference URL, Title, Shoot Type, Creator Name, Hook Types, Works Without Audio

**Auto-Approve Check:**
- If `is_trusted_writer = true` → Skip to PLANNING
- If `is_trusted_writer = false` → Wait for admin approval

**Service Changes:**
- `analysesService.createAnalysis()` - Add trusted writer check

---

### Stage 2: PLANNING (Available for Videographers)

**Who:** Videographer (self-service)
**View:** Queue of approved scripts without assigned videographer

**Query:**
```sql
SELECT * FROM viral_analyses
WHERE status = 'APPROVED'
AND production_stage = 'PLANNING'
AND NOT EXISTS (
  SELECT 1 FROM project_assignments
  WHERE analysis_id = viral_analyses.id
  AND role = 'VIDEOGRAPHER'
)
ORDER BY priority DESC, created_at ASC
```

**Videographer Actions:**
1. Browse available scripts
2. View script details (reference video, title, etc.)
3. Click "Pick This Project"
4. **★ Select Profile (REQUIRED if not pre-set by admin) ★**
   - Dropdown with all available profiles from `profile_list` table
   - If admin already assigned a profile, it shows pre-selected (videographer can change)
   - **WHY:** Videographer knows which profile/account they will shoot for
5. Add Hook Tags, Character Tags (optional)
6. Set People Involved, Shoot Possibility
7. Confirm → **Content ID generated (if not already), moves to SHOOTING**

**Profile Selection Logic:**
```
When videographer clicks "Pick Project":

  IF profile_id IS NULL (admin didn't pre-assign):
    → Profile selection is REQUIRED
    → Show validation error if not selected

  ELSE IF profile_id IS NOT NULL (admin pre-assigned):
    → Show pre-selected profile
    → Videographer CAN change if needed

  On Confirm:
    IF content_id IS NULL:
      → Call generate_content_id_on_approval(analysisId, profileId)
      → Content ID is now set permanently
```

**Service Changes:**
- New: `videographerService.pickProject(analysisId, profileId, ...)`
- Validates profile is selected before proceeding
- Calls `generate_content_id_on_approval` RPC if content_id is NULL
- Moves to SHOOTING stage
- Creates project_assignment for videographer

---

### Stage 3: SHOOTING (Videographer Working)

**Who:** Videographer
**View:** "My Projects" list filtered to SHOOTING stage

**Videographer Actions:**
1. View project details
2. Upload raw footage (A-Roll, B-Roll, Hook, Body, CTA, Audio)
3. Add production notes
4. Mark "Filming Complete" → Auto-moves to READY_FOR_EDIT

**Auto-Transition Logic:**
```
When videographer clicks "Mark Complete":
  IF has_uploaded_files = TRUE:
    → Set production_stage = 'READY_FOR_EDIT'
    → Remove videographer assignment? (or keep for reference)
  ELSE:
    → Show error: "Upload at least one file before completing"
```

---

### Stage 4: READY_FOR_EDIT (Editor Queue)

**Who:** Editor (self-service)
**View:** Queue of projects with uploaded footage, no assigned editor

**IMPORTANT:** Only show projects that have at least 1 raw footage file uploaded.

**Query:**
```sql
SELECT va.* FROM viral_analyses va
WHERE va.status = 'APPROVED'
AND va.production_stage = 'READY_FOR_EDIT'
-- Only show if has raw footage files
AND EXISTS (
  SELECT 1 FROM production_files pf
  WHERE pf.analysis_id = va.id
  AND pf.file_type IN ('RAW_FOOTAGE', 'A_ROLL', 'B_ROLL', 'HOOK', 'BODY', 'CTA', 'AUDIO')
)
-- Not already assigned to an editor
AND NOT EXISTS (
  SELECT 1 FROM project_assignments pa
  WHERE pa.analysis_id = va.id
  AND pa.role = 'EDITOR'
)
ORDER BY va.priority DESC, va.created_at ASC
```

**Editor Actions:**
1. Browse available projects (only those with raw files)
2. Preview raw footage files
3. Click "Pick This Project" → Assigned to this editor
4. Auto-moves to EDITING stage

**Service Changes:**
- New: `editorService.pickProject(analysisId)`
- Creates project_assignment for editor
- Moves to EDITING stage
- **Filter:** Only return projects with at least 1 raw footage file

---

### Stage 5: EDITING (Editor Working)

**Who:** Editor
**View:** "My Projects" list filtered to EDITING stage

**Editor Actions:**
1. View raw footage from videographer
2. Upload edited video (EDITED_VIDEO type)
3. Add production notes
4. Mark "Editing Complete" → Auto-moves to READY_TO_POST

**Auto-Transition Logic:**
```
When editor clicks "Mark Complete":
  IF has_edited_video = TRUE:
    → Set production_stage = 'READY_TO_POST'
  ELSE:
    → Show error: "Upload edited video before completing"
```

---

### Stage 6: READY_TO_POST (Posting Manager Queue)

**Who:** Posting Manager
**View:** Queue/Calendar of projects ready to post (Mobile: List view, Desktop: Calendar grid)

**Query:**
```sql
SELECT * FROM viral_analyses
WHERE status = 'APPROVED'
AND production_stage = 'READY_TO_POST'
ORDER BY deadline ASC, priority DESC
```

**Posting Manager Actions:**
1. View final video
2. Schedule posting date (calendar view - mobile-first per UI_UX_REDESIGN_PLAN.md)
3. **Select Platform** (required):
   - Instagram Reel
   - Instagram Post
   - TikTok
   - YouTube Shorts
   - YouTube Video
4. **Add Post Details** (required):
   - Caption (post text)
   - Heading/Title (for YouTube/TikTok)
   - Hashtags
5. Mark "Posted" → Moves to POSTED

**New Database Fields Required:**
```sql
-- Add to viral_analyses table
posting_platform VARCHAR(50),        -- 'INSTAGRAM_REEL', 'TIKTOK', 'YOUTUBE_SHORTS', etc.
posting_caption TEXT,                -- Caption/description text
posting_heading VARCHAR(255),        -- Title for YouTube/TikTok
posting_hashtags TEXT[],             -- Array of hashtags
scheduled_post_time TIMESTAMPTZ,     -- When to post
posted_url VARCHAR(500),             -- Link to live post
posted_at TIMESTAMPTZ                -- Actual post time
```

---

### Stage 7: POSTED (Complete)

**Who:** Posting Manager
**Action:**
1. After posting, enter the **posted_url** (link to live reel/video)
2. System sets `posted_at = NOW()`
3. System sets `production_completed_at = NOW()`
4. Project visible in completed view with live link for tracking

**Tracking Features:**
- View live post directly from dashboard
- Track engagement (future: API integration)
- Historical data preserved for analytics

---

## PART 6: ADMIN OVERSIGHT FEATURES

### 1. Dashboard Overview

Admin can see all stages at a glance:
- PENDING count (needs approval, if any non-trusted)
- PLANNING count (available for videographers)
- SHOOTING count (in progress)
- READY_FOR_EDIT count (available for editors)
- EDITING count (in progress)
- READY_TO_POST count (available for posting)
- POSTED count (this week/month)

### 2. Intervention Actions

At ANY stage, admin can:

| Action | Effect |
|--------|--------|
| **Flag for Review** | Adds visual flag, optional notification |
| **Add Remarks** | Visible to all team members via admin_remarks field |
| **Send Back** | Returns to previous stage with reason |
| **Disapprove** | Returns to PENDING (existing RPC function) |
| **Reassign** | Change assigned team member |
| **Priority Change** | Mark as URGENT/HIGH/NORMAL/LOW |
| **Pre-assign Profile** | Optional: Set profile before videographer picks (Content ID generated) |
| **Change Profile** | If needed, admin can change profile (does NOT regenerate Content ID) |

### 3. Admin Profile Selection (Optional)

**This is NOT required, but available if admin wants to pre-assign:**

```
┌─────────────────────────────────────────────────────────────────┐
│  NeedApprovalPage (Script Approval)                             │
│  ─────────────────────────────────                              │
│  When approving a script, admin sees OPTIONAL field:            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Profile (Optional): [Select Profile ▼]                 │   │
│  │                                                         │   │
│  │  Leave empty to let videographer choose                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  If admin selects profile → Content ID generated immediately    │
│  If admin leaves empty → Content ID generated when videographer │
│                          picks project and selects profile      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ProductionStatusPage (Any Stage)                               │
│  ─────────────────────────────────                              │
│  Admin can view/edit profile at any stage:                      │
│                                                                 │
│  • View: Shows current profile and Content ID                   │
│  • Edit: Can change profile (useful if videographer made error) │
│                                                                 │
│  NOTE: Changing profile does NOT change Content ID              │
│        (Content IDs are permanent once generated)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Admin profile selection is **OPTIONAL**, not compulsory
- If admin doesn't select profile, videographer **MUST** select when picking project
- Content ID is generated by whoever selects profile first
- Once Content ID exists, it cannot be changed (even if profile changes)

### 3. Quality Metrics (Future Enhancement)

Track per team member:
- Scripts: approval rate, rejection count
- Videographer: projects completed, avg time in SHOOTING
- Editor: projects completed, avg time in EDITING
- Posting Manager: posts scheduled, posts completed

---

## PART 7: DATABASE MIGRATION PLAN

### Migration 1: Add Trusted Writer Flag

```sql
-- File: supabase/migrations/20250125_trusted_writer.sql

-- Add trusted writer column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_trusted_writer BOOLEAN DEFAULT FALSE;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_trusted_writer
ON profiles(is_trusted_writer) WHERE is_trusted_writer = TRUE;

-- Comment
COMMENT ON COLUMN profiles.is_trusted_writer IS
'If true, scripts from this writer are auto-approved to PLANNING stage';
```

### Migration 2: Update Production Stages

```sql
-- File: supabase/migrations/20250125_new_production_stages.sql

-- Migrate existing data to new stages
UPDATE viral_analyses SET production_stage = 'PLANNING'
WHERE production_stage IN ('NOT_STARTED', 'PRE_PRODUCTION', 'PLANNED')
AND status = 'APPROVED';

UPDATE viral_analyses SET production_stage = 'READY_FOR_EDIT'
WHERE production_stage = 'SHOOT_REVIEW';

UPDATE viral_analyses SET production_stage = 'READY_TO_POST'
WHERE production_stage IN ('EDIT_REVIEW', 'FINAL_REVIEW');

-- Note: SHOOTING, EDITING, READY_TO_POST, POSTED remain unchanged
```

### Migration 3: Update Content ID Generation Timing

The existing `generate_content_id_on_approval` RPC function remains but will be called when videographer picks project instead of admin approval.

---

## PART 8: FRONTEND CHANGES REQUIRED

### Types Changes (types/index.ts)

```typescript
// Update ProductionStage
export const ProductionStage = {
  PLANNING: 'PLANNING',
  SHOOTING: 'SHOOTING',
  READY_FOR_EDIT: 'READY_FOR_EDIT',
  EDITING: 'EDITING',
  READY_TO_POST: 'READY_TO_POST',
  POSTED: 'POSTED',
} as const;

// Add to Profile interface
export interface Profile {
  // ... existing fields
  is_trusted_writer?: boolean;
}
```

### Service Changes

1. **analysesService.ts**
   - `createAnalysis()` - Check trusted writer, auto-approve if true

2. **New: videographerQueueService.ts**
   - `getAvailableProjects()` - Get PLANNING stage projects without videographer
   - `pickProject(analysisId, profileId, hookTagIds, characterTagIds, totalPeople, shootPossibility)` - Claim project
   - **Profile selection is REQUIRED** if not already set by admin
   - Calls `generate_content_id_on_approval` RPC if content_id is NULL

3. **New: editorQueueService.ts**
   - `getAvailableProjects()` - Get READY_FOR_EDIT stage projects without editor
   - `pickProject(analysisId)` - Claim project

4. **assignmentService.ts**
   - Update `updateProductionStage()` for new stage names
   - Add auto-transition logic

5. **profileService.ts**
   - `updateTrustedWriter(userId, isTrusted)` - Toggle trusted status

### Page/Component Changes

1. **VideographerDashboard.tsx**
   - Add "Available Projects" tab/section (PLANNING queue)
   - **"Pick Project" modal with PROFILE SELECTION (required if not pre-set)**
     - Dropdown showing all profiles from `profile_list` table
     - If admin pre-assigned profile, show it selected (can be changed)
     - Generate Content ID when profile is selected and confirmed
   - "Mark Complete" button that transitions to READY_FOR_EDIT

2. **EditorDashboard.tsx**
   - Add "Available Projects" tab/section (READY_FOR_EDIT queue)
   - "Pick Project" button
   - "Mark Complete" button that transitions to READY_TO_POST

3. **TeamMembersPage.tsx**
   - Add "Trusted Writer" toggle for SCRIPT_WRITER users

4. **NeedApprovalPage.tsx**
   - Update to handle new stage names
   - On approval, set production_stage = 'PLANNING'
   - **Add OPTIONAL profile selection during approval**
     - If admin selects profile → Content ID generated immediately
     - If admin leaves empty → Videographer must select when picking project

5. **ProductionStatusPage.tsx**
   - Update tabs for new stages:
     - Planning (was: Unassigned + Planning)
     - Shooting
     - Ready for Edit (new)
     - Editing
     - Ready to Post (was: Ready + Final Review)
     - Posted

---

## PART 9: QUESTIONS & ANSWERS

### Script Writer Flow

1. **Auto-approve criteria:** ✅ ANSWERED
   - **Decision:** Manual toggle only for now
   - Future enhancement: Auto-promote based on approval rate

2. **Trusted writer limit:** ✅ ANSWERED
   - **Decision:** No limit on submissions

### Videographer Flow

3. **Pick limit:** ✅ ANSWERED
   - **Decision:** Unlimited (no artificial limit)
   - Natural behavior will be 5-10 max anyway

4. **Profile selection:** ✅ RESOLVED
   - Videographer MUST select profile when picking project (if admin didn't pre-assign)
   - Videographer knows which profile/account they're shooting for
   - Admin CAN optionally pre-assign profile, but it's NOT required
   - Content ID is generated when profile is first selected (by whoever selects first)

5. **Deadline:** ✅ ANSWERED
   - **Decision:** Videographer CAN set their own deadlines
   - Visible to admin and team members

### Editor Flow

6. **Pick limit:** ✅ ANSWERED
   - **Decision:** Unlimited (no artificial limit)

7. **Raw footage requirement:** ✅ ANSWERED
   - **Decision:** YES - Only show projects with at least 1 raw footage file
   - Editor queue filters: `READY_FOR_EDIT` + `has_raw_files = true`

### Posting Manager Flow

8. **Calendar scheduling:** ✅ ANSWERED
   - **Decision:** Use new mobile-first design from UI_UX_REDESIGN_PLAN.md
   - List view for mobile, grid for desktop

9. **Platform selection:** ✅ ANSWERED
   - **Decision:** YES - Posting manager selects platform
   - **New fields required:**
     - `platform` (Instagram, TikTok, YouTube, etc.)
     - `caption` (post text)
     - `heading` (title for YouTube/TikTok)
     - `posted_url` (link to live post for tracking)

### Admin Oversight

10. **Notification system:** ✅ ANSWERED
    - **Decision:** YES - Admin gets ALL notifications
    - New scripts from non-trusted writers
    - Projects stuck in a stage > X days
    - Stage transitions
    - Team activity

11. **Bulk actions:** ✅ ANSWERED
    - **Decision:** YES - Keep bulk approve/reassign

### General

12. **Mobile optimization:** ✅ ANSWERED
    - **Decision:** YES - Follow UI_UX_REDESIGN_PLAN.md
    - Mobile-first approach
    - Bottom navigation
    - Card-based views

13. **Backwards compatibility:** ✅ ANSWERED
    - **Decision:** Keep historical data
    - Migrate old stages to new stage names
    - Preserve all historical records

---

## PART 10: IMPLEMENTATION PHASES

### Phase 1: Database Changes (Day 1)
- [ ] Add `is_trusted_writer` to profiles
- [ ] Create migration for existing data stage mapping
- [ ] Update types/index.ts with new ProductionStage

### Phase 2: Trusted Writer Feature (Day 2)
- [ ] Add toggle in Team Members page
- [ ] Update profileService for trusted writer updates
- [ ] Modify analysesService.createAnalysis for auto-approve

### Phase 3: Videographer Self-Pick + Profile Selection (Day 3-4)
- [ ] Create videographerQueueService
- [ ] Add "Available Projects" section to VideographerDashboard
- [ ] **"Pick Project" modal with PROFILE SELECTION**
  - [ ] Profile dropdown (required if not pre-set by admin)
  - [ ] Generate Content ID when videographer confirms with profile
  - [ ] Validate profile is selected before allowing pick
- [ ] "Mark Complete" → READY_FOR_EDIT transition

### Phase 4: Editor Self-Pick (Day 5)
- [ ] Create editorQueueService
- [ ] Add "Available Projects" section to EditorDashboard
- [ ] "Pick Project" functionality
- [ ] "Mark Complete" → READY_TO_POST transition

### Phase 5: Admin Updates (Day 6)
- [ ] Update NeedApprovalPage for new flow
  - [ ] Add OPTIONAL profile selection during approval
  - [ ] If profile selected, generate Content ID immediately
- [ ] Update ProductionStatusPage tabs
- [ ] Admin can view/edit profile at any stage
- [ ] Test full flow end-to-end

### Phase 6: Testing & Polish (Day 7)
- [ ] Test all role flows
- [ ] Mobile testing
- [ ] Edge case handling
- [ ] Deploy to production

---

## Summary

| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| Total Stages | 10 | 6 | 40% reduction |
| Admin Approvals | 4 | 0-1 | 75-100% reduction |
| Manual Assignments | 3 | 0 | 100% reduction |
| **Profile Selection** | Admin only (required) | **Videographer selects** (Admin optional) | Removes bottleneck |
| **Content ID Generation** | Admin must select profile | **First selector generates** (videographer or admin) | Faster ID assignment |
| Avg Pipeline Time | High (blocked) | Low (autonomous) | Significant |
| Team Ownership | Low | High | Quality boost |

---

*Document Version: 3.0*
*Created: January 2025*
*Last Updated: January 2025*
*Status: ✅ ALL QUESTIONS ANSWERED - READY FOR IMPLEMENTATION*

---

## Appendix: Profile Selection Flow Diagram

```
                    SCRIPT APPROVED
                          │
                          ▼
              ┌───────────────────────┐
              │  Admin Approves Script │
              │                       │
              │  Profile: [Optional]  │
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
   ┌────────────────┐         ┌────────────────┐
   │ Admin Selected │         │ Admin Skipped  │
   │    Profile     │         │    Profile     │
   └───────┬────────┘         └───────┬────────┘
           │                          │
           ▼                          │
   ┌────────────────┐                 │
   │ Content ID     │                 │
   │ Generated      │                 │
   │ (BCHXXX001)    │                 │
   └───────┬────────┘                 │
           │                          │
           ▼                          ▼
   ┌────────────────────────────────────────────┐
   │            PLANNING STAGE                  │
   │    (Script available for videographers)    │
   └─────────────────────┬──────────────────────┘
                         │
                         ▼
              ┌───────────────────────┐
              │  Videographer Picks   │
              │       Project         │
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
   ┌────────────────┐         ┌────────────────┐
   │ Profile        │         │ Profile        │
   │ Already Set    │         │ NOT Set        │
   │ (by Admin)     │         │                │
   └───────┬────────┘         └───────┬────────┘
           │                          │
           │                          ▼
           │                 ┌────────────────┐
           │                 │ ★ VIDEOGRAPHER │
           │                 │ MUST SELECT    │
           │                 │ PROFILE ★      │
           │                 └───────┬────────┘
           │                         │
           │                         ▼
           │                 ┌────────────────┐
           │                 │ Content ID     │
           │                 │ Generated      │
           │                 │ (BCHXXX001)    │
           │                 └───────┬────────┘
           │                         │
           └────────────┬────────────┘
                        │
                        ▼
              ┌───────────────────────┐
              │    SHOOTING STAGE     │
              │   (Content ID set)    │
              └───────────────────────┘
```

**Key Points:**
- Videographer selects profile because they know which account they're shooting for
- Admin CAN pre-select profile (optional) if they want to specify the target account
- Content ID is generated only once, by whoever selects profile first
- Once generated, Content ID is permanent (even if profile is later changed)
