/**
 * Supabase Storage Upload Service
 * Handles file uploads to Supabase Storage (no OAuth needed!)
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseStorageService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.bucket = 'production-files';
  }

  /**
   * Ensure bucket exists and is public
   */
  async ensureBucket() {
    try {
      const { data, error } = await this.supabase.storage.getBucket(this.bucket);

      if (error && error.message.includes('not found')) {
        // Create bucket if it doesn't exist - make it PUBLIC
        const { error: createError } = await this.supabase.storage.createBucket(this.bucket, {
          public: true, // Public bucket so files are accessible without signed URLs
          fileSizeLimit: 524288000, // 500MB
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log('✅ Created Supabase Storage bucket (public):', this.bucket);
        }
      } else if (data && !data.public) {
        // Bucket exists but is private - update to public
        const { error: updateError } = await this.supabase.storage.updateBucket(this.bucket, {
          public: true,
        });

        if (updateError) {
          console.error('Error updating bucket to public:', updateError);
        } else {
          console.log('✅ Updated bucket to public:', this.bucket);
        }
      }
    } catch (error) {
      console.error('Error checking bucket:', error);
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param {Buffer} fileBuffer - File content
   * @param {string} fileName - File name
   * @param {string} mimeType - MIME type
   * @param {string} folder - Folder path (e.g., 'raw-footage', 'edited-videos')
   * @param {string} projectId - Project content ID for organization
   * @returns {Promise<{fileUrl: string, filePath: string}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType, folder, projectId) {
    await this.ensureBucket();

    try {
      // Create file path: folder/[projectId] filename.ext
      const fileNameWithProject = projectId
        ? `[${projectId}] ${fileName}`
        : fileName;

      const filePath = `${folder}/${fileNameWithProject}`;

      console.log(`📤 Uploading ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) to Supabase Storage`);

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true, // Replace if exists
        });

      if (error) throw error;

      console.log(`✅ Uploaded: ${filePath}`);

      // Get public URL for the file (no expiry)
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);

      return {
        fileUrl: publicUrlData.publicUrl,
        filePath: data.path,
        fileName: fileNameWithProject,
      };
    } catch (error) {
      console.error('❌ Upload error:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - File path to delete
   */
  async deleteFile(filePath) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([filePath]);

      if (error) throw error;

      console.log(`🗑️  Deleted file: ${filePath}`);
    } catch (error) {
      console.error('❌ Delete error:', error.message);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   * @returns {Promise<Array>}
   */
  async listFiles(folder) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(folder);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ List error:', error.message);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new SupabaseStorageService();
