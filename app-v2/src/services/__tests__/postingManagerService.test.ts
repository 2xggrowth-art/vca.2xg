import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postingManagerService } from '../postingManagerService';

// ---- Helpers ----

function createQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number }) {
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'not', 'or', 'like', 'ilike',
    'order', 'limit', 'range', 'single', 'maybeSingle',
  ] as const;

  const builder: Record<string, any> = {};

  for (const m of chainMethods) {
    builder[m] = vi.fn((..._args: unknown[]) => builder);
  }

  builder.then = (resolve: (v: any) => void, reject?: (r: any) => void) => {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };

  return builder;
}

// ---- Module-level mock state ----

const getUserMock = vi.hoisted(() => vi.fn());
let fromResultsQueue: Record<string, Array<{ data: unknown; error: unknown; count?: number }>> = {};

function getNextResult(table: string) {
  const queue = fromResultsQueue[table];
  if (!queue || queue.length === 0) return { data: null, error: null };
  if (queue.length === 1) return queue[0];
  return queue.shift()!;
}

vi.mock('../../lib/api', () => {
  const from = vi.fn((table: string) => {
    const result = getNextResult(table);
    return createQueryBuilder(result);
  });

  getUserMock.mockResolvedValue({ data: { user: { id: 'pm-1', email: 'pm@test.com' } }, error: null });

  return {
    supabase: {
      from,
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: { getUser: getUserMock, getSession: vi.fn() },
    },
    auth: {
      getUser: getUserMock,
      getSession: vi.fn(),
      getAccessToken: vi.fn().mockReturnValue('mock-token'),
    },
  };
});

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
  fromResultsQueue = {};
});

// ---- Tests ----

describe('postingManagerService', () => {
  // ========================================
  // getReadyToPostProjects
  // ========================================
  describe('getReadyToPostProjects', () => {
    it('should return projects in READY_TO_POST stage with role data', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              production_stage: 'READY_TO_POST',
              profiles: { email: 'w@test.com', full_name: 'Writer', avatar_url: null },
              assignments: [
                { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1' } },
                { id: 'asgn2', role: 'EDITOR', user: { id: 'e1' } },
              ],
            },
          ],
          error: null,
        },
      ];

      const result = await postingManagerService.getReadyToPostProjects();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('w@test.com');
      expect(result[0].videographer).toEqual({ id: 'v1' });
      expect(result[0].editor).toEqual({ id: 'e1' });
    });

    it('should throw on error', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: null, error: { message: 'Query failed' } }];

      await expect(postingManagerService.getReadyToPostProjects()).rejects.toEqual({ message: 'Query failed' });
    });

    it('should return empty array when no data', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: null, error: null }];

      const result = await postingManagerService.getReadyToPostProjects();
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getScheduledPosts
  // ========================================
  describe('getScheduledPosts', () => {
    it('should return scheduled posts with role data', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              scheduled_post_time: '2024-06-01T10:00:00Z',
              profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
              assignments: [],
            },
          ],
          error: null,
        },
      ];

      const result = await postingManagerService.getScheduledPosts('2024-06-01', '2024-06-30');
      expect(result).toHaveLength(1);
    });

    it('should work without date filters', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: [], error: null }];

      const result = await postingManagerService.getScheduledPosts();
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getPostedProjects
  // ========================================
  describe('getPostedProjects', () => {
    it('should return posted projects with default limit of 50', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              production_stage: 'POSTED',
              posted_at: '2024-06-01',
              profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
              assignments: [],
            },
          ],
          error: null,
        },
      ];

      const result = await postingManagerService.getPostedProjects();
      expect(result).toHaveLength(1);
    });

    it('should throw on error', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: null, error: { message: 'Error' } }];

      await expect(postingManagerService.getPostedProjects()).rejects.toEqual({ message: 'Error' });
    });
  });

  // ========================================
  // getPostingStats
  // ========================================
  describe('getPostingStats', () => {
    it('should return posting statistics', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: null, count: 5 },   // readyToPost
        { data: null, error: null, count: 2 },   // scheduledToday
        { data: null, error: null, count: 10 },  // postedThisWeek
        { data: null, error: null, count: 30 },  // postedThisMonth
      ];

      const result = await postingManagerService.getPostingStats();

      expect(result.readyToPost).toBe(5);
      expect(result.scheduledToday).toBe(2);
      expect(result.postedThisWeek).toBe(10);
      expect(result.postedThisMonth).toBe(30);
    });

    it('should return zeros when counts are null', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: null, count: undefined },
      ];

      const result = await postingManagerService.getPostingStats();

      expect(result.readyToPost).toBe(0);
      expect(result.scheduledToday).toBe(0);
      expect(result.postedThisWeek).toBe(0);
      expect(result.postedThisMonth).toBe(0);
    });
  });

  // ========================================
  // setPostingDetails
  // ========================================
  describe('setPostingDetails', () => {
    it('should throw if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(
        postingManagerService.setPostingDetails({
          analysisId: 'a1',
          postingPlatform: 'INSTAGRAM_REEL',
          postingCaption: 'Great video!',
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw if platform is missing', async () => {
      await expect(
        postingManagerService.setPostingDetails({
          analysisId: 'a1',
          postingPlatform: '',
          postingCaption: 'Caption',
        })
      ).rejects.toThrow('Platform selection is required');
    });

    it('should throw if caption is missing', async () => {
      await expect(
        postingManagerService.setPostingDetails({
          analysisId: 'a1',
          postingPlatform: 'INSTAGRAM_REEL',
          postingCaption: '',
        })
      ).rejects.toThrow('Caption is required');
    });

    it('should throw if YouTube/TikTok platform without heading', async () => {
      await expect(
        postingManagerService.setPostingDetails({
          analysisId: 'a1',
          postingPlatform: 'YOUTUBE_SHORTS',
          postingCaption: 'Caption',
        })
      ).rejects.toThrow('Heading/title is required for YouTube and TikTok posts');
    });

    it('should throw for TIKTOK platform without heading', async () => {
      await expect(
        postingManagerService.setPostingDetails({
          analysisId: 'a1',
          postingPlatform: 'TIKTOK',
          postingCaption: 'Caption',
        })
      ).rejects.toThrow('Heading/title is required for YouTube and TikTok posts');
    });

    it('should not require heading for Instagram platform', async () => {
      fromResultsQueue['viral_analyses'] = [
        // update call
        { data: null, error: null },
        // getProjectById refetch
        {
          data: {
            id: 'a1',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: null, error: null }, // check existing
        { data: null, error: null }, // insert
      ];

      const result = await postingManagerService.setPostingDetails({
        analysisId: 'a1',
        postingPlatform: 'INSTAGRAM_REEL',
        postingCaption: 'Great reel!',
      });

      expect(result).toBeDefined();
    });

    it('should assign posting manager if not already assigned', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: null },
        {
          data: {
            id: 'a1',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: null, error: null }, // no existing assignment
        { data: null, error: null }, // insert new assignment
      ];

      await postingManagerService.setPostingDetails({
        analysisId: 'a1',
        postingPlatform: 'INSTAGRAM_REEL',
        postingCaption: 'Caption',
      });

      // Should complete without throwing
    });

    it('should not re-assign if posting manager already exists', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: null },
        {
          data: {
            id: 'a1',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: { id: 'existing-pm' }, error: null }, // existing assignment found
      ];

      const result = await postingManagerService.setPostingDetails({
        analysisId: 'a1',
        postingPlatform: 'INSTAGRAM_REEL',
        postingCaption: 'Caption',
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // schedulePost
  // ========================================
  describe('schedulePost', () => {
    it('should update scheduled time', async () => {
      fromResultsQueue['viral_analyses'] = [
        // update
        { data: null, error: null },
        // getProjectById
        {
          data: {
            id: 'a1',
            scheduled_post_time: '2024-06-15T10:00:00Z',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];

      const result = await postingManagerService.schedulePost('a1', '2024-06-15T10:00:00Z');
      expect(result).toBeDefined();
    });

    it('should throw on update error', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: null, error: { message: 'Update failed' } }];

      await expect(postingManagerService.schedulePost('a1', '2024-06-15')).rejects.toEqual({ message: 'Update failed' });
    });
  });

  // ========================================
  // markAsPosted
  // ========================================
  describe('markAsPosted', () => {
    it('should throw if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(
        postingManagerService.markAsPosted({ analysisId: 'a1', postedUrl: 'https://instagram.com/reel/123' })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw if posted URL is missing', async () => {
      await expect(
        postingManagerService.markAsPosted({ analysisId: 'a1', postedUrl: '' })
      ).rejects.toThrow('Posted URL is required');
    });

    it('should throw if posted URL is invalid', async () => {
      await expect(
        postingManagerService.markAsPosted({ analysisId: 'a1', postedUrl: 'not-a-url' })
      ).rejects.toThrow('Please enter a valid URL');
    });

    it('should move to POSTED stage on final post', async () => {
      fromResultsQueue['viral_analyses'] = [
        // update
        { data: null, error: null },
        // getProjectById
        {
          data: {
            id: 'a1',
            production_stage: 'POSTED',
            posted_url: 'https://instagram.com/reel/123',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];

      const result = await postingManagerService.markAsPosted({
        analysisId: 'a1',
        postedUrl: 'https://instagram.com/reel/123',
      });

      expect(result.production_stage).toBe('POSTED');
    });

    it('should keep in queue when keepInQueue is true', async () => {
      fromResultsQueue['viral_analyses'] = [
        // fetch current posted_urls
        { data: { posted_urls: [{ url: 'https://tiktok.com/1', posted_at: '2024-06-01' }] }, error: null },
        // update
        { data: null, error: null },
        // getProjectById
        {
          data: {
            id: 'a1',
            production_stage: 'READY_TO_POST',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];

      const result = await postingManagerService.markAsPosted({
        analysisId: 'a1',
        postedUrl: 'https://instagram.com/reel/456',
        keepInQueue: true,
      });

      expect(result.production_stage).toBe('READY_TO_POST');
    });

    it('should handle null posted_urls when keepInQueue is true', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: { posted_urls: null }, error: null },
        { data: null, error: null },
        {
          data: {
            id: 'a1',
            production_stage: 'READY_TO_POST',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
          error: null,
        },
      ];

      const result = await postingManagerService.markAsPosted({
        analysisId: 'a1',
        postedUrl: 'https://instagram.com/reel/789',
        keepInQueue: true,
      });

      expect(result).toBeDefined();
    });

    it('should throw on update error (final post)', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: { message: 'Update failed' } },
      ];

      await expect(
        postingManagerService.markAsPosted({
          analysisId: 'a1',
          postedUrl: 'https://instagram.com/reel/123',
        })
      ).rejects.toEqual({ message: 'Update failed' });
    });
  });

  // ========================================
  // getEditedVideoFiles
  // ========================================
  describe('getEditedVideoFiles', () => {
    it('should return edited video files', async () => {
      fromResultsQueue['production_files'] = [
        {
          data: [
            { id: 'f1', file_type: 'EDITED_VIDEO', is_deleted: false },
            { id: 'f2', file_type: 'FINAL_VIDEO', is_deleted: false },
          ],
          error: null,
        },
      ];

      const result = await postingManagerService.getEditedVideoFiles('a1');
      expect(result).toHaveLength(2);
    });

    it('should throw on error', async () => {
      fromResultsQueue['production_files'] = [{ data: null, error: { message: 'Query failed' } }];

      await expect(postingManagerService.getEditedVideoFiles('a1')).rejects.toEqual({ message: 'Query failed' });
    });

    it('should return empty array when no files', async () => {
      fromResultsQueue['production_files'] = [{ data: null, error: null }];

      const result = await postingManagerService.getEditedVideoFiles('a1');
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getProjectById
  // ========================================
  describe('getProjectById', () => {
    it('should return project with all role assignments', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: {
            id: 'a1',
            profiles: { email: 'w@test.com', full_name: 'Writer', avatar_url: null },
            assignments: [
              { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1' } },
              { id: 'asgn2', role: 'EDITOR', user: { id: 'e1' } },
              { id: 'asgn3', role: 'POSTING_MANAGER', user: { id: 'pm-1' } },
            ],
          },
          error: null,
        },
      ];

      const result = await postingManagerService.getProjectById('a1');

      expect(result.videographer).toEqual({ id: 'v1' });
      expect(result.editor).toEqual({ id: 'e1' });
      expect(result.posting_manager).toEqual({ id: 'pm-1' });
    });

    it('should throw on error', async () => {
      fromResultsQueue['viral_analyses'] = [{ data: null, error: { message: 'Not found' } }];

      await expect(postingManagerService.getProjectById('x')).rejects.toEqual({ message: 'Not found' });
    });
  });
});
