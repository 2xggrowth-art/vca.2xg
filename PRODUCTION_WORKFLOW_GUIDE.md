# Production Workflow System - Implementation Guide

## 🎯 Overview

This implements a Video Hub-style production workflow where approved analyses move through a full production pipeline with team assignments.

---

## 📊 Complete Workflow

```
1. SCRIPT CREATION
   └─ Script Writer submits analysis → Status: PENDING

2. ADMIN/CREATOR REVIEW
   ├─ Review with 4 scoring criteria (1-10 each)
   ├─ Approve or Reject with feedback
   └─ Status: APPROVED → Production Stage: NOT_STARTED

3. TEAM ASSIGNMENT (Admin/Creator)
   ├─ Assign Videographer (required, can auto-assign)
   ├─ Assign Editor (optional)
   ├─ Assign Posting Manager (optional)
   └─ Production Stage → PRE_PRODUCTION

4. SHOOTING PHASE
   ├─ Videographer uploads video files
   ├─ Review and approval process
   └─ Production Stage → SHOOTING → SHOOT_REVIEW

5. EDITING PHASE
   ├─ Editor creates final video
   ├─ Review and approval
   └─ Production Stage → EDITING → EDIT_REVIEW

6. FINAL REVIEW
   ├─ Quality assurance
   └─ Production Stage → FINAL_REVIEW

7. POSTING
   ├─ Posting Manager schedules/posts
   └─ Production Stage → READY_TO_POST → POSTED
```

---

## 👥 User Roles

### 1. SUPER_ADMIN
- Full system access
- Can manage all organizations
- Can perform all actions

### 2. SCRIPT_WRITER
- Creates viral content analyses
- Can edit own pending analyses
- Views own analyses and assigned tasks

### 3. CREATOR
- Reviews and scores analyses (like admin)
- Assigns production teams
- Manages production workflow
- Tracks all projects

### 4. VIDEOGRAPHER
- Receives shooting assignments
- Uploads video files
- Marks takes and best shots
- Updates shooting status

### 5. EDITOR
- Receives editing assignments
- Creates edited videos
- Submits for review
- Tracks editing progress

### 6. POSTING_MANAGER
- Receives posting assignments
- Schedules content
- Publishes to platforms
- Tracks performance

---

## 🗄️ Database Schema

### New Table: `project_assignments`

```sql
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES viral_analyses(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER')),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(analysis_id, user_id, role)
);
```

**Purpose**: Tracks which users are assigned to which roles for each analysis

**Key Features**:
- One videographer, editor, and posting manager per analysis
- Tracks who made the assignment and when
- Cascades on delete (if analysis deleted, assignments removed)

### Updated Table: `viral_analyses`

**New Production Fields**:
```sql
-- Workflow tracking
production_stage TEXT  -- Current stage in production
priority TEXT          -- LOW, NORMAL, HIGH, URGENT
deadline TIMESTAMPTZ   -- Production deadline
budget DECIMAL         -- Production budget
production_notes TEXT  -- Notes/instructions

-- Timestamps
production_started_at TIMESTAMPTZ
production_completed_at TIMESTAMPTZ
```

**Production Stages**:
1. `NOT_STARTED` - Approved but not yet in production
2. `PRE_PRODUCTION` - Team assigned, planning phase
3. `SHOOTING` - Actively filming
4. `SHOOT_REVIEW` - Reviewing footage
5. `EDITING` - Creating final edit
6. `EDIT_REVIEW` - Reviewing edit
7. `FINAL_REVIEW` - Final quality check
8. `READY_TO_POST` - Approved for posting
9. `POSTED` - Published to platforms

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration

Execute the SQL script in Supabase:

```bash
File: add-production-workflow.sql
```

This will:
- ✅ Add new user roles (CREATOR, VIDEOGRAPHER, EDITOR, POSTING_MANAGER)
- ✅ Create `project_assignments` table
- ✅ Add production fields to `viral_analyses`
- ✅ Set up RLS policies for team access
- ✅ Create helper functions for workload balancing

### Step 2: Create User Accounts

Create users with different roles in Supabase:

```sql
-- Example: Create a videographer
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  'user-uuid-here',
  'videographer@example.com',
  'VIDEOGRAPHER',
  'John Camera'
);

-- Create editor
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  'user-uuid-here',
  'editor@example.com',
  'EDITOR',
  'Jane Editor'
);

-- Create posting manager
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  'user-uuid-here',
  'posting@example.com',
  'POSTING_MANAGER',
  'Mike Posts'
);
```

### Step 3: Update Frontend (Already Done)

The following have been created:
- ✅ TypeScript types with new roles and workflow states
- ✅ `assignmentService.ts` - Assignment API functions
- ✅ `AssignTeamModal.tsx` - Team assignment UI component

---

## 🎨 Frontend Components

### AssignTeamModal Component

**Location**: `frontend/src/components/AssignTeamModal.tsx`

**Features**:
- Assign Videographer (with auto-assign option)
- Assign Editor (optional)
- Assign Posting Manager (optional)
- Auto-assignment uses workload balancing
- Beautiful gradient UI with role icons

**Usage**:
```tsx
import AssignTeamModal from '@/components/AssignTeamModal';

const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

<AssignTeamModal
  analysis={selectedAnalysis}
  isOpen={isAssignModalOpen}
  onClose={() => setIsAssignModalOpen(false)}
/>
```

---

## 🔌 API Functions

### assignmentService

**Location**: `frontend/src/services/assignmentService.ts`

**Methods**:

```typescript
// Assign team members to analysis
assignTeam(analysisId: string, data: AssignTeamData)
  → Returns: ViralAnalysis with assignments

// Auto-assign videographer by workload
autoAssignVideographer(analysisId: string)
  → Finds videographer with lowest workload
  → Returns: ViralAnalysis with videographer assigned

// Get analysis with all assignments
getAnalysisWithAssignments(analysisId: string)
  → Returns: ViralAnalysis with full team info

// Update production stage
updateProductionStage(analysisId: string, data)
  → Updates: production_stage, production_notes
  → Sets: production_completed_at if POSTED

// Update production details
updateProductionDetails(analysisId: string, data)
  → Updates: priority, deadline, budget, notes

// Get users by role (for dropdowns)
getUsersByRole(role: 'VIDEOGRAPHER' | 'EDITOR' | 'POSTING_MANAGER')
  → Returns: Profile[] for assignment dropdowns

// Get my assigned analyses
getMyAssignedAnalyses(productionStage?, page, pageSize)
  → Returns: Analyses where I'm assigned
  → Filter by production stage
  → Paginated results

// Remove assignment
removeAssignment(analysisId: string, role)
  → Unassigns user from specific role
```

---

## 🤖 Auto-Assignment Algorithm

### How It Works

**Function**: `autoAssignVideographer(analysisId)`

**Logic**:
1. Fetch all users with role `VIDEOGRAPHER`
2. For each videographer, calculate workload:
   ```
   Base Workload = COUNT of assigned analyses in:
     - PRE_PRODUCTION
     - SHOOTING
     - SHOOT_REVIEW

   Urgent Penalty = COUNT of URGENT priority × 2

   Total Workload = Base Workload + Urgent Penalty
   ```
3. Assign to videographer with **lowest workload**
4. Create `project_assignment` record
5. Update production stage to `PRE_PRODUCTION`

**Database Function**:
```sql
get_videographer_workload(videographer_id UUID) RETURNS INTEGER
```

**Benefits**:
- ✅ Balanced workload across team
- ✅ Prioritizes urgent content
- ✅ Prevents overloading single person
- ✅ One-click assignment for admins

---

## 🔐 Permissions & Access Control

### RLS Policies

**project_assignments Table**:
- Users can view assignments for their own analyses
- Users can view their own assignments
- Admins/Creators can view all assignments
- Admins/Creators can create/update/delete assignments

**viral_analyses Table** (Updated):
- Production team can view analyses they're assigned to
- Creators have same access as admins
- Creators can update production stages

### Role Access Matrix

| Action | SCRIPT_WRITER | CREATOR | VIDEOGRAPHER | EDITOR | POSTING_MANAGER | SUPER_ADMIN |
|--------|---------------|---------|--------------|--------|-----------------|-------------|
| Create Analysis | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Review & Score | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Assign Team | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Assigned | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Stage | ❌ | ✅ | ✅* | ✅* | ✅* | ✅ |
| Upload Video | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Submit Edit | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Post Content | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

\* Only for stages relevant to their role

---

## 🎯 Typical User Journeys

### Script Writer Journey
1. Login → Create Analysis
2. Fill form with hook, why viral, how to replicate
3. Record voice notes (optional)
4. Submit for review
5. Wait for admin/creator review
6. **NEW**: Receive notification when assigned to team
7. **NEW**: Track production progress
8. View final posted content

### Creator/Admin Journey
1. Login → View Pending Analyses
2. Click "Review & Score"
3. Rate 4 criteria (1-10 each)
4. Approve with feedback (text + voice)
5. **NEW**: Click "Assign Team" on approved analysis
6. **NEW**: Select videographer (or auto-assign)
7. **NEW**: Optionally select editor and posting manager
8. **NEW**: Set priority and deadline
9. **NEW**: Track production through stages
10. Review video files and edits
11. Approve for posting

### Videographer Journey
1. Login → View "My Assignments"
2. **NEW**: See analyses assigned to me
3. **NEW**: Filter by production stage
4. Click on assignment → View analysis details
5. Read hook, strategy, requirements
6. Film content based on analysis
7. Upload video files
8. Mark best takes
9. Update status to SHOOT_REVIEW
10. Wait for approval

### Editor Journey
1. Login → View "My Assignments"
2. **NEW**: See analyses in EDITING stage
3. Download approved video files
4. Create edited video
5. Upload final edit
6. Submit for review
7. Make revisions if needed
8. Final approval

### Posting Manager Journey
1. Login → View "My Assignments"
2. **NEW**: See analyses in READY_TO_POST stage
3. Download final approved video
4. Schedule posting time
5. Select platforms (Instagram, TikTok, YouTube, etc.)
6. Publish content
7. Track performance metrics
8. Update status to POSTED

---

## 📱 UI Updates Needed

### 1. Admin Dashboard

**Add to AnalysesPage.tsx** (Approved Analyses Section):

```tsx
// After Review & Score button for APPROVED analyses
{analysis.status === 'APPROVED' && (
  <>
    <button onClick={() => openAssignModal(analysis)}>
      <UserGroupIcon className="w-5 h-5 mr-2" />
      {analysis.videographer ? 'Update Team' : 'Assign Team'}
    </button>

    {/* Show assigned team */}
    {analysis.videographer && (
      <div className="mt-2 flex space-x-2">
        <span className="badge">📹 {analysis.videographer.full_name}</span>
        {analysis.editor && (
          <span className="badge">🎬 {analysis.editor.full_name}</span>
        )}
        {analysis.posting_manager && (
          <span className="badge">📢 {analysis.posting_manager.full_name}</span>
        )}
      </div>
    )}
  </>
)}
```

### 2. Production Dashboard (New Page)

**Create**: `frontend/src/pages/ProductionDashboardPage.tsx`

**Features**:
- View all analyses in production
- Filter by stage (SHOOTING, EDITING, etc.)
- Kanban board view
- Timeline view
- Priority indicators
- Deadline warnings

### 3. My Assignments Page (For Team Members)

**Create**: `frontend/src/pages/MyAssignmentsPage.tsx`

**Features**:
- List of analyses assigned to logged-in user
- Filter by production stage
- Quick actions based on role:
  - Videographer: Upload video
  - Editor: Submit edit
  - Posting Manager: Schedule post
- Production stage progress indicator

---

## 🧪 Testing Guide

### Test 1: Role Creation
1. Create users with each new role
2. Verify each can login
3. Check permissions match matrix above

### Test 2: Team Assignment
1. Login as admin/creator
2. Approve an analysis
3. Click "Assign Team"
4. Select videographer manually → Submit
5. Verify assignment created
6. Verify production_stage = PRE_PRODUCTION

### Test 3: Auto-Assignment
1. Create multiple videographers
2. Assign some to existing analyses
3. Use auto-assign on new analysis
4. Verify assigned to videographer with lowest workload

### Test 4: Team Member View
1. Login as videographer
2. Navigate to "My Assignments"
3. Verify seeing only assigned analyses
4. Check details are visible

### Test 5: Production Stage Updates
1. Login as creator
2. Update stage from PRE_PRODUCTION → SHOOTING
3. Verify update saves
4. Check timestamps update correctly

### Test 6: Workload Balancing
1. Create 3 videographers
2. Assign 5 analyses to videographer A
3. Assign 2 analyses to videographer B
4. No assignments to videographer C
5. Auto-assign new analysis
6. Verify assigned to videographer C (lowest workload)

---

## 🚀 Next Steps

1. ✅ Run `add-production-workflow.sql` in Supabase
2. ✅ Create user accounts for each new role
3. ⏳ Update AnalysesPage.tsx to show "Assign Team" button
4. ⏳ Add AssignTeamModal to AnalysesPage
5. ⏳ Create Production Dashboard page
6. ⏳ Create My Assignments page
7. ⏳ Test complete workflow end-to-end
8. ⏳ Add stage transition validation
9. ⏳ Implement video upload (videographer)
10. ⏳ Implement edit submission (editor)
11. ⏳ Implement posting workflow (posting manager)

---

## 📋 File Checklist

### SQL
- ✅ `add-production-workflow.sql` - Complete database migration

### TypeScript Types
- ✅ `frontend/src/types/index.ts` - All types updated

### Services
- ✅ `frontend/src/services/assignmentService.ts` - Assignment API

### Components
- ✅ `frontend/src/components/AssignTeamModal.tsx` - Team assignment UI

### Pages (To Be Created)
- ⏳ Update `frontend/src/pages/AnalysesPage.tsx`
- ⏳ Create `frontend/src/pages/ProductionDashboardPage.tsx`
- ⏳ Create `frontend/src/pages/MyAssignmentsPage.tsx`
- ⏳ Create `frontend/src/pages/VideoUploadPage.tsx` (Videographer)
- ⏳ Create `frontend/src/pages/EditSubmissionPage.tsx` (Editor)
- ⏳ Create `frontend/src/pages/PostingPage.tsx` (Posting Manager)

---

## 🎉 Benefits

1. **Clear Workflow**: Everyone knows their role and tasks
2. **Balanced Workload**: Auto-assignment prevents bottlenecks
3. **Accountability**: Track who did what and when
4. **Progress Tracking**: See production status at a glance
5. **Role-Based Access**: Users only see relevant information
6. **Scalable**: Supports multiple team members in each role
7. **Audit Trail**: Complete history of assignments and changes

---

**Version**: 1.0
**Last Updated**: January 8, 2026
**Status**: Database & Services Complete, UI In Progress
