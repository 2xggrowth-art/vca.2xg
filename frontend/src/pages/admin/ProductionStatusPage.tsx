import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlayIcon,
  SunIcon,
  ArrowPathIcon,
  FlagIcon,
  LinkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ProductionStage, ProductionStageV2, Priority } from '@/types';
import type { ViralAnalysis } from '@/types';
import { SplitViewLayout } from '@/components/admin/layout/SplitViewLayout';
import { BulkActionToolbar, type BulkAction } from '@/components/admin/layout/BulkActionToolbar';
import { useSelection } from '@/hooks/useSelection';
import ProductionDetailPanel from '@/components/admin/ProductionDetailPanel';

type TabType = 'planning' | 'shooting' | 'readyForEdit' | 'editing' | 'readyToPost' | 'posted';

interface ProductionFile {
  id: string;
  file_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

export default function ProductionStatusPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('planning');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showShootingTodayOnly, setShowShootingTodayOnly] = useState(false);
  const [profileFilter, setProfileFilter] = useState<string>('');

  // Selection hook for bulk actions
  const {
    selectedIds,
    activeItemId,
    toggle,
    selectAll,
    deselectAll,
    setActiveItem,
    isSelected,
    isActive,
    selectedCount,
    hasSelection,
  } = useSelection<ViralAnalysis>();

  // Fetch all approved analyses
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['admin', 'production-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(`
          *,
          profiles:user_id (email, full_name, avatar_url),
          profile:profile_id (id, name),
          project_assignments (
            role,
            user:user_id (id, email, full_name, avatar_url)
          )
        `)
        .eq('status', 'APPROVED')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        profile: item.profile, // Profile from profile_list table
        videographer: item.project_assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
        editor: item.project_assignments?.find((a: any) => a.role === 'EDITOR')?.user,
        posting_manager: item.project_assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
      })) as ViralAnalysis[];
    },
  });

  // Fetch production files for all analyses
  const { data: productionFiles = {} } = useQuery({
    queryKey: ['admin', 'production-files-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_files')
        .select('*')
        .eq('is_deleted', false);

      if (error) throw error;

      const filesByAnalysis: Record<string, ProductionFile[]> = {};
      (data || []).forEach((file: any) => {
        if (!filesByAnalysis[file.analysis_id]) {
          filesByAnalysis[file.analysis_id] = [];
        }
        filesByAnalysis[file.analysis_id].push(file);
      });
      return filesByAnalysis;
    },
  });

  // Mutation to set planned date
  const setPlannedDateMutation = useMutation({
    mutationFn: async ({ analysisId, plannedDate }: { analysisId: string; plannedDate: string }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .update({
          planned_date: plannedDate,
          production_stage: ProductionStage.PLANNED
        })
        .eq('id', analysisId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      toast.success('Planned date set successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set planned date');
    },
  });

  // Mutation to update planned date (for shooting tab - doesn't change stage)
  const updatePlannedDateMutation = useMutation({
    mutationFn: async ({ analysisId, plannedDate }: { analysisId: string; plannedDate: string }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .update({ planned_date: plannedDate })
        .eq('id', analysisId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      toast.success('Shoot date updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shoot date');
    },
  });

  // Mutation to set deadline
  const setDeadlineMutation = useMutation({
    mutationFn: async ({ analysisId, deadline }: { analysisId: string; deadline: string }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .update({ deadline })
        .eq('id', analysisId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      toast.success('Deadline updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update deadline');
    },
  });

  // Bulk mutation to change stage
  const bulkChangeStageListMutation = useMutation({
    mutationFn: async ({ ids, stage }: { ids: string[]; stage: string }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .update({ production_stage: stage })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      toast.success(`${variables.ids.length} items moved to ${variables.stage.replace(/_/g, ' ')}`);
      deselectAll();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change stage');
    },
  });

  // Bulk mutation to change priority
  const bulkChangePriorityMutation = useMutation({
    mutationFn: async ({ ids, priority }: { ids: string[]; priority: string }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .update({ priority })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      toast.success(`Priority updated for ${variables.ids.length} items`);
      deselectAll();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change priority');
    },
  });

  // Bulk mutation to delete projects
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await supabase
        .from('viral_analyses')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success(`${variables.ids.length} project${variables.ids.length > 1 ? 's' : ''} deleted`);
      deselectAll();
      setActiveItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete projects');
    },
  });

  // Get unique profiles for filter dropdown
  const uniqueProfiles = useMemo(() => {
    const profiles = analyses
      .filter(a => a.profile?.name)
      .map(a => ({ id: a.profile!.id, name: a.profile!.name }));

    // Remove duplicates by id
    const seen = new Set<string>();
    return profiles.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [analyses]);

  // Filter by search and profile
  const filteredAnalyses = useMemo(() => {
    let result = analyses;

    // Filter by search query
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      result = result.filter(a => {
        // Check content_id (includes BCH prefix)
        if (a.content_id?.toLowerCase().includes(search)) return true;
        // Check title
        if (a.title?.toLowerCase().includes(search)) return true;
        // Check hook (for backwards compatibility)
        if (a.hook?.toLowerCase().includes(search)) return true;
        // Check profile name
        if (a.profile?.name?.toLowerCase().includes(search)) return true;
        // Check team members
        if (a.videographer?.full_name?.toLowerCase().includes(search)) return true;
        if (a.videographer?.email?.toLowerCase().includes(search)) return true;
        if (a.editor?.full_name?.toLowerCase().includes(search)) return true;
        if (a.editor?.email?.toLowerCase().includes(search)) return true;
        if (a.posting_manager?.full_name?.toLowerCase().includes(search)) return true;
        if (a.posting_manager?.email?.toLowerCase().includes(search)) return true;
        return false;
      });
    }

    // Filter by profile
    if (profileFilter) {
      result = result.filter(a => a.profile?.id === profileFilter);
    }

    return result;
  }, [analyses, searchQuery, profileFilter]);

  // Helper to check if a date is today
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Group by tabs using V2 stages (also support legacy stages for backwards compatibility)
  // Cast to string for comparison since the database may have either old or new stage values
  const planningAll = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.PLANNING ||
      stage === ProductionStage.NOT_STARTED ||
      stage === ProductionStage.PRE_PRODUCTION ||
      stage === ProductionStage.PLANNED ||
      (!stage && a.status === 'APPROVED'); // Approved but no stage yet
  });
  const planningToday = planningAll.filter(a => isToday(a.planned_date));
  const planning = showTodayOnly ? planningToday : planningAll;

  const shootingAll = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.SHOOTING ||
      stage === ProductionStage.SHOOTING;
  });
  const shootingToday = shootingAll.filter(a => isToday(a.planned_date));
  const shooting = showShootingTodayOnly ? shootingToday : shootingAll;

  // Ready for Edit (new V2 stage, replaces SHOOT_REVIEW)
  const readyForEdit = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.READY_FOR_EDIT ||
      stage === ProductionStage.SHOOT_REVIEW;
  });

  const editing = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.EDITING ||
      stage === ProductionStage.EDITING ||
      stage === ProductionStage.EDIT_REVIEW;
  });

  // Ready to Post (new V2 stage, replaces FINAL_REVIEW)
  const readyToPost = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.READY_TO_POST ||
      stage === ProductionStage.FINAL_REVIEW ||
      stage === ProductionStage.READY_TO_POST;
  });

  const posted = filteredAnalyses.filter(a => {
    const stage = a.production_stage as string;
    return stage === ProductionStageV2.POSTED ||
      stage === ProductionStage.POSTED;
  });

  const tabs = [
    { id: 'planning' as TabType, label: 'Planning', count: planningAll.length, todayCount: planningToday.length, color: 'cyan' },
    { id: 'shooting' as TabType, label: 'Shooting', count: shootingAll.length, todayCount: shootingToday.length, color: 'indigo' },
    { id: 'readyForEdit' as TabType, label: 'Ready for Edit', count: readyForEdit.length, color: 'yellow' },
    { id: 'editing' as TabType, label: 'Editing', count: editing.length, color: 'purple' },
    { id: 'readyToPost' as TabType, label: 'Ready to Post', count: readyToPost.length, color: 'green' },
    { id: 'posted' as TabType, label: 'Posted', count: posted.length, color: 'emerald' },
  ];

  const getCurrentData = (): ViralAnalysis[] => {
    switch (activeTab) {
      case 'planning': return planning;
      case 'shooting': return shooting;
      case 'readyForEdit': return readyForEdit;
      case 'editing': return editing;
      case 'readyToPost': return readyToPost;
      case 'posted': return posted;
      default: return [];
    }
  };

  const currentData = getCurrentData();
  const activeAnalysis = currentData.find(a => a.id === activeItemId) || null;

  const getDaysInStage = (updatedAt: string) => {
    const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getFileStatus = (analysisId: string, requiredFileType: string, deadline?: string) => {
    const files = productionFiles[analysisId] || [];
    const hasFile = files.some(f => f.file_type === requiredFileType);

    if (hasFile) {
      const file = files.find(f => f.file_type === requiredFileType);
      return { status: 'uploaded', file, icon: CheckCircleIcon, color: 'text-green-600' };
    }

    if (deadline && new Date(deadline) < new Date()) {
      return { status: 'overdue', file: null, icon: ExclamationTriangleIcon, color: 'text-orange-600' };
    }

    return { status: 'pending', file: null, icon: MinusCircleIcon, color: 'text-gray-400' };
  };

  const getFilesForProject = (analysisId: string, fileTypes: string[]) => {
    const files = productionFiles[analysisId] || [];
    return files.filter(f => fileTypes.includes(f.file_type));
  };

  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      // V2 Stages
      case ProductionStageV2.PLANNING: return 'bg-cyan-100 text-cyan-800';
      case ProductionStageV2.SHOOTING: return 'bg-indigo-100 text-indigo-800';
      case ProductionStageV2.READY_FOR_EDIT: return 'bg-yellow-100 text-yellow-800';
      case ProductionStageV2.EDITING: return 'bg-purple-100 text-purple-800';
      case ProductionStageV2.READY_TO_POST: return 'bg-green-100 text-green-800';
      case ProductionStageV2.POSTED: return 'bg-emerald-100 text-emerald-800';
      // Legacy stages for backwards compatibility
      case ProductionStage.NOT_STARTED: return 'bg-gray-100 text-gray-800';
      case ProductionStage.PRE_PRODUCTION: return 'bg-blue-100 text-blue-800';
      case ProductionStage.PLANNED: return 'bg-cyan-100 text-cyan-800';
      case ProductionStage.SHOOTING: return 'bg-indigo-100 text-indigo-800';
      case ProductionStage.SHOOT_REVIEW: return 'bg-yellow-100 text-yellow-800';
      case ProductionStage.EDITING: return 'bg-purple-100 text-purple-800';
      case ProductionStage.EDIT_REVIEW: return 'bg-pink-100 text-pink-800';
      case ProductionStage.FINAL_REVIEW: return 'bg-orange-100 text-orange-800';
      case ProductionStage.READY_TO_POST: return 'bg-green-100 text-green-800';
      case ProductionStage.POSTED: return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle row click - set as active (view in detail panel)
  const handleRowClick = (project: ViralAnalysis) => {
    setActiveItem(project.id);
  };

  // Handle checkbox click - toggle selection for bulk actions
  const handleCheckboxClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    toggle(projectId);
  };

  // Clear selection when changing tabs
  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    deselectAll();
    setActiveItem(null);
  };

  // Bulk actions based on current tab
  const getBulkActions = (): BulkAction[] => {
    const selectedIdArray = Array.from(selectedIds);

    const actions: BulkAction[] = [];

    // Stage change actions based on current tab
    if (activeTab === 'planning') {
      actions.push({
        id: 'start-shooting',
        label: 'Start Shooting',
        icon: <PlayIcon className="w-4 h-4" />,
        variant: 'success',
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStageV2.SHOOTING }),
      });
    }

    if (activeTab === 'shooting') {
      actions.push({
        id: 'move-to-ready-for-edit',
        label: 'Ready for Edit',
        variant: 'success',
        icon: <ArrowPathIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStageV2.READY_FOR_EDIT }),
      });
    }

    if (activeTab === 'readyForEdit') {
      actions.push({
        id: 'move-to-editing',
        label: 'Start Editing',
        variant: 'success',
        icon: <ArrowPathIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStageV2.EDITING }),
      });
    }

    if (activeTab === 'editing') {
      actions.push({
        id: 'move-to-ready',
        label: 'Mark Ready',
        variant: 'success',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStageV2.READY_TO_POST }),
      });
    }

    if (activeTab === 'readyToPost') {
      actions.push({
        id: 'mark-posted',
        label: 'Mark Posted',
        variant: 'success',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStageV2.POSTED }),
      });
    }

    // Priority actions (available on all tabs except posted)
    if (activeTab !== 'posted') {
      actions.push({
        id: 'set-urgent',
        label: 'Set Urgent',
        icon: <FlagIcon className="w-4 h-4" />,
        variant: 'danger',
        onClick: () => bulkChangePriorityMutation.mutate({ ids: selectedIdArray, priority: Priority.URGENT }),
      });
      actions.push({
        id: 'set-high',
        label: 'Set High',
        icon: <FlagIcon className="w-4 h-4" />,
        variant: 'warning',
        onClick: () => bulkChangePriorityMutation.mutate({ ids: selectedIdArray, priority: Priority.HIGH }),
      });
    }

    // Delete action (available on all tabs)
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      variant: 'danger',
      onClick: () => {
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedIdArray.length} project${selectedIdArray.length > 1 ? 's' : ''}? This action cannot be undone.`
        );
        if (confirmed) {
          bulkDeleteMutation.mutate({ ids: selectedIdArray });
        }
      },
    });

    return actions;
  };

  // Close detail panel when clicking outside
  const handleClosePanel = () => {
    setActiveItem(null);
  };

  // Master Panel Content
  const masterContent = (
    <div className="flex flex-col h-full">
      {/* Header - clicking here closes the detail panel */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 cursor-default"
        onClick={handleClosePanel}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="w-6 h-6 mr-2 text-primary-600" />
                Production Status
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                {filteredAnalyses.length} project{filteredAnalyses.length !== 1 ? 's' : ''} in pipeline
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by content ID, title, profile, team..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>

            {/* Profile Filter Dropdown */}
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[140px] ${
                profileFilter ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'
              }`}
            >
              <option value="">All Profiles</option>
              {uniqueProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>

            {/* Clear Filters Button - shows when profile filter is active */}
            {profileFilter && (
              <button
                onClick={() => setProfileFilter('')}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                title="Clear filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-2">
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? `bg-${tab.color}-100 text-${tab.color}-800` : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
                {(tab.id === 'planning' || tab.id === 'shooting') && tab.todayCount !== undefined && tab.todayCount > 0 && (
                  <span className="ml-1 px-1 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
                    {tab.todayCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab-specific filters */}
          {activeTab === 'planning' && (
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition mr-2
                ${showTodayOnly
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              <SunIcon className="w-3.5 h-3.5" />
              Today
            </button>
          )}

          {activeTab === 'shooting' && (
            <button
              onClick={() => setShowShootingTodayOnly(!showShootingTodayOnly)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition mr-2
                ${showShootingTodayOnly
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              <SunIcon className="w-3.5 h-3.5" />
              Today
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div
        className="flex-1 overflow-auto"
        onClick={(e) => {
          // Close detail panel when clicking on empty space (not on a row)
          const target = e.target as HTMLElement;
          if (target.tagName === 'DIV' && target.classList.contains('overflow-auto')) {
            setActiveItem(null);
          }
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="p-8 text-center" onClick={handleClosePanel}>
            <p className="text-gray-500">No projects in this stage</p>
          </div>
        ) : (
          <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedCount === currentData.length && currentData.length > 0}
                    onChange={() => selectedCount === currentData.length ? deselectAll() : selectAll(currentData)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Content ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Profile
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Ref
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                  Title
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Stage
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Team
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Files
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Priority
                </th>
                {activeTab === 'planning' && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Planned
                  </th>
                )}
                {activeTab === 'shooting' && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Shoot
                  </th>
                )}
                {activeTab !== 'planning' && activeTab !== 'shooting' && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Deadline
                  </th>
                )}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((project) => {
                const daysInStage = getDaysInStage(project.updated_at);
                let fileStatus;
                let allFiles: ProductionFile[] = [];

                if (activeTab === 'shooting') {
                  fileStatus = getFileStatus(project.id, 'raw-footage', project.deadline);
                  allFiles = getFilesForProject(project.id, ['raw-footage']);
                } else if (activeTab === 'readyForEdit') {
                  fileStatus = getFileStatus(project.id, 'raw-footage', project.deadline);
                  allFiles = getFilesForProject(project.id, ['raw-footage']);
                } else if (activeTab === 'editing') {
                  fileStatus = getFileStatus(project.id, 'edited-video', project.deadline);
                  allFiles = getFilesForProject(project.id, ['raw-footage', 'edited-video']);
                } else if (activeTab === 'readyToPost') {
                  fileStatus = getFileStatus(project.id, 'edited-video', project.deadline);
                  allFiles = getFilesForProject(project.id, ['raw-footage', 'edited-video']);
                }

                const rowIsSelected = isSelected(project.id);
                const rowIsActive = isActive(project.id);

                return (
                  <tr
                    key={project.id}
                    onClick={() => handleRowClick(project)}
                    className={`
                      cursor-pointer transition-colors
                      ${rowIsActive ? 'bg-primary-50 ring-2 ring-inset ring-primary-500' : ''}
                      ${rowIsSelected && !rowIsActive ? 'bg-blue-50' : ''}
                      ${!rowIsSelected && !rowIsActive ? 'hover:bg-gray-50' : ''}
                    `}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={rowIsSelected}
                        onClick={(e) => handleCheckboxClick(e, project.id)}
                        onChange={() => {}}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-primary-600">
                      {project.content_id || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {project.profile?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {project.profile.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {project.reference_url ? (
                        <a
                          href={project.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition"
                          title={project.reference_url}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="line-clamp-1 max-w-[180px]">
                        {project.title || project.hook || 'No title'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStageColor(project.production_stage)}`}>
                        {project.production_stage?.replace(/_/g, ' ') || 'NOT STARTED'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">
                      <div className="space-y-0.5">
                        {project.videographer && (
                          <div><span className="font-medium">V:</span> {project.videographer.full_name?.split(' ')[0] || project.videographer.email?.split('@')[0]}</div>
                        )}
                        {project.editor && (
                          <div><span className="font-medium">E:</span> {project.editor.full_name?.split(' ')[0] || project.editor.email?.split('@')[0]}</div>
                        )}
                        {!project.videographer && !project.editor && (
                          <span className="text-red-600 font-medium">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {allFiles.length > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          {allFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-0.5" title={`${file.file_type.replace(/-/g, ' ')}: ${file.file_name}`}>
                              <span className={`text-xs font-medium ${
                                file.file_type === 'raw-footage' ? 'text-indigo-600' :
                                file.file_type === 'edited-video' ? 'text-purple-600' :
                                'text-green-600'
                              }`}>
                                {file.file_type === 'raw-footage' ? 'R' : file.file_type === 'edited-video' ? 'E' : 'F'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewFile(file.file_url); }}
                                className="p-0.5 hover:bg-gray-100 rounded"
                                title={`View ${file.file_type.replace(/-/g, ' ')}`}
                              >
                                <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadFile(file.file_url, file.file_name); }}
                                className="p-0.5 hover:bg-gray-100 rounded"
                                title={`Download ${file.file_type.replace(/-/g, ' ')}`}
                              >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : fileStatus ? (
                        <div className="flex items-center justify-center gap-1">
                          <fileStatus.icon className={`w-4 h-4 ${fileStatus.color}`} />
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                        {project.priority || 'NORMAL'}
                      </span>
                    </td>
                    {activeTab === 'planning' && (
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="date"
                            value={project.planned_date ? new Date(project.planned_date).toISOString().split('T')[0] : ''}
                            min={new Date().toISOString().split('T')[0]}
                            className={`px-1.5 py-0.5 text-xs border rounded focus:ring-2 focus:ring-primary-500 w-28 cursor-pointer ${
                              project.planned_date
                                ? isToday(project.planned_date)
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 font-semibold'
                                  : 'border-gray-300 text-gray-600'
                                : 'border-gray-300'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.value) {
                                setPlannedDateMutation.mutate({ analysisId: project.id, plannedDate: e.target.value });
                              }
                            }}
                          />
                          {project.planned_date && isToday(project.planned_date) && (
                            <span className="px-1 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Today</span>
                          )}
                        </div>
                      </td>
                    )}
                    {activeTab === 'shooting' && (
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="date"
                            value={project.planned_date ? new Date(project.planned_date).toISOString().split('T')[0] : ''}
                            min={new Date().toISOString().split('T')[0]}
                            className={`px-1.5 py-0.5 text-xs border rounded focus:ring-2 focus:ring-primary-500 w-28 cursor-pointer ${
                              project.planned_date
                                ? isToday(project.planned_date)
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 font-semibold'
                                  : 'border-gray-300 text-gray-600'
                                : 'border-gray-300'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.value) {
                                updatePlannedDateMutation.mutate({ analysisId: project.id, plannedDate: e.target.value });
                              }
                            }}
                          />
                          {project.planned_date && isToday(project.planned_date) && (
                            <span className="px-1 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Today</span>
                          )}
                        </div>
                      </td>
                    )}
                    {activeTab !== 'planning' && activeTab !== 'shooting' && (
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="date"
                            value={project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''}
                            min={new Date().toISOString().split('T')[0]}
                            className={`px-1.5 py-0.5 text-xs border rounded focus:ring-2 focus:ring-primary-500 w-28 cursor-pointer ${
                              project.deadline
                                ? new Date(project.deadline) < new Date()
                                  ? 'border-red-300 bg-red-50 text-red-600 font-semibold'
                                  : 'border-gray-300 text-gray-600'
                                : 'border-gray-300'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.value) {
                                setDeadlineMutation.mutate({ analysisId: project.id, deadline: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-center">
                      <span className={`${daysInStage > 7 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        {daysInStage}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Click area below table to close panel */}
          <div
            className="h-16 w-full cursor-default"
            onClick={handleClosePanel}
          />
          </>
        )}
      </div>
    </div>
  );

  // Detail Panel Content
  const detailContent = activeAnalysis ? (
    <ProductionDetailPanel
      analysis={activeAnalysis}
      onClose={() => setActiveItem(null)}
    />
  ) : null;

  // Bulk Action Toolbar
  const bulkToolbar = hasSelection ? (
    <BulkActionToolbar
      selectedCount={selectedCount}
      totalCount={currentData.length}
      onSelectAll={() => selectAll(currentData)}
      onDeselectAll={deselectAll}
      actions={getBulkActions()}
      allSelected={selectedCount === currentData.length}
    />
  ) : null;

  return (
    <SplitViewLayout
      masterContent={masterContent}
      detailContent={detailContent}
      hasActiveItem={!!activeAnalysis}
      onCloseDetail={() => setActiveItem(null)}
      bulkActionToolbar={bulkToolbar}
    />
  );
}
