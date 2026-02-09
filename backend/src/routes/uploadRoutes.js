/**
 * File Upload Routes
 * Handles video uploads to Google Drive (replaces Supabase Storage)
 */

const express = require('express');
const multer = require('multer');
const googleDriveUploadService = require('../services/googleDriveUploadService');
const { verifyAuth } = require('../middleware/jwtAuth');

const router = express.Router();

// Configure multer for memory storage (files stored in RAM temporarily)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow video and audio files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  },
});

/**
 * Upload raw footage (for videographers)
 * POST /api/upload/raw-footage
 */
router.post('/raw-footage', verifyAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    const baseFolderId = process.env.GOOGLE_DRIVE_RAW_FOOTAGE_FOLDER_ID;

    if (!baseFolderId) {
      return res.status(500).json({ error: 'Raw footage folder not configured' });
    }

    const fileName = projectId
      ? `[${projectId}] ${req.file.originalname}`
      : req.file.originalname;

    const result = await googleDriveUploadService.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype,
      baseFolderId,
      {
        description: `Raw footage for ${projectId || 'project'}`,
        properties: {
          uploadedBy: req.user.email,
          projectId: projectId || '',
          fileType: 'raw_footage',
        },
      }
    );

    res.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      size: result.size,
    });
  } catch (error) {
    console.error('Raw footage upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload edited video (for editors)
 * POST /api/upload/edited-video
 */
router.post('/edited-video', verifyAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    const baseFolderId = process.env.GOOGLE_DRIVE_EDITED_VIDEO_FOLDER_ID;

    if (!baseFolderId) {
      return res.status(500).json({ error: 'Edited video folder not configured' });
    }

    const fileName = projectId
      ? `[${projectId}] ${req.file.originalname}`
      : req.file.originalname;

    const result = await googleDriveUploadService.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype,
      baseFolderId,
      {
        description: `Edited video for ${projectId || 'project'}`,
        properties: {
          uploadedBy: req.user.email,
          projectId: projectId || '',
          fileType: 'edited_video',
        },
      }
    );

    res.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      size: result.size,
    });
  } catch (error) {
    console.error('Edited video upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload final video
 * POST /api/upload/final-video
 */
router.post('/final-video', verifyAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    const baseFolderId = process.env.GOOGLE_DRIVE_FINAL_VIDEO_FOLDER_ID;

    if (!baseFolderId) {
      return res.status(500).json({ error: 'Final video folder not configured' });
    }

    const fileName = projectId
      ? `[${projectId}] ${req.file.originalname}`
      : req.file.originalname;

    const result = await googleDriveUploadService.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype,
      baseFolderId,
      {
        description: `Final video for ${projectId || 'project'}`,
        properties: {
          uploadedBy: req.user.email,
          projectId: projectId || '',
          fileType: 'final_video',
        },
      }
    );

    res.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      size: result.size,
    });
  } catch (error) {
    console.error('Final video upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Download multiple files as a streamed zip
 * GET /api/upload/download-zip?fileIds=id1,id2&name=project-name
 * Streams files from Google Drive through the server into a zip — no buffering in memory.
 */
router.get('/download-zip', verifyAuth, async (req, res) => {
  const archiver = require('archiver');

  try {
    const { fileIds, name } = req.query;
    if (!fileIds) {
      return res.status(400).json({ error: 'fileIds query parameter required' });
    }

    const ids = fileIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }

    const zipName = `${name || 'raw-footage'}.zip`;

    // Collect file streams before starting the zip response.
    // This way if ALL files fail we can return a proper error instead of an empty zip.
    const entries = [];
    for (const fileId of ids) {
      try {
        const metadata = await googleDriveUploadService.getFileMetadata(fileId);
        const fileStream = await googleDriveUploadService.downloadFileStream(fileId);
        entries.push({ stream: fileStream, name: metadata.name, size: parseInt(metadata.size, 10) || undefined });
        console.log(`✅ Prepared file for zip: ${metadata.name} (${metadata.size} bytes)`);
      } catch (err) {
        console.error(`⚠️  Skipping file ${fileId}:`, err.message);
      }
    }

    if (entries.length === 0) {
      return res.status(404).json({ error: 'No files could be downloaded from Google Drive' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipName)}"`);

    // Use DEFLATE level 0 (no compression) — more compatible than STORE mode with streamed entries
    const archive = archiver('zip', { zlib: { level: 0 } });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create zip' });
      }
    });

    archive.pipe(res);

    for (const entry of entries) {
      archive.append(entry.stream, { name: entry.name });
    }

    await archive.finalize();
    console.log(`📦 Zip finalized: ${zipName} with ${entries.length} file(s)`);
  } catch (error) {
    console.error('Zip download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * Delete file
 * DELETE /api/upload/:fileId
 */
router.delete('/:fileId', verifyAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    await googleDriveUploadService.deleteFile(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get file metadata
 * GET /api/upload/:fileId/metadata
 */
router.get('/:fileId/metadata', verifyAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    const metadata = await googleDriveUploadService.getFileMetadata(fileId);

    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
