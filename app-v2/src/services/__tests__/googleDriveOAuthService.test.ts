import { describe, it, expect } from 'vitest';
import { extractDriveFileId, getDriveDownloadUrl } from '../googleDriveOAuthService';

// The GoogleDriveOAuthService class depends heavily on browser globals (google, gapi, XMLHttpRequest, document).
// We only test the pure utility functions that are exported.

describe('googleDriveOAuthService utilities', () => {
  // ========================================
  // extractDriveFileId
  // ========================================
  describe('extractDriveFileId', () => {
    it('should return file ID from /file/d/ URL', () => {
      const url = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing';
      expect(extractDriveFileId(url)).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    });

    it('should return file ID from ?id= URL', () => {
      const url = 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz';
      expect(extractDriveFileId(url)).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    });

    it('should return the input as-is if it is already a plain ID', () => {
      const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz';
      expect(extractDriveFileId(id)).toBe(id);
    });

    it('should return empty string for empty input', () => {
      expect(extractDriveFileId('')).toBe('');
    });

    it('should handle URL with hyphens and underscores in ID', () => {
      const url = 'https://drive.google.com/file/d/1A-b_C2d-E3f/view';
      expect(extractDriveFileId(url)).toBe('1A-b_C2d-E3f');
    });

    it('should return URL as-is when no recognizable pattern matches', () => {
      const url = 'https://example.com/some/path';
      // Has '/' but no /file/d/ or ?id= pattern
      expect(extractDriveFileId(url)).toBe(url);
    });

    it('should handle &id= in query params', () => {
      const url = 'https://drive.google.com/something?param=1&id=MyFileId123';
      expect(extractDriveFileId(url)).toBe('MyFileId123');
    });
  });

  // ========================================
  // getDriveDownloadUrl
  // ========================================
  describe('getDriveDownloadUrl', () => {
    it('should build download URL from file ID', () => {
      const url = getDriveDownloadUrl('1AbCdEfGhIjKlMnOpQrStUvWxYz');
      expect(url).toBe('https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQrStUvWxYz&export=download');
    });

    it('should extract ID from full URL and build download URL', () => {
      const url = getDriveDownloadUrl('https://drive.google.com/file/d/abc123/view');
      expect(url).toBe('https://drive.google.com/uc?id=abc123&export=download');
    });

    it('should handle ?id= style URLs', () => {
      const url = getDriveDownloadUrl('https://drive.google.com/open?id=xyz789');
      expect(url).toBe('https://drive.google.com/uc?id=xyz789&export=download');
    });
  });
});
