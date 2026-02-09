import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backendUploadService } from '../backendUploadService';

// ---- Module-level mock state ----

const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api', () => {
  getSessionMock.mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: { id: 'user-1', email: 'user@test.com' },
      },
    },
    error: null,
  });

  return {
    auth: {
      getUser: vi.fn(),
      getSession: getSessionMock,
      getAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    },
  };
});

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- Tests ----

describe('backendUploadService', () => {
  // ========================================
  // uploadFile
  // ========================================
  describe('uploadFile', () => {
    it('should throw if not authenticated (no session)', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

      await expect(
        backendUploadService.uploadFile(file, 'raw-footage', 'BCH-1001', 'a1')
      ).rejects.toThrow('Not authenticated');
    });

    // XHR-based upload tests are difficult to fully unit test without a DOM environment,
    // but we can test the authentication check and error paths
  });

  // ========================================
  // Convenience methods
  // ========================================
  describe('uploadRawFootage', () => {
    it('should throw if not authenticated', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      const file = new File(['content'], 'raw.mp4', { type: 'video/mp4' });

      await expect(
        backendUploadService.uploadRawFootage(file, 'BCH-1001', 'a1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('uploadEditedVideo', () => {
    it('should throw if not authenticated', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      const file = new File(['content'], 'edit.mp4', { type: 'video/mp4' });

      await expect(
        backendUploadService.uploadEditedVideo(file, 'BCH-1001', 'a1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('uploadFinalVideo', () => {
    it('should throw if not authenticated', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      const file = new File(['content'], 'final.mp4', { type: 'video/mp4' });

      await expect(
        backendUploadService.uploadFinalVideo(file, 'BCH-1001', 'a1')
      ).rejects.toThrow('Not authenticated');
    });
  });

  // ========================================
  // cancelUpload
  // ========================================
  describe('cancelUpload', () => {
    it('should not throw when called without active upload', () => {
      expect(() => backendUploadService.cancelUpload()).not.toThrow();
    });
  });

  // ========================================
  // deleteFile
  // ========================================
  describe('deleteFile', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
    });

    it('should throw if not authenticated', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      await expect(backendUploadService.deleteFile('file-123')).rejects.toThrow('Not authenticated');
    });

    it('should delete file successfully', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true });

      await expect(backendUploadService.deleteFile('file-123')).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload/file-123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should throw with JSON error message on failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: () => Promise.resolve({ error: 'File not found' }),
      });

      await expect(backendUploadService.deleteFile('file-123')).rejects.toThrow('File not found');
    });

    it('should throw with text error message on non-JSON failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/plain' : null,
        },
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(backendUploadService.deleteFile('file-123')).rejects.toThrow('Internal Server Error');
    });

    it('should throw generic message when error parsing fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: () => null,
        },
        text: () => Promise.resolve(''),
      });

      await expect(backendUploadService.deleteFile('file-123')).rejects.toThrow('Delete failed with status 500');
    });
  });

  // ========================================
  // getFileMetadata
  // ========================================
  describe('getFileMetadata', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
    });

    it('should throw if not authenticated', async () => {
      getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

      await expect(backendUploadService.getFileMetadata('file-123')).rejects.toThrow('Not authenticated');
    });

    it('should return file metadata on success', async () => {
      const mockMetadata = {
        id: 'file-123',
        name: 'video.mp4',
        mimeType: 'video/mp4',
        size: '1024000',
        webViewLink: 'https://drive.google.com/file/d/123/view',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: () => Promise.resolve({ metadata: mockMetadata }),
      });

      const result = await backendUploadService.getFileMetadata('file-123');

      expect(result).toEqual(mockMetadata);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload/file-123/metadata'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token',
          }),
        })
      );
    });

    it('should throw on non-JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null,
        },
      });

      await expect(backendUploadService.getFileMetadata('file-123')).rejects.toThrow('Server returned non-JSON response');
    });

    it('should throw on API error with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          get: (name: string) => name === 'content-type' ? 'application/json' : null,
        },
        json: () => Promise.resolve({ error: 'File not found in Drive' }),
      });

      await expect(backendUploadService.getFileMetadata('file-123')).rejects.toThrow('File not found in Drive');
    });
  });
});
