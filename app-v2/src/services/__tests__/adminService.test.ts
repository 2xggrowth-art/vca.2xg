import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../adminService';

// ---- Helpers to build a chainable mock that records calls ----

interface CallRecord {
  method: string;
  args: unknown[];
}

function createQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number }) {
  const calls: CallRecord[] = [];

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'not', 'or', 'like', 'ilike',
    'order', 'limit', 'range', 'single', 'maybeSingle',
  ] as const;

  const builder: Record<string, any> = {};

  for (const m of chainMethods) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    });
  }

  // Make the builder thenable so `await supabase.from(...).select(...)` resolves
  builder.then = (resolve: (v: any) => void, reject?: (r: any) => void) => {
    return Promise.resolve(resolvedValue).then(resolve, reject);
  };

  return { builder, calls };
}

// ---- Module-level mock state ----

let fromResults: Record<string, { data: unknown; error: unknown; count?: number }> = {};
let fromCalls: Record<string, CallRecord[]> = {};
const rpcMock = vi.hoisted(() => vi.fn());
const getAccessTokenMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const storageUploadMock = vi.hoisted(() => vi.fn());
const storageGetPublicUrlMock = vi.hoisted(() => vi.fn());
let fetchMock: ReturnType<typeof vi.fn>;

vi.mock('../../lib/api', () => {
  // Build a from() that returns different builders per table
  const from = vi.fn((table: string) => {
    const result = fromResults[table] || { data: null, error: null };
    const { builder, calls } = createQueryBuilder(result);
    // Track calls per table (use the most recent one)
    if (!fromCalls[table]) fromCalls[table] = [];
    fromCalls[table] = calls;
    return builder;
  });

  rpcMock.mockResolvedValue({ data: null, error: null });
  getUserMock.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@test.com' } }, error: null });
  getAccessTokenMock.mockReturnValue('mock-token');
  storageUploadMock.mockResolvedValue({ error: null });
  storageGetPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/file.webm' } });

  return {
    supabase: {
      from,
      rpc: rpcMock,
      auth: { getUser: getUserMock, getSession: vi.fn() },
      storage: {
        from: vi.fn(() => ({
          upload: storageUploadMock,
          getPublicUrl: storageGetPublicUrlMock,
        })),
      },
    },
    auth: {
      getUser: getUserMock,
      getSession: vi.fn(),
      getAccessToken: getAccessTokenMock,
    },
    storage: {
      from: vi.fn(() => ({
        upload: storageUploadMock,
        getPublicUrl: storageGetPublicUrlMock,
      })),
    },
  };
});

// ---- Setup ----

beforeEach(() => {
  vi.clearAllMocks();
  fromResults = {};
  fromCalls = {};
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

// ---- Tests ----

describe('adminService', () => {
  // ========================================
  // getAllAnalyses
  // ========================================
  describe('getAllAnalyses', () => {
    it('should return analyses with flattened profile data and extracted assignments', async () => {
      fromResults['viral_analyses'] = {
        data: [
          {
            id: 'a1',
            title: 'Test Analysis',
            profiles: { email: 'writer@test.com', full_name: 'Writer', avatar_url: null },
            assignments: [
              { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1', email: 'v@test.com', full_name: 'Video Guy', avatar_url: null, role: 'videographer' } },
              { id: 'asgn2', role: 'EDITOR', user: { id: 'e1', email: 'e@test.com', full_name: 'Editor', avatar_url: null, role: 'editor' } },
              { id: 'asgn3', role: 'POSTING_MANAGER', user: { id: 'pm1', email: 'pm@test.com', full_name: 'PM', avatar_url: null, role: 'posting_manager' } },
            ],
            industry: { id: 'ind1', name: 'Tech', short_code: 'TCH' },
            profile: { id: 'prof1', name: 'Profile 1' },
          },
        ],
        error: null,
      };

      const result = await adminService.getAllAnalyses();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('writer@test.com');
      expect(result[0].full_name).toBe('Writer');
      expect(result[0].videographer).toEqual({ id: 'v1', email: 'v@test.com', full_name: 'Video Guy', avatar_url: null, role: 'videographer' });
      expect(result[0].editor).toEqual({ id: 'e1', email: 'e@test.com', full_name: 'Editor', avatar_url: null, role: 'editor' });
      expect(result[0].posting_manager).toEqual({ id: 'pm1', email: 'pm@test.com', full_name: 'PM', avatar_url: null, role: 'posting_manager' });
    });

    it('should return empty array when data is null', async () => {
      fromResults['viral_analyses'] = { data: null, error: null };

      const result = await adminService.getAllAnalyses();
      expect(result).toEqual([]);
    });

    it('should throw on Supabase error', async () => {
      fromResults['viral_analyses'] = { data: null, error: { message: 'Permission denied' } };

      await expect(adminService.getAllAnalyses()).rejects.toEqual({ message: 'Permission denied' });
    });

    it('should handle analyses with no assignments', async () => {
      fromResults['viral_analyses'] = {
        data: [
          {
            id: 'a1',
            title: 'Unassigned',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
            industry: null,
            profile: null,
          },
        ],
        error: null,
      };

      const result = await adminService.getAllAnalyses();

      expect(result[0].videographer).toBeUndefined();
      expect(result[0].editor).toBeUndefined();
      expect(result[0].posting_manager).toBeUndefined();
    });
  });

  // ========================================
  // getPendingAnalyses
  // ========================================
  describe('getPendingAnalyses', () => {
    it('should return pending analyses with flattened profile data', async () => {
      fromResults['viral_analyses'] = {
        data: [
          {
            id: 'p1',
            status: 'PENDING',
            profiles: { email: 'user@test.com', full_name: 'User', avatar_url: 'url' },
          },
        ],
        error: null,
      };

      const result = await adminService.getPendingAnalyses();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('user@test.com');
      expect(result[0].full_name).toBe('User');
      expect(result[0].avatar_url).toBe('url');
    });

    it('should throw on error', async () => {
      fromResults['viral_analyses'] = { data: null, error: { message: 'DB error' } };

      await expect(adminService.getPendingAnalyses()).rejects.toEqual({ message: 'DB error' });
    });
  });

  // ========================================
  // getAnalysis
  // ========================================
  describe('getAnalysis', () => {
    it('should return single analysis with profile and assignment data', async () => {
      fromResults['viral_analyses'] = {
        data: {
          id: 'a1',
          profiles: { email: 'w@test.com', full_name: 'Writer', avatar_url: null },
          assignments: [
            { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1', email: 'v@test.com', full_name: 'V', avatar_url: null, role: 'videographer' } },
          ],
        },
        error: null,
      };

      const result = await adminService.getAnalysis('a1');

      expect(result.email).toBe('w@test.com');
      expect(result.videographer).toBeDefined();
      expect(result.editor).toBeUndefined();
    });

    it('should throw on error', async () => {
      fromResults['viral_analyses'] = { data: null, error: { message: 'Not found', code: '404' } };

      await expect(adminService.getAnalysis('nonexistent')).rejects.toEqual({ message: 'Not found', code: '404' });
    });
  });

  // ========================================
  // reviewAnalysis
  // ========================================
  describe('reviewAnalysis', () => {
    it('should throw if user is not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(
        adminService.reviewAnalysis('a1', {
          status: 'APPROVED',
          hookStrength: 8,
          contentQuality: 7,
          viralPotential: 9,
          replicationClarity: 6,
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw if rejecting without feedback', async () => {
      await expect(
        adminService.reviewAnalysis('a1', {
          status: 'REJECTED',
          hookStrength: 3,
          contentQuality: 2,
          viralPotential: 1,
          replicationClarity: 2,
        })
      ).rejects.toThrow('Feedback is required when rejecting an analysis');
    });

    it('should calculate overall score as average of four metrics', async () => {
      fromResults['viral_analyses'] = {
        data: { id: 'a1', status: 'APPROVED' },
        error: null,
      };

      const result = await adminService.reviewAnalysis('a1', {
        status: 'APPROVED',
        hookStrength: 8,
        contentQuality: 7,
        viralPotential: 9,
        replicationClarity: 6,
      });

      // (8+7+9+6)/4 = 7.5
      expect(result).toBeDefined();
    });

    it('should call rpc to increment rejection counter when rejecting', async () => {
      fromResults['viral_analyses'] = {
        data: { id: 'a1', status: 'REJECTED' },
        error: null,
      };

      await adminService.reviewAnalysis('a1', {
        status: 'REJECTED',
        feedback: 'Needs work',
        hookStrength: 3,
        contentQuality: 2,
        viralPotential: 1,
        replicationClarity: 2,
      });

      expect(rpcMock).toHaveBeenCalledWith('increment_rejection_counter', {
        analysis_uuid: 'a1',
      });
    });

    it('should call rpc to generate content_id when approving with profile', async () => {
      fromResults['viral_analyses'] = {
        data: { id: 'a1', status: 'APPROVED' },
        error: null,
      };

      await adminService.reviewAnalysis('a1', {
        status: 'APPROVED',
        profileId: 'prof1',
        hookStrength: 8,
        contentQuality: 7,
        viralPotential: 9,
        replicationClarity: 6,
      });

      expect(rpcMock).toHaveBeenCalledWith('generate_content_id_on_approval', {
        p_analysis_id: 'a1',
        p_profile_id: 'prof1',
      });
    });

    it('should not call content_id rpc when approving without profile', async () => {
      fromResults['viral_analyses'] = {
        data: { id: 'a1', status: 'APPROVED' },
        error: null,
      };

      await adminService.reviewAnalysis('a1', {
        status: 'APPROVED',
        hookStrength: 8,
        contentQuality: 7,
        viralPotential: 9,
        replicationClarity: 6,
      });

      expect(rpcMock).not.toHaveBeenCalledWith(
        'generate_content_id_on_approval',
        expect.anything()
      );
    });
  });

  // ========================================
  // getDashboardStats
  // ========================================
  describe('getDashboardStats', () => {
    it('should aggregate count queries into stats object', async () => {
      // All queries go to the same tables, mock returns count
      fromResults['viral_analyses'] = { data: null, error: null, count: 10 };
      fromResults['profiles'] = { data: null, error: null, count: 5 };

      const result = await adminService.getDashboardStats();

      expect(result).toEqual({
        totalAnalyses: 10,
        totalUsers: 5,
        pendingAnalyses: 10,
        approvedAnalyses: 10,
        rejectedAnalyses: 10,
      });
    });

    it('should return zeros when counts are null', async () => {
      fromResults['viral_analyses'] = { data: null, error: null, count: undefined };
      fromResults['profiles'] = { data: null, error: null, count: undefined };

      const result = await adminService.getDashboardStats();

      expect(result.totalAnalyses).toBe(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should throw when total query fails', async () => {
      fromResults['viral_analyses'] = { data: null, error: { message: 'DB error' } };
      fromResults['profiles'] = { data: null, error: null };

      await expect(adminService.getDashboardStats()).rejects.toEqual({ message: 'DB error' });
    });
  });

  // ========================================
  // getTeamMembers
  // ========================================
  describe('getTeamMembers', () => {
    it('should return team members ordered by role and name', async () => {
      fromResults['profiles'] = {
        data: [
          { id: 'u1', email: 'a@test.com', full_name: 'Admin', role: 'admin' },
          { id: 'u2', email: 'v@test.com', full_name: 'Video', role: 'videographer' },
        ],
        error: null,
      };

      const result = await adminService.getTeamMembers();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('admin');
    });

    it('should return empty array when no profiles exist', async () => {
      fromResults['profiles'] = { data: null, error: null };

      const result = await adminService.getTeamMembers();
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getTeamStats
  // ========================================
  describe('getTeamStats', () => {
    it('should aggregate count queries per role', async () => {
      fromResults['profiles'] = { data: null, error: null, count: 12 };

      const result = await adminService.getTeamStats();

      // All use same mock so all counts will be 12
      expect(result.total).toBe(12);
      expect(result.admins).toBe(12);
    });
  });

  // ========================================
  // getProjectSkips
  // ========================================
  describe('getProjectSkips', () => {
    it('should return skips with user profile data', async () => {
      // First call to project_skips, second to profiles
      let _callCount = 0;
      const _originalFromResults = fromResults;

      fromResults['project_skips'] = {
        data: [
          { id: 's1', user_id: 'u1', role: 'VIDEOGRAPHER', skipped_at: '2024-01-01' },
        ],
        error: null,
      };
      fromResults['profiles'] = {
        data: [
          { id: 'u1', email: 'v@test.com', full_name: 'Video Person' },
        ],
        error: null,
      };

      const result = await adminService.getProjectSkips('a1');

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Video Person');
      expect(result[0].email).toBe('v@test.com');
    });

    it('should return empty array when no skips exist', async () => {
      fromResults['project_skips'] = { data: [], error: null };

      const result = await adminService.getProjectSkips('a1');

      expect(result).toEqual([]);
    });

    it('should throw on skips query error', async () => {
      fromResults['project_skips'] = { data: null, error: { message: 'Query failed' } };

      await expect(adminService.getProjectSkips('a1')).rejects.toEqual({ message: 'Query failed' });
    });
  });

  // ========================================
  // removeSkip
  // ========================================
  describe('removeSkip', () => {
    it('should delete skip by ID', async () => {
      fromResults['project_skips'] = { data: null, error: null };

      await expect(adminService.removeSkip('s1')).resolves.toBeUndefined();
    });

    it('should throw on delete error', async () => {
      fromResults['project_skips'] = { data: null, error: { message: 'Delete failed' } };

      await expect(adminService.removeSkip('s1')).rejects.toEqual({ message: 'Delete failed' });
    });
  });

  // ========================================
  // resetUserPassword
  // ========================================
  describe('resetUserPassword', () => {
    it('should throw if not authenticated', async () => {
      getAccessTokenMock.mockReturnValueOnce(null);

      await expect(adminService.resetUserPassword('u1', 'newpass')).rejects.toThrow('Not authenticated');
    });

    it('should return success on successful reset', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await adminService.resetUserPassword('u1', 'tempPass123');

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/u1/reset-password'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('should throw on failed reset', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(adminService.resetUserPassword('u1', 'temp')).rejects.toThrow('Unauthorized');
    });

    it('should throw generic message when response body has no error field', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(adminService.resetUserPassword('u1', 'temp')).rejects.toThrow('Failed to reset password');
    });
  });

  // ========================================
  // getAnalysesByStage
  // ========================================
  describe('getAnalysesByStage', () => {
    it('should map "planning" stage to correct filter values', async () => {
      fromResults['viral_analyses'] = {
        data: [
          {
            id: 'a1',
            production_stage: 'PLANNING',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [],
          },
        ],
        error: null,
      };

      const result = await adminService.getAnalysesByStage('planning');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('w@test.com');
    });

    it('should return empty array when data is null', async () => {
      fromResults['viral_analyses'] = { data: null, error: null };

      const result = await adminService.getAnalysesByStage('shooting');
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      fromResults['viral_analyses'] = { data: null, error: { message: 'Error' } };

      await expect(adminService.getAnalysesByStage('editing')).rejects.toEqual({ message: 'Error' });
    });
  });
});
