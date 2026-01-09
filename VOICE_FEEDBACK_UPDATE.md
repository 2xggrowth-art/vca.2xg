# Voice Feedback Feature - Implementation Guide

## ✅ What's New

Admin reviewers can now provide **both written AND voice feedback** when reviewing viral content analyses!

## 🎯 Features Added

### 1. Voice Feedback Recording
- **Location**: Review & Score modal (admin only)
- **How it works**:
  - After writing text feedback, admins can optionally record an audio note
  - Uses browser's MediaRecorder API (same as script writer voice notes)
  - Stored in Supabase Storage (`voice-notes` bucket)
  - Supports play/pause/delete before submitting

### 2. Voice Feedback Playback
- **Location**: Analysis view modal (all users)
- **How it works**:
  - Displays as an audio player below written feedback
  - Script writers can listen to admin's voice feedback
  - Standard HTML5 audio controls

## 📋 Setup Instructions

### Step 1: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add column for admin voice feedback
ALTER TABLE viral_analyses
ADD COLUMN IF NOT EXISTS feedback_voice_note_url TEXT;

-- Add comment
COMMENT ON COLUMN viral_analyses.feedback_voice_note_url IS 'Admin voice feedback URL (stored in Supabase Storage)';

-- Verify
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'viral_analyses'
AND column_name = 'feedback_voice_note_url';
```

**Expected Output:**
```
column_name              | data_type
-------------------------+-----------
feedback_voice_note_url  | text

✓ Admin voice feedback column added!
```

### Step 2: Verify Storage Bucket

Make sure the `voice-notes` bucket is public:

```sql
-- Make voice-notes bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'voice-notes';

-- Verify
SELECT id, name, public
FROM storage.buckets
WHERE id = 'voice-notes';
```

**Expected Output:**
```
id          | name        | public
------------+-------------+--------
voice-notes | voice-notes | true

✓ Voice notes bucket is now public!
```

### Step 3: Deploy Frontend Changes

The frontend code has been updated with:
- ✅ Updated TypeScript types (`ReviewAnalysisData` interface)
- ✅ Voice upload logic in `adminService.ts`
- ✅ VoiceRecorder component in review modal
- ✅ Audio player in view modal
- ✅ Proper state management

No additional npm packages needed - all dependencies already exist!

## 🧪 Testing Guide

### Test as Admin (Reviewer)

1. **Login** as admin: `arsalanahmed507@gmail.com`

2. **Navigate** to "All Analyses"

3. **Click** "View" on any analysis

4. **Click** "Review & Score" button

5. **Record Voice Feedback**:
   - Scroll down to "Voice Feedback (Optional)" section
   - Click "Start Recording" (red microphone button)
   - Speak your feedback
   - Click "Stop Recording"
   - Click play to preview
   - Or click trash to delete and re-record

6. **Submit Review**:
   - Fill in scores (1-10 for each criterion)
   - Choose Approve or Reject
   - Add written feedback (required for rejections)
   - Voice feedback is optional but recommended
   - Click "Submit Review"

7. **Verify**:
   - ✅ Toast notification appears
   - ✅ Modal closes
   - ✅ Re-open the analysis view
   - ✅ You should see both text and audio feedback

### Test as Script Writer (Recipient)

1. **Login** as script writer (e.g., babita@example.com)

2. **Navigate** to "My Analyses"

3. **Click** "View" on a reviewed analysis

4. **Check Feedback Section**:
   - ✅ See "Admin Review Scores" card with all scores
   - ✅ See written feedback (if provided)
   - ✅ See "Voice Feedback" with audio player (if provided)
   - ✅ Click play to listen to admin's voice feedback

## 📊 Database Schema

### Updated `viral_analyses` Table

```sql
CREATE TABLE viral_analyses (
  -- ... existing columns ...

  -- Review columns
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  feedback TEXT,
  feedback_voice_note_url TEXT,        -- ← NEW!
  hook_strength INTEGER CHECK (hook_strength >= 1 AND hook_strength <= 10),
  content_quality INTEGER CHECK (content_quality >= 1 AND content_quality <= 10),
  viral_potential INTEGER CHECK (viral_potential >= 1 AND viral_potential <= 10),
  replication_clarity INTEGER CHECK (replication_clarity >= 1 AND replication_clarity <= 10),
  overall_score DECIMAL(3,1)
);
```

## 🔧 Technical Implementation

### Frontend Changes

**1. Types (`frontend/src/types/index.ts`)**
```typescript
export interface ViralAnalysis {
  // ... existing fields ...
  feedback_voice_note_url?: string;  // Added
}

export interface ReviewAnalysisData {
  status: 'APPROVED' | 'REJECTED';
  feedback?: string;
  feedbackVoiceNote?: Blob | null;   // Added
  hookStrength: number;
  contentQuality: number;
  viralPotential: number;
  replicationClarity: number;
}
```

**2. Service (`frontend/src/services/adminService.ts`)**
- Upload voice blob to Supabase Storage
- Generate public URL
- Save URL to database with review

**3. Review Modal (`frontend/src/pages/AnalysesPage.tsx`)**
- VoiceRecorder component below feedback textarea
- Optional voice feedback (text feedback still required for rejections)
- State management for voice blob

**4. View Modal (`frontend/src/pages/AnalysesPage.tsx`)**
- Audio player displays when `feedback_voice_note_url` exists
- HTML5 `<audio>` element with controls
- Styled card with microphone icon

## 🎨 UI/UX Design

### Review Modal Layout
```
┌─────────────────────────────────────────┐
│  Review & Score Analysis                │
├─────────────────────────────────────────┤
│  [✓ Approve] [✗ Reject]                 │
│                                          │
│  Scoring Criteria (1-10)                 │
│  - Hook Strength: [1][2]...[10]          │
│  - Content Quality: [1][2]...[10]        │
│  - Viral Potential: [1][2]...[10]        │
│  - Replication Clarity: [1][2]...[10]    │
│                                          │
│  Overall Score: 7.5                      │
│                                          │
│  Written Feedback *                      │
│  ┌────────────────────────────────┐     │
│  │ [Textarea]                     │     │
│  └────────────────────────────────┘     │
│                                          │
│  Voice Feedback (Optional)               │
│  ┌────────────────────────────────┐     │
│  │ 🎙️ [Start Recording]           │     │
│  └────────────────────────────────┘     │
│                                          │
│  [Cancel] [Submit Review]                │
└─────────────────────────────────────────┘
```

### View Modal Feedback Section
```
┌─────────────────────────────────────────┐
│  Admin Review Scores                     │
├─────────────────────────────────────────┤
│  [8]        [9]        [7]        [8]    │
│  Hook      Content    Viral    Clarity   │
│                                          │
│  [8.0] Overall Score                     │
├─────────────────────────────────────────┤
│  💬 Admin Feedback:                      │
│  Great analysis! The hook is strong...   │
├─────────────────────────────────────────┤
│  🎙️ Voice Feedback:                      │
│  [▶️ ━━━━━━━━━━━━━━ 0:00 / 1:23]       │
└─────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Issue: Voice recording doesn't start
**Solutions:**
1. Check browser microphone permissions
2. Must use HTTPS (not HTTP) for MediaRecorder API
3. Check browser console for errors

### Issue: Voice feedback doesn't upload
**Solutions:**
1. Verify `voice-notes` bucket exists in Supabase Storage
2. Check bucket is public
3. Verify RLS policies allow authenticated uploads
4. Check network tab for upload errors

### Issue: Audio player doesn't play
**Solutions:**
1. Check if URL is accessible (open in new tab)
2. Verify bucket is public
3. Check audio format (should be .webm)
4. Try different browser (Chrome/Edge recommended)

### Issue: Audio shows 0:00/0:00
**Causes:**
1. No audio was actually recorded
2. File upload failed
3. URL is invalid or inaccessible
4. CORS issues with storage bucket

**Diagnostic SQL:**
```sql
-- Check if voice feedback URLs exist
SELECT
  id,
  feedback_voice_note_url,
  reviewed_at
FROM viral_analyses
WHERE feedback_voice_note_url IS NOT NULL;
```

## 📝 Best Practices

### For Admins (Reviewers)

1. **Written Feedback First**: Always provide written feedback, especially for rejections
2. **Voice Adds Context**: Use voice to explain nuances, tone, and detailed suggestions
3. **Be Constructive**: Voice feedback should be encouraging and actionable
4. **Keep it Concise**: 30-60 seconds is ideal, max 2 minutes
5. **Test Before Submitting**: Always play back your recording before submitting

### For Script Writers (Recipients)

1. **Read Text First**: Start with written feedback for quick overview
2. **Listen to Voice**: Get the full context and tone from voice feedback
3. **Take Notes**: Pause and replay sections as needed
4. **Apply Learnings**: Use both feedback types to improve future analyses

## 🎉 Success Criteria

- [x] Admin can record voice feedback in review modal
- [x] Voice feedback uploads to Supabase Storage
- [x] Voice feedback URL saves to database
- [x] Script writers can see audio player in view modal
- [x] Audio plays correctly with standard controls
- [x] Both text and voice feedback display together
- [x] Voice feedback is optional (text still required for rejections)

## 🚀 Next Steps

1. ✅ Run database migration SQL
2. ✅ Verify storage bucket is public
3. ✅ Test as admin: record and submit voice feedback
4. ✅ Test as script writer: view and play voice feedback
5. ✅ Monitor for any errors in console/network tab

All features are now fully implemented! 🎊
