/**
 * Voice Note Storage Service
 * Stores voice notes on local disk, replacing Supabase Storage
 */

const fs = require('fs');
const path = require('path');

const VOICE_NOTES_DIR = path.resolve(process.env.VOICE_NOTES_DIR || '/data/voice-notes');

class VoiceNoteService {
  constructor() {
    this._ensureDirectory(VOICE_NOTES_DIR);
  }

  _ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created voice notes directory: ${dir}`);
    }
  }

  /**
   * Upload/save a voice note file
   * @param {Buffer} fileBuffer - File content
   * @param {string} filePath - Relative path (e.g. "userId/hook_123456.webm")
   * @param {object} options - Upload options
   * @returns {{ path: string }}
   */
  _validatePath(filePath) {
    const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized !== path.normalize(filePath) || path.isAbsolute(filePath)) {
      throw new Error('Invalid file path');
    }
    const fullPath = path.resolve(VOICE_NOTES_DIR, normalized);
    if (fullPath !== VOICE_NOTES_DIR && !fullPath.startsWith(VOICE_NOTES_DIR + path.sep)) {
      throw new Error('Invalid file path');
    }
    return fullPath;
  }

  async uploadFile(fileBuffer, filePath, options = {}) {
    const fullPath = this._validatePath(filePath);
    const dir = path.dirname(fullPath);

    this._ensureDirectory(dir);

    // If upsert=false and file exists, throw
    if (!options.upsert && fs.existsSync(fullPath)) {
      throw new Error(`File already exists: ${filePath}`);
    }

    fs.writeFileSync(fullPath, fileBuffer);
    return { path: filePath };
  }

  /**
   * Delete a voice note file
   * @param {string} filePath - Relative path
   */
  async deleteFile(filePath) {
    const fullPath = this._validatePath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Delete multiple files
   * @param {string[]} filePaths - Array of relative paths
   */
  async deleteFiles(filePaths) {
    for (const fp of filePaths) {
      await this.deleteFile(fp);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Relative folder path
   * @returns {Array<{ name: string, size: number }>}
   */
  async listFiles(folder) {
    const fullPath = this._validatePath(folder || '');
    if (!fs.existsSync(fullPath)) return [];

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => {
        const stat = fs.statSync(path.join(fullPath, e.name));
        return {
          name: e.name,
          size: stat.size,
          created_at: stat.birthtime.toISOString(),
          updated_at: stat.mtime.toISOString(),
        };
      });
  }

  /**
   * Get the base directory for serving static files
   */
  getBaseDir() {
    return VOICE_NOTES_DIR;
  }
}

module.exports = new VoiceNoteService();
