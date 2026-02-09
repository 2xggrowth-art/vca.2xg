import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editorService } from '../editorService';

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

  getUserMock.mockResolvedValue({ data: { user: { id: 'ed-1', email: 'editor@test.com' } }, error: null });

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

describe('editorService', () => {
  // ========================================
  // getAvailableProjects
  // ========================================
  describe('getAvailableProjects', () => {
    it('should filter out projects that already have an editor assigned', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              production_stage: 'READY_FOR_EDIT',
              assignments: [{ id: 'asgn1', role: 'EDITOR', user: { id: 'e1' } }],
              production_files: [{ file_type: 'RAW_FOOTAGE', is_deleted: false }],
              profiles: { email: 'w@test.com', full_name: 'Writer' },
            },
            {
              id: 'a2',
              production_stage: 'READY_FOR_EDIT',
              assignments: [{ id: 'asgn2', role: 'VIDEOGRAPHER', user: { id: 'v1' } }],
              production_files: [{ file_type: 'A_ROLL', is_deleted: false }],
              profiles: { email: 'w2@test.com', full_name: 'Writer2' },
            },
          ],
          error: null,
        },
      ];
      fromResultsQueue['project_skips'] = [
        { data: [], error: null },
      ];

      const result = await editorService.getAvailableProjects();

      // Only a2 should be available (a1 already has editor)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a2');
    });

    it('should filter out projects without raw footage files', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              production_stage: 'READY_FOR_EDIT',
              assignments: [],
              production_files: [],
              profiles: { email: 'w@test.com', full_name: 'W' },
            },
            {
              id: 'a2',
              production_stage: 'READY_FOR_EDIT',
              assignments: [],
              production_files: [{ file_type: 'RAW_FOOTAGE', is_deleted: false }],
              profiles: { email: 'w2@test.com', full_name: 'W2' },
            },
          ],
          error: null,
        },
      ];
      fromResultsQueue['project_skips'] = [
        { data: [], error: null },
      ];

      const result = await editorService.getAvailableProjects();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a2');
    });

    it('should filter out projects with only deleted raw files', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              production_stage: 'READY_FOR_EDIT',
              assignments: [],
              production_files: [{ file_type: 'RAW_FOOTAGE', is_deleted: true }],
              profiles: { email: 'w@test.com', full_name: 'W' },
            },
          ],
          error: null,
        },
      ];
      fromResultsQueue['project_skips'] = [
        { data: [], error: null },
      ];

      const result = await editorService.getAvailableProjects();
      expect(result).toHaveLength(0);
    });

    it('should filter out skipped projects', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              assignments: [],
              production_files: [{ file_type: 'B_ROLL', is_deleted: false }],
              profiles: { email: 'w@test.com' },
            },
            {
              id: 'a2',
              assignments: [],
              production_files: [{ file_type: 'RAW_FOOTAGE', is_deleted: false }],
              profiles: { email: 'w2@test.com' },
            },
          ],
          error: null,
        },
      ];
      fromResultsQueue['project_skips'] = [
        { data: [{ analysis_id: 'a1' }], error: null },
      ];

      const result = await editorService.getAvailableProjects();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a2');
    });

    it('should extract videographer from assignments', async () => {
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              assignments: [
                { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1', email: 'v@test.com', full_name: 'Videographer' } },
              ],
              production_files: [{ file_type: 'RAW_FOOTAGE', is_deleted: false }],
              profiles: { email: 'w@test.com', full_name: 'Writer', avatar_url: null },
            },
          ],
          error: null,
        },
      ];
      fromResultsQueue['project_skips'] = [
        { data: [], error: null },
      ];

      const result = await editorService.getAvailableProjects();

      expect(result[0].videographer).toEqual({ id: 'v1', email: 'v@test.com', full_name: 'Videographer' });
    });

    it('should throw on query error', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: { message: 'DB error' } },
      ];

      await expect(editorService.getAvailableProjects()).rejects.toEqual({ message: 'DB error' });
    });
  });

  // ========================================
  // getMyProjects
  // ========================================
  describe('getMyProjects', () => {
    it('should throw if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(editorService.getMyProjects()).rejects.toThrow('Not authenticated');
    });

    it('should return empty array when no editor assignments', async () => {
      fromResultsQueue['project_assignments'] = [
        { data: [], error: null },
      ];

      const result = await editorService.getMyProjects();
      expect(result).toEqual([]);
    });

    it('should return projects with all role assignments extracted', async () => {
      fromResultsQueue['project_assignments'] = [
        { data: [{ analysis_id: 'a1' }], error: null },
      ];
      fromResultsQueue['viral_analyses'] = [
        {
          data: [
            {
              id: 'a1',
              profiles: { email: 'w@test.com', full_name: 'Writer', avatar_url: null },
              assignments: [
                { id: 'asgn1', role: 'VIDEOGRAPHER', user: { id: 'v1' } },
                { id: 'asgn2', role: 'EDITOR', user: { id: 'ed-1' } },
                { id: 'asgn3', role: 'POSTING_MANAGER', user: { id: 'pm1' } },
              ],
            },
          ],
          error: null,
        },
      ];

      const result = await editorService.getMyProjects();

      expect(result).toHaveLength(1);
      expect(result[0].videographer).toEqual({ id: 'v1' });
      expect(result[0].editor).toEqual({ id: 'ed-1' });
      expect(result[0].posting_manager).toEqual({ id: 'pm1' });
    });

    it('should throw on assignments query error', async () => {
      fromResultsQueue['project_assignments'] = [
        { data: null, error: { message: 'Query failed' } },
      ];

      await expect(editorService.getMyProjects()).rejects.toEqual({ message: 'Query failed' });
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
            ],
          },
          error: null,
        },
      ];

      const result = await editorService.getProjectById('a1');

      expect(result.email).toBe('w@test.com');
      expect(result.videographer).toEqual({ id: 'v1' });
    });

    it('should throw on error', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: null, error: { message: 'Not found' } },
      ];

      await expect(editorService.getProjectById('x')).rejects.toEqual({ message: 'Not found' });
    });
  });

  // ========================================
  // pickProject
  // ========================================
  describe('pickProject', () => {
    it('should throw if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(editorService.pickProject({ analysisId: 'a1' })).rejects.toThrow('Not authenticated');
    });

    it('should throw if project is not in READY_FOR_EDIT stage', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: { id: 'a1', production_stage: 'EDITING' }, error: null },
      ];

      await expect(editorService.pickProject({ analysisId: 'a1' })).rejects.toThrow('This project is no longer available for editing');
    });

    it('should throw if project already has an editor', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: { id: 'a1', production_stage: 'READY_FOR_EDIT' }, error: null },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: { id: 'existing' }, error: null },
      ];

      await expect(editorService.pickProject({ analysisId: 'a1' })).rejects.toThrow('This project has already been picked by another editor');
    });

    it('should throw if no raw footage files exist', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: { id: 'a1', production_stage: 'READY_FOR_EDIT' }, error: null },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: null, error: null }, // no existing assignment
      ];
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 0 },
      ];

      await expect(editorService.pickProject({ analysisId: 'a1' })).rejects.toThrow('This project has no raw footage files');
    });

    it('should pick project successfully when all conditions are met', async () => {
      fromResultsQueue['viral_analyses'] = [
        // 1: fetch project
        { data: { id: 'a1', production_stage: 'READY_FOR_EDIT' }, error: null },
        // 2: update to EDITING
        { data: null, error: null },
        // 3: getProjectById refetch
        {
          data: {
            id: 'a1',
            production_stage: 'EDITING',
            profiles: { email: 'w@test.com', full_name: 'W', avatar_url: null },
            assignments: [{ id: 'new', role: 'EDITOR', user: { id: 'ed-1' } }],
          },
          error: null,
        },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: null, error: null }, // no existing assignment
        { data: null, error: null }, // insert assignment
      ];
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 5 },
      ];

      const result = await editorService.pickProject({ analysisId: 'a1' });

      expect(result.id).toBe('a1');
      expect(result.production_stage).toBe('EDITING');
    });

    it('should rollback stage on assignment insert failure', async () => {
      fromResultsQueue['viral_analyses'] = [
        { data: { id: 'a1', production_stage: 'READY_FOR_EDIT' }, error: null },
        // update to EDITING succeeds
        { data: null, error: null },
        // rollback update
        { data: null, error: null },
      ];
      fromResultsQueue['project_assignments'] = [
        { data: null, error: null }, // no existing assignment
        { data: null, error: { message: 'Unique constraint violated' } }, // insert fails
      ];
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 3 },
      ];

      await expect(editorService.pickProject({ analysisId: 'a1' })).rejects.toEqual({ message: 'Unique constraint violated' });
    });
  });

  // ========================================
  // markEditingComplete
  // ========================================
  describe('markEditingComplete', () => {
    it('should throw if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(editorService.markEditingComplete({ analysisId: 'a1' })).rejects.toThrow('Not authenticated');
    });

    it('should throw if no edited files exist', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 0 },
      ];

      await expect(editorService.markEditingComplete({ analysisId: 'a1' })).rejects.toThrow('Please upload at least one edited video before marking as complete');
    });

    it('should throw on file count query error', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: { message: 'Count error' } },
      ];

      await expect(editorService.markEditingComplete({ analysisId: 'a1' })).rejects.toThrow('Failed to verify files');
    });

    it('should update to READY_TO_POST when edited files exist', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 2 },
      ];
      fromResultsQueue['viral_analyses'] = [
        // update call
        { data: null, error: null },
        // getProjectById refetch
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

      const result = await editorService.markEditingComplete({ analysisId: 'a1' });
      expect(result.production_stage).toBe('READY_TO_POST');
    });

    it('should append editor notes to existing production notes', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 1 },
      ];
      fromResultsQueue['viral_analyses'] = [
        // fetch current notes
        { data: { production_notes: '[Videographer Notes]\nGood lighting' }, error: null },
        // update call
        { data: null, error: null },
        // getProjectById refetch
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

      const result = await editorService.markEditingComplete({
        analysisId: 'a1',
        productionNotes: 'Color graded everything',
      });
      expect(result).toBeDefined();
    });

    it('should set initial editor notes when no existing notes', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: null, count: 1 },
      ];
      fromResultsQueue['viral_analyses'] = [
        // fetch current notes (null)
        { data: { production_notes: null }, error: null },
        // update call
        { data: null, error: null },
        // getProjectById refetch
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

      const result = await editorService.markEditingComplete({
        analysisId: 'a1',
        productionNotes: 'First notes',
      });
      expect(result).toBeDefined();
    });
  });

  // ========================================
  // getRawFootageFiles
  // ========================================
  describe('getRawFootageFiles', () => {
    it('should return raw footage files for analysis', async () => {
      fromResultsQueue['production_files'] = [
        {
          data: [
            { id: 'f1', file_type: 'RAW_FOOTAGE', is_deleted: false },
            { id: 'f2', file_type: 'A_ROLL', is_deleted: false },
          ],
          error: null,
        },
      ];

      const result = await editorService.getRawFootageFiles('a1');
      expect(result).toHaveLength(2);
    });

    it('should throw on error', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: { message: 'Query failed' } },
      ];

      await expect(editorService.getRawFootageFiles('a1')).rejects.toEqual({ message: 'Query failed' });
    });

    it('should return empty array when no files', async () => {
      fromResultsQueue['production_files'] = [
        { data: null, error: null },
      ];

      const result = await editorService.getRawFootageFiles('a1');
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getEditedFiles
  // ========================================
  describe('getEditedFiles', () => {
    it('should return edited files for analysis', async () => {
      fromResultsQueue['production_files'] = [
        {
          data: [
            { id: 'f1', file_type: 'EDITED_VIDEO', is_deleted: false },
          ],
          error: null,
        },
      ];

      const result = await editorService.getEditedFiles('a1');
      expect(result).toHaveLength(1);
    });
  });

  // ========================================
  // rejectProject / unrejectProject
  // ========================================
  describe('rejectProject', () => {
    it('should upsert skip record with EDITOR role', async () => {
      fromResultsQueue['project_skips'] = [
        { data: null, error: null },
      ];

      await expect(editorService.rejectProject('a1')).resolves.toBeUndefined();
    });

    it('should do nothing if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(editorService.rejectProject('a1')).resolves.toBeUndefined();
    });
  });

  describe('unrejectProject', () => {
    it('should delete skip record', async () => {
      fromResultsQueue['project_skips'] = [
        { data: null, error: null },
      ];

      await expect(editorService.unrejectProject('a1')).resolves.toBeUndefined();
    });

    it('should do nothing if not authenticated', async () => {
      getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(editorService.unrejectProject('a1')).resolves.toBeUndefined();
    });
  });
});
