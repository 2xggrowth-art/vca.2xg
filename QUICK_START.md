# ⚡ Quick Start - Production Workflow

## 🚀 Get Started in 3 Steps

### Step 1: Run SQL Migration (5 minutes)

1. Open https://supabase.com/dashboard
2. Go to your project → SQL Editor → New Query
3. Copy & paste [add-production-workflow.sql](./add-production-workflow.sql)
4. Click **Run**
5. ✅ Done! Tables and functions created

### Step 2: Create Test Users (2 minutes)

Run this in Supabase SQL Editor:

```sql
-- Update existing user emails with roles
UPDATE profiles SET role = 'VIDEOGRAPHER', full_name = 'John Camera'
WHERE email = 'your-videographer@email.com';

UPDATE profiles SET role = 'EDITOR', full_name = 'Jane Editor'
WHERE email = 'your-editor@email.com';

UPDATE profiles SET role = 'POSTING_MANAGER', full_name = 'Mike Posts'
WHERE email = 'your-posting@email.com';
```

Or create new users through Supabase Auth and then update their roles.

### Step 3: Test Assignment (2 minutes)

1. **Create Analysis** - Login as script writer, submit analysis
2. **Review & Approve** - Login as admin, review and approve
3. **Assign Team** - Click "View Details" → "Assign Team"
4. **Watch Magic** - Auto-assign videographer or manually select team

---

## 📋 What You Can Do Now

### As Admin/Creator:
- ✅ Review and score analyses (1-10 on 4 criteria)
- ✅ Approve/reject with feedback
- ✅ Assign videographer (manual or auto)
- ✅ Assign editor and posting manager
- ✅ View assigned team in analysis details
- ✅ Track production stage

### As Team Member:
- ✅ View assigned analyses
- ✅ See production requirements
- ✅ Track your workload

---

## 🎯 Key Features

### Auto-Assignment Algorithm
- Calculates workload per videographer
- Considers active projects in PRE_PRODUCTION, SHOOTING, SHOOT_REVIEW
- Doubles weight for URGENT priority
- Assigns to person with lowest workload

### Production Stages
1. **NOT_STARTED** - Approved, no team yet
2. **PRE_PRODUCTION** - Team assigned, planning
3. **SHOOTING** - Filming in progress
4. **SHOOT_REVIEW** - Reviewing footage
5. **EDITING** - Creating final edit
6. **EDIT_REVIEW** - Reviewing edit
7. **FINAL_REVIEW** - Final QA
8. **READY_TO_POST** - Approved for posting
9. **POSTED** - Published!

### Team Roles
- 🎥 **VIDEOGRAPHER** - Films content
- 🎬 **EDITOR** - Edits videos
- 📢 **POSTING_MANAGER** - Posts & tracks
- 👑 **CREATOR** - Oversees production

---

## 🎨 UI Preview

**When you view an approved analysis, you'll see:**

```
┌─────────────────────────────────────────┐
│  Production Team                         │
├─────────────────────────────────────────┤
│  🎥 Videographer: John Camera           │
│  🎬 Editor: Jane Editor                 │
│  📢 Posting Manager: Mike Posts         │
│  Production Stage: PRE_PRODUCTION       │
└─────────────────────────────────────────┘

[Review & Score]  [Assign Team]  [Delete]
```

---

## 📁 File Structure

```
ViralContentAnalyzer/
├── add-production-workflow.sql          # Database migration
├── SETUP_CHECKLIST.md                   # Complete setup guide
├── PRODUCTION_WORKFLOW_GUIDE.md         # Detailed documentation
├── QUICK_START.md                       # This file!
├── frontend/
│   ├── src/
│   │   ├── types/index.ts              # TypeScript types
│   │   ├── services/
│   │   │   └── assignmentService.ts    # Assignment API
│   │   ├── components/
│   │   │   └── AssignTeamModal.tsx     # Assignment modal
│   │   └── pages/
│   │       └── AdminDashboard.tsx      # Admin page (updated)
```

---

## 🔧 API Methods You Can Use

```typescript
import { assignmentService } from '@/services/assignmentService';

// Assign team
await assignmentService.assignTeam(analysisId, {
  videographerId: 'user-uuid',
  editorId: 'user-uuid',
  postingManagerId: 'user-uuid',
  autoAssignVideographer: true,
});

// Get my assigned work
const { data, total } = await assignmentService.getMyAssignedAnalyses();

// Update production stage
await assignmentService.updateProductionStage(analysisId, {
  production_stage: 'SHOOTING',
  production_notes: 'Started filming today',
});

// Get users by role
const videographers = await assignmentService.getUsersByRole('VIDEOGRAPHER');
```

---

## ✅ Checklist

- [ ] SQL migration run in Supabase
- [ ] At least 1 videographer user created
- [ ] At least 1 analysis approved
- [ ] Clicked "Assign Team" button
- [ ] Saw team assignment modal
- [ ] Successfully assigned team
- [ ] Team appears in analysis details

---

## 🎉 You're Done!

Your production workflow is now live!

**Next:** See [PRODUCTION_WORKFLOW_GUIDE.md](./PRODUCTION_WORKFLOW_GUIDE.md) for:
- Complete workflow details
- Database schema
- RLS policies
- User journeys
- Future enhancements

**Questions?** Check [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) for troubleshooting.
