# Google Drive Direct Upload - Quick Start ⚡

## 🎯 What Changed?

**BEFORE:** Videographers had to manually upload to Google Drive, then copy/paste the link
**NOW:** Videographers upload directly through the app with one click!

---

## 🚀 Setup (One-Time, Admin Only)

### Step 1: Get Google Credentials (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Drive API**
4. Create **API Key** and **OAuth Client ID**
5. Copy both credentials

### Step 2: Configure in App (1 minute)

1. Login as Admin
2. Go to **Settings** → **Google Drive Settings** tab
3. Paste:
   - Google API Key
   - Google Client ID
   - Google Drive Folder URL
4. Click **Save Settings**

✅ **Done!** Your team can now upload directly.

---

## 📹 How Videographers Use It

### New Upload Flow:

1. Open assigned project
2. Click **"Add File"** button
3. Enter file name and type (optional)
4. Click upload area → Select video file
5. Watch progress bar → Done! ✅

**That's it!** The file is automatically uploaded to Google Drive and saved to the database.

---

## 📋 Quick Reference

### For Admins

| Setting | Where to Get It | Example |
|---------|-----------------|---------|
| API Key | Google Cloud Console → Credentials | `AIzaSy...` |
| Client ID | Google Cloud Console → OAuth 2.0 | `123-abc.apps.googleusercontent.com` |
| Folder URL | Google Drive → Right-click folder → Share | `drive.google.com/drive/folders/...` |

### For Videographers

| Action | Steps |
|--------|-------|
| Upload file | Click "Add File" → Select video → Wait for progress bar |
| Check status | Progress bar shows 0% → 100% |
| Cancel upload | Click "Cancel" button before completion |
| Upload another | Click "Add File" again after success |

---

## ❓ Troubleshooting

### "API credentials not configured"
→ Admin needs to complete Setup Step 2 above

### Upload fails immediately
→ Check internet connection and file size (<500MB)

### OAuth popup blocked
→ Allow popups for this site in browser settings

### File not in Google Drive
→ Admin should verify folder URL in Settings

---

## 📚 Need More Help?

- **Full Setup Guide:** See [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md)
- **Implementation Details:** See [GOOGLE_DRIVE_INTEGRATION_SUMMARY.md](./GOOGLE_DRIVE_INTEGRATION_SUMMARY.md)
- **Browser Console:** Press F12 → Console tab to see detailed errors

---

## ✨ Benefits

| Before | After |
|--------|-------|
| Manual upload to Drive | Direct upload from app |
| Copy/paste link | Automatic link generation |
| 5+ steps | 1 click |
| No progress visibility | Real-time progress bar |
| Errors go unnoticed | Clear success/error messages |

---

**🎉 You're all set! Happy uploading!**
