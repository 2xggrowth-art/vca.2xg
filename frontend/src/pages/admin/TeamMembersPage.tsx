import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  FilmIcon,
  MegaphoneIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import TableColumnFilter from '@/components/admin/TableColumnFilter';
import SortableTableHeader from '@/components/admin/SortableTableHeader';
import { SplitViewLayout } from '@/components/admin/layout/SplitViewLayout';
import TeamMemberDetailPanel from '@/components/admin/TeamMemberDetailPanel';

interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  is_trusted_writer?: boolean;
}

interface TeamStats {
  total_submitted?: number;
  approved?: number;
  rejected?: number;
  pending?: number;
  approval_rate?: number;
  assigned?: number;
  shooting?: number;
  in_review?: number;
  completed?: number;
  editing?: number;
  ready_to_post?: number;
  posted?: number;
  posted_this_week?: number;
}

type TabType = 'writers' | 'videographers' | 'editors' | 'posting';
type SortField =
  | 'name'
  | 'total'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'rate'
  | 'assigned'
  | 'shooting'
  | 'editing'
  | 'in_review'
  | 'completed'
  | 'ready_to_post'
  | 'posted'
  | 'posted_week';
type SortDirection = 'asc' | 'desc' | null;

interface ScriptWriterFilters {
  totalMin?: number;
  totalMax?: number;
  approvedMin?: number;
  approvedMax?: number;
  rejectedMin?: number;
  rejectedMax?: number;
  pendingMin?: number;
  pendingMax?: number;
  rateMin?: number;
  rateMax?: number;
}

export default function TeamMembersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('writers');
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [scriptWriterSearch, setScriptWriterSearch] = useState('');
  const [videographerSearch, setVideographerSearch] = useState('');
  const [editorSearch, setEditorSearch] = useState('');
  const [postingSearch, setPostingSearch] = useState('');

  // Script Writers filters and sort
  const [scriptWriterFilters, setScriptWriterFilters] = useState<ScriptWriterFilters>({});
  const [scriptWriterSort, setScriptWriterSort] = useState<{
    field: SortField | null;
    direction: SortDirection;
  }>({ field: null, direction: null });

  // Mutation to update trusted writer status
  const updateTrustedWriterMutation = useMutation({
    mutationFn: async ({ userId, isTrusted }: { userId: string; isTrusted: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_trusted_writer: isTrusted })
        .eq('id', userId);

      if (error) throw error;
      return { userId, isTrusted };
    },
    onSuccess: ({ isTrusted }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'team-members'] });
      toast.success(isTrusted ? 'Writer marked as trusted' : 'Trusted status removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update trusted status');
    },
  });

  const handleToggleTrustedWriter = (member: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTrustedWriterMutation.mutate({
      userId: member.id,
      isTrusted: !member.is_trusted_writer,
    });
  };

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember({
      id: member.id,
      name: member.full_name || member.email,
      role: member.role,
    });
  };

  const handleViewAnalyses = (userId: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // For script writers, show scripts they submitted (user_id)
    // For other roles, show projects assigned to them (project_assignments)
    if (role === 'SCRIPT_WRITER') {
      navigate(`/admin/analyses/by-user/${userId}`);
    } else {
      navigate(`/admin/analyses/by-user/${userId}?assignedTo=true`);
    }
  };

  // Sort handler for Script Writers
  const handleScriptWriterSort = (field: string) => {
    setScriptWriterSort((prev) => {
      if (prev.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field: null, direction: null };
      }
      return { field: field as SortField, direction: 'asc' };
    });
  };

  // Fetch all team members
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['admin', 'team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['SCRIPT_WRITER', 'VIDEOGRAPHER', 'EDITOR', 'POSTING_MANAGER'])
        .order('role')
        .order('full_name');

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Fetch stats for script writers
  const { data: scriptWriterStats = {} } = useQuery({
    queryKey: ['admin', 'script-writer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('viral_analyses').select('user_id, status');

      if (error) throw error;

      const stats: Record<string, TeamStats> = {};

      data.forEach((item: any) => {
        if (!stats[item.user_id]) {
          stats[item.user_id] = {
            total_submitted: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
          };
        }
        stats[item.user_id].total_submitted!++;
        if (item.status === 'APPROVED') stats[item.user_id].approved!++;
        if (item.status === 'REJECTED') stats[item.user_id].rejected!++;
        if (item.status === 'PENDING') stats[item.user_id].pending!++;
      });

      Object.keys(stats).forEach((userId) => {
        const total = stats[userId].approved! + stats[userId].rejected!;
        stats[userId].approval_rate =
          total > 0 ? Math.round((stats[userId].approved! / total) * 100) : 0;
      });

      return stats;
    },
  });

  // Fetch content_ids for script writers (for search functionality)
  const { data: scriptWriterContentIds = {} } = useQuery({
    queryKey: ['admin', 'script-writer-content-ids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('viral_analyses').select('user_id, content_id');

      if (error) throw error;

      const contentIds: Record<string, string[]> = {};
      data.forEach((item: any) => {
        if (!contentIds[item.user_id]) contentIds[item.user_id] = [];
        if (item.content_id) contentIds[item.user_id].push(item.content_id.toLowerCase());
      });
      return contentIds;
    },
  });

  // Fetch stats for videographers
  const { data: videographerStats = {} } = useQuery({
    queryKey: ['admin', 'videographer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(
          `
          user_id,
          viral_analyses!inner (production_stage)
        `
        )
        .eq('role', 'VIDEOGRAPHER');

      if (error) throw error;

      const stats: Record<string, TeamStats> = {};

      data.forEach((item: any) => {
        if (!stats[item.user_id]) {
          stats[item.user_id] = {
            assigned: 0,
            shooting: 0,
            in_review: 0,
            completed: 0,
          };
        }
        stats[item.user_id].assigned!++;

        const stage = item.viral_analyses?.production_stage;
        if (stage === 'SHOOTING') stats[item.user_id].shooting!++;
        if (stage === 'SHOOT_REVIEW') stats[item.user_id].in_review!++;
        if (['EDITING', 'EDIT_REVIEW', 'FINAL_REVIEW', 'READY_TO_POST', 'POSTED'].includes(stage)) {
          stats[item.user_id].completed!++;
        }
      });

      return stats;
    },
  });

  // Fetch stats for editors
  const { data: editorStats = {} } = useQuery({
    queryKey: ['admin', 'editor-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(
          `
          user_id,
          viral_analyses!inner (production_stage)
        `
        )
        .eq('role', 'EDITOR');

      if (error) throw error;

      const stats: Record<string, TeamStats> = {};

      data.forEach((item: any) => {
        if (!stats[item.user_id]) {
          stats[item.user_id] = {
            assigned: 0,
            editing: 0,
            in_review: 0,
            completed: 0,
          };
        }
        stats[item.user_id].assigned!++;

        const stage = item.viral_analyses?.production_stage;
        if (stage === 'EDITING') stats[item.user_id].editing!++;
        if (stage === 'EDIT_REVIEW') stats[item.user_id].in_review!++;
        if (['FINAL_REVIEW', 'READY_TO_POST', 'POSTED'].includes(stage)) {
          stats[item.user_id].completed!++;
        }
      });

      return stats;
    },
  });

  // Fetch stats for posting managers
  const { data: postingStats = {} } = useQuery({
    queryKey: ['admin', 'posting-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select(
          `
          user_id,
          viral_analyses!inner (production_stage, updated_at)
        `
        )
        .eq('role', 'POSTING_MANAGER');

      if (error) throw error;

      const stats: Record<string, TeamStats> = {};
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      data.forEach((item: any) => {
        if (!stats[item.user_id]) {
          stats[item.user_id] = {
            assigned: 0,
            ready_to_post: 0,
            posted: 0,
            posted_this_week: 0,
          };
        }
        stats[item.user_id].assigned!++;

        const stage = item.viral_analyses?.production_stage;
        if (stage === 'READY_TO_POST') stats[item.user_id].ready_to_post!++;
        if (stage === 'POSTED') {
          stats[item.user_id].posted!++;
          if (new Date(item.viral_analyses.updated_at) > oneWeekAgo) {
            stats[item.user_id].posted_this_week!++;
          }
        }
      });

      return stats;
    },
  });

  const groupedMembers = {
    SCRIPT_WRITER: teamMembers.filter((m) => m.role === 'SCRIPT_WRITER'),
    VIDEOGRAPHER: teamMembers.filter((m) => m.role === 'VIDEOGRAPHER'),
    EDITOR: teamMembers.filter((m) => m.role === 'EDITOR'),
    POSTING_MANAGER: teamMembers.filter((m) => m.role === 'POSTING_MANAGER'),
  };

  // Filtered lists based on search
  const filteredScriptWriters = useMemo(() => {
    let result = [...groupedMembers.SCRIPT_WRITER];

    if (scriptWriterSearch.trim()) {
      const search = scriptWriterSearch.toLowerCase();
      result = result.filter((member) => {
        const userContentIds = scriptWriterContentIds[member.id] || [];
        return (
          member.full_name?.toLowerCase().includes(search) ||
          member.email.toLowerCase().includes(search) ||
          userContentIds.some((id) => id.includes(search))
        );
      });
    }

    result = result.filter((member) => {
      const stats = scriptWriterStats[member.id] || {};
      const total = stats.total_submitted || 0;
      const approved = stats.approved || 0;
      const rejected = stats.rejected || 0;
      const pending = stats.pending || 0;
      const rate = stats.approval_rate || 0;

      if (scriptWriterFilters.totalMin !== undefined && total < scriptWriterFilters.totalMin)
        return false;
      if (scriptWriterFilters.totalMax !== undefined && total > scriptWriterFilters.totalMax)
        return false;
      if (
        scriptWriterFilters.approvedMin !== undefined &&
        approved < scriptWriterFilters.approvedMin
      )
        return false;
      if (
        scriptWriterFilters.approvedMax !== undefined &&
        approved > scriptWriterFilters.approvedMax
      )
        return false;
      if (
        scriptWriterFilters.rejectedMin !== undefined &&
        rejected < scriptWriterFilters.rejectedMin
      )
        return false;
      if (
        scriptWriterFilters.rejectedMax !== undefined &&
        rejected > scriptWriterFilters.rejectedMax
      )
        return false;
      if (scriptWriterFilters.pendingMin !== undefined && pending < scriptWriterFilters.pendingMin)
        return false;
      if (scriptWriterFilters.pendingMax !== undefined && pending > scriptWriterFilters.pendingMax)
        return false;
      if (scriptWriterFilters.rateMin !== undefined && rate < scriptWriterFilters.rateMin)
        return false;
      if (scriptWriterFilters.rateMax !== undefined && rate > scriptWriterFilters.rateMax)
        return false;

      return true;
    });

    if (scriptWriterSort.field && scriptWriterSort.direction) {
      result.sort((a, b) => {
        const statsA = scriptWriterStats[a.id] || {};
        const statsB = scriptWriterStats[b.id] || {};

        let valueA: number | string = 0;
        let valueB: number | string = 0;

        switch (scriptWriterSort.field) {
          case 'name':
            valueA = a.full_name || a.email;
            valueB = b.full_name || b.email;
            break;
          case 'total':
            valueA = statsA.total_submitted || 0;
            valueB = statsB.total_submitted || 0;
            break;
          case 'approved':
            valueA = statsA.approved || 0;
            valueB = statsB.approved || 0;
            break;
          case 'rejected':
            valueA = statsA.rejected || 0;
            valueB = statsB.rejected || 0;
            break;
          case 'pending':
            valueA = statsA.pending || 0;
            valueB = statsB.pending || 0;
            break;
          case 'rate':
            valueA = statsA.approval_rate || 0;
            valueB = statsB.approval_rate || 0;
            break;
        }

        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return scriptWriterSort.direction === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return scriptWriterSort.direction === 'asc'
          ? (valueA as number) - (valueB as number)
          : (valueB as number) - (valueA as number);
      });
    }

    return result;
  }, [
    groupedMembers.SCRIPT_WRITER,
    scriptWriterSearch,
    scriptWriterFilters,
    scriptWriterSort,
    scriptWriterStats,
    scriptWriterContentIds,
  ]);

  const filteredVideographers = useMemo(() => {
    if (!videographerSearch.trim()) return groupedMembers.VIDEOGRAPHER;
    const search = videographerSearch.toLowerCase();
    return groupedMembers.VIDEOGRAPHER.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
    );
  }, [groupedMembers.VIDEOGRAPHER, videographerSearch]);

  const filteredEditors = useMemo(() => {
    if (!editorSearch.trim()) return groupedMembers.EDITOR;
    const search = editorSearch.toLowerCase();
    return groupedMembers.EDITOR.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
    );
  }, [groupedMembers.EDITOR, editorSearch]);

  const filteredPostingManagers = useMemo(() => {
    if (!postingSearch.trim()) return groupedMembers.POSTING_MANAGER;
    const search = postingSearch.toLowerCase();
    return groupedMembers.POSTING_MANAGER.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search)
    );
  }, [groupedMembers.POSTING_MANAGER, postingSearch]);

  // Get current search based on tab
  const getCurrentSearch = () => {
    switch (activeTab) {
      case 'writers':
        return scriptWriterSearch;
      case 'videographers':
        return videographerSearch;
      case 'editors':
        return editorSearch;
      case 'posting':
        return postingSearch;
      default:
        return '';
    }
  };

  const setCurrentSearch = (value: string) => {
    switch (activeTab) {
      case 'writers':
        setScriptWriterSearch(value);
        break;
      case 'videographers':
        setVideographerSearch(value);
        break;
      case 'editors':
        setEditorSearch(value);
        break;
      case 'posting':
        setPostingSearch(value);
        break;
    }
  };

  // Render the table for each role
  const renderScriptWritersTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTableHeader
                label="Name"
                field="name"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
              />
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <span className="inline-flex items-center gap-1" title="Trusted writers get auto-approved">
                  Trusted
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </th>
              <SortableTableHeader
                label="Total"
                field="total"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
                filterComponent={
                  <TableColumnFilter
                    column="Total Scripts"
                    type="number"
                    currentFilter={{
                      min: scriptWriterFilters.totalMin,
                      max: scriptWriterFilters.totalMax,
                    }}
                    onFilterChange={(filter) =>
                      setScriptWriterFilters((prev) => ({
                        ...prev,
                        totalMin: filter?.min,
                        totalMax: filter?.max,
                      }))
                    }
                  />
                }
              />
              <SortableTableHeader
                label="Approved"
                field="approved"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
                filterComponent={
                  <TableColumnFilter
                    column="Approved"
                    type="number"
                    currentFilter={{
                      min: scriptWriterFilters.approvedMin,
                      max: scriptWriterFilters.approvedMax,
                    }}
                    onFilterChange={(filter) =>
                      setScriptWriterFilters((prev) => ({
                        ...prev,
                        approvedMin: filter?.min,
                        approvedMax: filter?.max,
                      }))
                    }
                  />
                }
              />
              <SortableTableHeader
                label="Rejected"
                field="rejected"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
                filterComponent={
                  <TableColumnFilter
                    column="Rejected"
                    type="number"
                    currentFilter={{
                      min: scriptWriterFilters.rejectedMin,
                      max: scriptWriterFilters.rejectedMax,
                    }}
                    onFilterChange={(filter) =>
                      setScriptWriterFilters((prev) => ({
                        ...prev,
                        rejectedMin: filter?.min,
                        rejectedMax: filter?.max,
                      }))
                    }
                  />
                }
              />
              <SortableTableHeader
                label="Pending"
                field="pending"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
                filterComponent={
                  <TableColumnFilter
                    column="Pending"
                    type="number"
                    currentFilter={{
                      min: scriptWriterFilters.pendingMin,
                      max: scriptWriterFilters.pendingMax,
                    }}
                    onFilterChange={(filter) =>
                      setScriptWriterFilters((prev) => ({
                        ...prev,
                        pendingMin: filter?.min,
                        pendingMax: filter?.max,
                      }))
                    }
                  />
                }
              />
              <SortableTableHeader
                label="Rate"
                field="rate"
                currentSort={scriptWriterSort}
                onSort={handleScriptWriterSort}
                filterComponent={
                  <TableColumnFilter
                    column="Approval Rate"
                    type="percentage"
                    currentFilter={{
                      min: scriptWriterFilters.rateMin,
                      max: scriptWriterFilters.rateMax,
                    }}
                    onFilterChange={(filter) =>
                      setScriptWriterFilters((prev) => ({
                        ...prev,
                        rateMin: filter?.min,
                        rateMax: filter?.max,
                      }))
                    }
                  />
                }
              />
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredScriptWriters.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                  No script writers found
                </td>
              </tr>
            ) : (
              filteredScriptWriters.map((member) => {
                const stats = scriptWriterStats[member.id] || {};
                const isActive = selectedMember?.id === member.id;
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-primary-50' : ''}`}
                    onClick={() => handleMemberClick(member)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-primary-600 hover:text-primary-800">
                        {member.full_name || member.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleToggleTrustedWriter(member, e)}
                        disabled={updateTrustedWriterMutation.isPending}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          member.is_trusted_writer ? 'bg-green-500' : 'bg-gray-200'
                        } ${updateTrustedWriterMutation.isPending ? 'opacity-50' : ''}`}
                        title={member.is_trusted_writer ? 'Click to remove trusted status' : 'Click to mark as trusted writer'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            member.is_trusted_writer ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {stats.total_submitted || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                      {stats.approved || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                      {stats.rejected || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {stats.pending || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          (stats.approval_rate || 0) >= 75
                            ? 'bg-green-100 text-green-800'
                            : (stats.approval_rate || 0) >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {stats.approval_rate || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleViewAnalyses(member.id, member.role, e)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                      >
                        <TableCellsIcon className="w-3.5 h-3.5 mr-1" />
                        Table
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVideographersTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span
                  className="inline-flex items-center gap-1"
                  title="Production assignments only"
                >
                  Assigned
                  <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shooting
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Review
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVideographers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No videographers found
                </td>
              </tr>
            ) : (
              filteredVideographers.map((member) => {
                const stats = videographerStats[member.id] || {};
                const isActive = selectedMember?.id === member.id;
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-primary-50' : ''}`}
                    onClick={() => handleMemberClick(member)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-primary-600">
                        {member.full_name || member.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {stats.assigned || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {stats.shooting || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {stats.in_review || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                      {stats.completed || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleViewAnalyses(member.id, member.role, e)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                      >
                        <TableCellsIcon className="w-3.5 h-3.5 mr-1" />
                        Table
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEditorsTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span
                  className="inline-flex items-center gap-1"
                  title="Production assignments only"
                >
                  Assigned
                  <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Editing
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Review
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEditors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No editors found
                </td>
              </tr>
            ) : (
              filteredEditors.map((member) => {
                const stats = editorStats[member.id] || {};
                const isActive = selectedMember?.id === member.id;
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-primary-50' : ''}`}
                    onClick={() => handleMemberClick(member)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-primary-600">
                        {member.full_name || member.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {stats.assigned || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 font-medium">
                      {stats.editing || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {stats.in_review || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                      {stats.completed || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleViewAnalyses(member.id, member.role, e)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                      >
                        <TableCellsIcon className="w-3.5 h-3.5 mr-1" />
                        Table
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPostingManagersTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span
                  className="inline-flex items-center gap-1"
                  title="Production assignments only"
                >
                  Assigned
                  <QuestionMarkCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ready
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posted
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                This Week
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPostingManagers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No posting managers found
                </td>
              </tr>
            ) : (
              filteredPostingManagers.map((member) => {
                const stats = postingStats[member.id] || {};
                const isActive = selectedMember?.id === member.id;
                return (
                  <tr
                    key={member.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isActive ? 'bg-primary-50' : ''}`}
                    onClick={() => handleMemberClick(member)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-primary-600">
                        {member.full_name || member.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {stats.assigned || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {stats.ready_to_post || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                      {stats.posted || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {stats.posted_this_week || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => handleViewAnalyses(member.id, member.role, e)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                      >
                        <TableCellsIcon className="w-3.5 h-3.5 mr-1" />
                        Table
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render the master content
  const renderMasterContent = () => {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="w-6 h-6 mr-2 text-primary-600" />
                Team Members
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} across all roles
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('writers')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'writers'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4 mr-1.5" />
              Writers
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                {groupedMembers.SCRIPT_WRITER.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('videographers')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'videographers'
                  ? 'bg-white text-indigo-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <VideoCameraIcon className="w-4 h-4 mr-1.5" />
              Video
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                {groupedMembers.VIDEOGRAPHER.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('editors')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'editors'
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FilmIcon className="w-4 h-4 mr-1.5" />
              Editors
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                {groupedMembers.EDITOR.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('posting')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'posting'
                  ? 'bg-white text-pink-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MegaphoneIcon className="w-4 h-4 mr-1.5" />
              PM
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700">
                {groupedMembers.POSTING_MANAGER.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={getCurrentSearch()}
              onChange={(e) => setCurrentSearch(e.target.value)}
              placeholder={
                activeTab === 'writers'
                  ? 'Search by name, email, or content ID...'
                  : 'Search by name or email...'
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'writers' && renderScriptWritersTable()}
              {activeTab === 'videographers' && renderVideographersTable()}
              {activeTab === 'editors' && renderEditorsTable()}
              {activeTab === 'posting' && renderPostingManagersTable()}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render detail content
  const renderDetailContent = () => {
    return (
      <TeamMemberDetailPanel
        memberId={selectedMember?.id || null}
        memberName={selectedMember?.name || ''}
        memberRole={selectedMember?.role || ''}
        onClose={() => setSelectedMember(null)}
      />
    );
  };

  return (
    <div className="h-full">
      <SplitViewLayout
        masterContent={renderMasterContent()}
        detailContent={renderDetailContent()}
        hasActiveItem={!!selectedMember}
        onCloseDetail={() => setSelectedMember(null)}
      />
    </div>
  );
}
