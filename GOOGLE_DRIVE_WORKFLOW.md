# Google Drive Video Production Workflow

## Overview
This workflow allows seamless collaboration between Videographers, Editors, and the team using Google Drive as the central file storage.

## Workflow Steps

### 1. **Admin Assigns Team & Sets Google Drive Folder**
- Admin reviews and approves a script
- Admin assigns Videographer and Editor to the project
- Admin provides the Google Drive folder URL where raw footage should be uploaded

### 2. **Videographer Shoots & Uploads Raw Footage**
- Videographer views assigned projects in their dashboard
- Videographer shoots the video according to the script
- Videographer uploads raw footage files to the provided Google Drive folder
- Videographer logs the files in the system (adds file URLs, descriptions)
- Videographer updates production stage to "SHOOT_REVIEW" or "EDITING"

### 3. **Editor Accesses & Downloads Raw Footage**
- Editor views assigned projects in their dashboard
- Editor sees the Google Drive folder URL and all uploaded raw footage files
- Editor downloads the raw footage from Google Drive
- Editor edits the video

### 4. **Editor Uploads Edited Video**
- Editor uploads the edited video to a designated Google Drive folder
- Editor logs the edited video in the system
- Editor updates production stage to "EDIT_REVIEW" or "FINAL_REVIEW"

### 5. **Final Review & Publishing**
- Posting Manager or Admin reviews the final video
- Once approved, production stage is updated to "READY_TO_POST"
- Posting Manager uploads the video to social media platforms
- Updates production stage to "POSTED"

## Database Schema

### New Fields in `viral_analyses` Table:
- `raw_footage_drive_url` - Google Drive folder URL for raw footage
- `edited_video_drive_url` - Google Drive folder URL for edited videos
- `final_video_url` - Final published video URL

### New `production_files` Table:
Tracks all files associated with a project:
- `id` - Unique identifier
- `analysis_id` - Reference to the viral analysis/project
- `uploaded_by` - User who uploaded the file
- `file_name` - Name of the file
- `file_type` - Type: RAW_FOOTAGE, EDITED_VIDEO, FINAL_VIDEO, ASSET, OTHER
- `file_url` - Google Drive URL or direct file URL
- `file_size` - File size in bytes
- `mime_type` - MIME type of the file
- `description` - Description of the file
- `upload_stage` - Production stage when uploaded
- `is_primary` - Mark primary/final version
- `created_at` - Upload timestamp
- `updated_at` - Last update timestamp

## User Roles & Permissions

### Videographer Can:
- View assigned projects
- See Google Drive folder URLs
- Add raw footage file records
- Update production stage (PRE_PRODUCTION → SHOOTING → SHOOT_REVIEW)
- Add notes about the shoot

### Editor Can:
- View assigned projects
- See all uploaded raw footage files
- Download files from Google Drive
- Add edited video file records
- Update production stage (EDITING → EDIT_REVIEW → FINAL_REVIEW)
- Add notes about the edit

### Posting Manager Can:
- View projects in final stages
- Access final edited videos
- Update production stage to READY_TO_POST or POSTED
- Add publishing notes

### Admin/Creator Can:
- Set initial Google Drive folder URLs
- View all files for all projects
- Manage all aspects of production

## Security (RLS Policies)

- Team members can only view and upload files for projects they're assigned to
- Users can update/delete only files they uploaded
- Admins can manage all files
- Script writers can view files for their own scripts

## Next Steps

After running the SQL setup:
1. Update Videographer Dashboard to include:
   - Google Drive folder URL display
   - File upload interface
   - File list with descriptions

2. Update Editor Dashboard to include:
   - Raw footage file list
   - Download links
   - Edited video upload interface

3. Add file management section to Admin Dashboard for monitoring all uploads

4. Consider adding real-time notifications when files are uploaded
