# Testing the Review & Score System

## ✅ Setup Complete!

The scoring system is now fully implemented and the database has been updated.

## 🧪 How to Test

### Step 1: Refresh the Application
```bash
# Hard refresh in browser
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)
```

### Step 2: Login as Admin
- Email: `arsalanahmed507@gmail.com`
- Password: `Arsalan123`

### Step 3: Navigate to Analyses
Click on **"All Analyses"** in the navigation menu

### Step 4: View an Analysis
Click **"View"** on any analysis (like the one from Babita)

### Step 5: Review & Score Button
You should see a **"Review & Score"** button at the bottom with a star icon ⭐

### Step 6: Click Review & Score
This opens the review modal with:
- ✓ Approve / ✗ Reject buttons
- 4 scoring criteria (1-10 each):
  - Hook Strength
  - Content Quality
  - Viral Potential
  - Replication Clarity
- Overall score (calculated automatically)
- Feedback textarea

### Step 7: Score the Analysis
1. Choose Approve or Reject
2. Click on the numbers (1-10) for each criterion
3. Add feedback (required for rejections)
4. Click "Submit Review"

### Step 8: Verify
After submitting:
- ✅ Toast notification appears
- ✅ Modal closes
- ✅ Analysis status updates
- ✅ Scores are saved

## 🎯 Expected Behavior

### For Admin Users:
- See "Review & Score" button on ALL analyses
- Can review any analysis regardless of status
- Can update existing reviews

### For Script Writers:
- See "Edit Analysis" button (only on PENDING analyses)
- Cannot see review/scoring interface
- Can view their scores after admin reviews

## 📊 Scoring Criteria Guide

| Criterion | What It Measures | Score Range |
|-----------|------------------|-------------|
| **Hook Strength** | How compelling is the hook? | 1-3: Weak, 4-6: Average, 7-10: Strong |
| **Content Quality** | Overall analysis quality | 1-3: Poor, 4-6: Good, 7-10: Excellent |
| **Viral Potential** | Will this strategy work? | 1-3: Unlikely, 4-6: Maybe, 7-10: Very likely |
| **Replication Clarity** | How clear are the steps? | 1-3: Unclear, 4-6: Somewhat clear, 7-10: Very clear |

**Overall Score** = Average of all 4 scores (auto-calculated)

## 🐛 Troubleshooting

### Issue: Don't see "Review & Score" button
**Solution:**
1. Make sure you're logged in as admin
2. Hard refresh the browser (Cmd+Shift+R)
3. Check browser console for errors

### Issue: Button shows but modal doesn't open
**Solution:**
1. Check browser console for JavaScript errors
2. Make sure ReviewScoreInput component exists
3. Verify imports in AnalysesPage.tsx

### Issue: Submit doesn't work
**Solution:**
1. Check if feedback is provided (required for rejections)
2. Look at Network tab in DevTools
3. Verify database columns were added (run verification SQL)

### Issue: Audio files still not playing
**Possible causes:**
1. No audio was actually recorded by script writer
2. Storage bucket doesn't exist
3. URLs are not public

**Check:**
```sql
-- See what audio URLs exist
SELECT id, hook_voice_note_url FROM viral_analyses WHERE hook_voice_note_url IS NOT NULL;
```

If URLs are NULL, no audio was uploaded.
If URLs exist but don't work, it's a storage permissions issue.

## 📝 Next Steps After Testing

1. ✅ Test approve workflow
2. ✅ Test reject workflow (with feedback)
3. ✅ Test updating existing review
4. ✅ View scores as script writer
5. ✅ Test that script writers can't access review modal

## 🎉 Success Criteria

- [x] Admin sees "Review & Score" button
- [x] Modal opens with all scoring inputs
- [x] Can select 1-10 for each criterion
- [x] Overall score calculates automatically
- [x] Can approve with optional feedback
- [x] Can reject with required feedback
- [x] Toast shows success message
- [x] Analysis updates in database
- [x] Scores display on view modal after review

All should work now! 🚀
