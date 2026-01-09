# Google Drive Direct Upload Setup Guide

This guide will help you set up direct video upload to Google Drive for your Viral Content Analyzer application.

## Overview

The Google Drive integration allows:
- **Videographers** to upload videos directly through the app
- Automatic upload to your designated Google Drive folder
- Real-time upload progress tracking
- Automatic shareable link generation
- No manual file upload required

## Prerequisites

- Google Account with access to Google Cloud Console
- Admin access to the Viral Content Analyzer application
- A Google Drive folder for storing production files

---

## Step 1: Set Up Google Cloud Project

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" dropdown at the top
3. Click "New Project"
4. Enter project name: `Viral Content Analyzer` (or your preferred name)
5. Click "Create"

### 1.2 Enable Google Drive API

1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click the **"Enable"** button

---

## Step 2: Create API Credentials

### 2.1 Create API Key

1. Go to **APIs & Services > Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. Copy the generated API key (starts with `AIza...`)
5. Click **"RESTRICT KEY"** (recommended for security)
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Add your domain: `https://yourdomain.com/*` (or `http://localhost:5173/*` for development)
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Drive API" from the list
6. Click **"Save"**

### 2.2 Create OAuth 2.0 Client ID

1. Still in **APIs & Services > Credentials**
2. Click **"+ CREATE CREDENTIALS"** again
3. Select **"OAuth client ID"**
4. If prompted to configure consent screen:
   - Click "Configure Consent Screen"
   - Choose **"External"** user type
   - Fill in required fields:
     - App name: `Viral Content Analyzer`
     - User support email: Your email
     - Developer contact information: Your email
   - Click "Save and Continue"
   - Skip "Scopes" (click "Save and Continue")
   - Add test users if needed (optional for now)
   - Click "Save and Continue"
5. Back to Create OAuth client ID:
   - Application type: **"Web application"**
   - Name: `Viral Content Analyzer Web Client`
   - Authorized JavaScript origins:
     - Add: `http://localhost:5173` (for development)
     - Add: `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - Add: `http://localhost:5173`
     - Add: `https://yourdomain.com`
6. Click **"Create"**
7. Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)

---

## Step 3: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder: **"Viral Content Production"** (or your preferred name)
3. Right-click the folder → **"Share"**
4. Set sharing permissions:
   - Option 1: Share with specific team members' email addresses
   - Option 2: Get link → Set to "Anyone with the link" → "Editor"
5. Copy the folder URL (looks like: `https://drive.google.com/drive/folders/1ABC...XYZ`)

---

## Step 4: Configure in Application

### 4.1 Login as Admin

1. Open the Viral Content Analyzer application
2. Login with your SUPER_ADMIN or CREATOR account

### 4.2 Configure Google Drive Settings

1. Navigate to **Settings** (gear icon in sidebar)
2. Click on **"Google Drive Settings"** tab
3. Enter the credentials:

   **Google API Key:**
   ```
   AIzaSy... (paste your API key from Step 2.1)
   ```

   **Google Client ID:**
   ```
   123456789-abc.apps.googleusercontent.com (paste your Client ID from Step 2.2)
   ```

   **Google Drive Folder URL:**
   ```
   https://drive.google.com/drive/folders/1ABC...XYZ (paste your folder URL from Step 3)
   ```

4. Click **"Save Settings"**

---

## Step 5: Test the Integration

### 5.1 As Videographer

1. Login as a videographer user
2. Navigate to an assigned project
3. Click **"Add File"**
4. Click the upload area to select a video file
5. You should see:
   - File selection confirmation
   - Upload progress bar (0% → 100%)
   - Success message with green checkmark
6. The file should automatically appear in the Google Drive folder
7. The shareable link should be saved in the database

### 5.2 Verify in Google Drive

1. Go to your Google Drive folder
2. Verify the uploaded file appears
3. Check that the file has proper permissions

---

## Troubleshooting

### Error: "Google Drive API credentials not configured"

**Solution:** Make sure you've:
1. Entered both API Key and Client ID in Settings
2. Clicked "Save Settings"
3. Refreshed the page after saving

### Error: "Upload failed" or "Authorization error"

**Possible causes:**
1. **API Key restrictions too strict**
   - Go to Google Cloud Console → Credentials
   - Edit your API key
   - Check HTTP referrer restrictions
   - Make sure your current domain is allowed

2. **OAuth consent screen not configured**
   - Complete Step 2.2 fully
   - Add your email as a test user if in "Testing" mode

3. **Wrong Client ID format**
   - Make sure Client ID ends with `.apps.googleusercontent.com`
   - Don't use Client Secret (that's different)

### Files not appearing in Google Drive

**Check:**
1. Folder ID is correct (extracted from folder URL)
2. Folder has proper sharing permissions
3. Check browser console for errors (F12 → Console tab)

### "Permission denied" when accessing files

**Solution:**
- Share the Google Drive folder with all team members
- Or set folder to "Anyone with the link can edit"

---

## Security Best Practices

### 1. API Key Security
- Restrict API key to specific domains only
- Never commit API keys to public repositories
- Rotate keys periodically

### 2. OAuth Security
- Only add necessary OAuth scopes
- Keep consent screen in "Testing" mode until ready for production
- Add authorized domains in OAuth settings

### 3. Drive Folder Security
- Use specific sharing instead of "Anyone with link" when possible
- Create separate folders for different projects
- Regularly audit folder permissions

---

## Advanced Configuration

### Environment Variables (Optional)

Instead of using the Settings page, you can set default values in `.env`:

```bash
# Google Drive API Configuration
VITE_GOOGLE_API_KEY=AIzaSy...
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

**Note:** Settings page values override environment variables.

### Project-Specific Folders

You can create different folders for different projects:
1. Create multiple folders in Google Drive
2. When assigning team members, you can specify a custom folder URL
3. Each project can upload to its own dedicated folder

---

## Common Questions

**Q: Do videographers need their own Google accounts?**
A: No. The integration uses your (admin's) Google Cloud credentials. Videographers just need access to the app.

**Q: What's the file size limit?**
A: Currently set to 500MB per file. This can be adjusted in the code if needed.

**Q: Can we use Google Shared Drives?**
A: Yes! Just use the Shared Drive folder URL in the settings.

**Q: What file types are supported?**
A: Any video format (MP4, MOV, AVI, etc.). The uploader accepts `video/*` MIME types.

**Q: What happens if upload fails mid-way?**
A: Users can retry the upload. Google Drive handles resumable uploads automatically.

---

## Support

If you encounter issues not covered in this guide:
1. Check browser console (F12 → Console) for error messages
2. Verify all credentials are correct in Settings
3. Test with a small video file first
4. Check Google Cloud Console quotas and limits

---

## Summary Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Google Drive API
- [ ] Created and restricted API Key
- [ ] Created OAuth 2.0 Client ID
- [ ] Configured OAuth consent screen
- [ ] Created Google Drive folder with sharing permissions
- [ ] Entered credentials in app Settings
- [ ] Tested upload with a sample video file
- [ ] Verified file appears in Google Drive
- [ ] Confirmed team members can access uploaded files

**You're all set!** Videographers can now upload files directly through the app. 🎉
