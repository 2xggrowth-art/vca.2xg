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
} from '@heroicons/react/24/outline';
import { ProductionStage, Priority } from '@/types';
import type { ViralAnalysis } from '@/types';
import { SplitViewLayout } from '@/components/admin/layout/SplitViewLayout';
import { BulkActionToolbar, type BulkAction } from '@/components/admin/layout/BulkActionToolbar';
import { useSelection } from '@/hooks/useSelection';
import ProductionDetailPanel from '@/components/admin/ProductionDetailPanel';

type TabType = 'unassigned' | 'planning' | 'shooting' | 'editing' | 'ready' | 'posted';

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
  const [activeTab, setActiveTab] = useState<TabType>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showShootingTodayOnly, setShowShootingTodayOnly] = useState(false);

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

  // Filter by search
  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return analyses;
    const search = searchQuery.toLowerCase();
    return analyses.filter(a =>
      a.content_id?.toLowerCase().includes(search) ||
      a.hook?.toLowerCase().includes(search) ||
      a.videographer?.full_name?.toLowerCase().includes(search) ||
      a.editor?.full_name?.toLowerCase().includes(search) ||
      a.posting_manager?.full_name?.toLowerCase().includes(search)
    );
  }, [analyses, searchQuery]);

  // Helper to check if a date is today
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Group by tabs
  const unassigned = filteredAnalyses.filter(a => !a.videographer && !a.editor && !a.posting_manager);
  const planningAll = filteredAnalyses.filter(a =>
    a.production_stage === ProductionStage.PRE_PRODUCTION ||
    a.production_stage === ProductionStage.PLANNED
  );
  const planningToday = planningAll.filter(a => isToday(a.planned_date));
  const planning = showTodayOnly ? planningToday : planningAll;

  const shootingAll = filteredAnalyses.filter(a =>
    a.production_stage === ProductionStage.SHOOTING ||
    a.production_stage === ProductionStage.SHOOT_REVIEW
  );
  const shootingToday = shootingAll.filter(a => isToday(a.planned_date));
  const shooting = showShootingTodayOnly ? shootingToday : shootingAll;

  const editing = filteredAnalyses.filter(a =>
    a.production_stage === ProductionStage.EDITING ||
    a.production_stage === ProductionStage.EDIT_REVIEW
  );
  const ready = filteredAnalyses.filter(a =>
    a.production_stage === ProductionStage.FINAL_REVIEW ||
    a.production_stage === ProductionStage.READY_TO_POST
  );
  const posted = filteredAnalyses.filter(a => a.production_stage === ProductionStage.POSTED);

  const tabs = [
    { id: 'unassigned' as TabType, label: 'Unassigned', count: unassigned.length, color: 'red' },
    { id: 'planning' as TabType, label: 'Planning', count: planningAll.length, todayCount: planningToday.length, color: 'cyan' },
    { id: 'shooting' as TabType, label: 'Shooting', count: shootingAll.length, todayCount: shootingToday.length, color: 'indigo' },
    { id: 'editing' as TabType, label: 'Editing', count: editing.length, color: 'purple' },
    { id: 'ready' as TabType, label: 'Ready to Post', count: ready.length, color: 'green' },
    { id: 'posted' as TabType, label: 'Posted', count: posted.length, color: 'emerald' },
  ];

  const getCurrentData = (): ViralAnalysis[] => {
    switch (activeTab) {
      case 'unassigned': return unassigned;
      case 'planning': return planning;
      case 'shooting': return shooting;
      case 'editing': return editing;
      case 'ready': return ready;
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
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStage.SHOOTING }),
      });
    }

    if (activeTab === 'shooting') {
      actions.push({
        id: 'move-to-editing',
        label: 'Move to Editing',
        variant: 'success',
        icon: <ArrowPathIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStage.EDITING }),
      });
    }

    if (activeTab === 'editing') {
      actions.push({
        id: 'move-to-ready',
        label: 'Mark Ready',
        variant: 'success',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStage.READY_TO_POST }),
      });
    }

    if (activeTab === 'ready') {
      actions.push({
        id: 'mark-posted',
        label: 'Mark Posted',
        variant: 'success',
        icon: <CheckCircleIcon className="w-4 h-4" />,
        onClick: () => bulkChangeStageListMutation.mutate({ ids: selectedIdArray, stage: ProductionStage.POSTED }),
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
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by content ID, hook, team..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
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
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Ref
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                  Hook
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

                if (activeTab === 'shooting') {
                  fileStatus = getFileStatus(project.id, 'raw-footage', project.deadline);
                } else if (activeTab === 'editing') {
                  fileStatus = getFileStatus(project.id, 'edited-video', project.deadline);
                } else if (activeTab === 'ready') {
                  fileStatus = getFileStatus(project.id, 'final-video', project.deadline);
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
                        {project.hook || 'No hook'}
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
                      {fileStatus ? (
                        <div className="flex items-center justify-center gap-1">
                          <fileStatus.icon className={`w-4 h-4 ${fileStatus.color}`} />
                          {fileStatus.file && (
                            <div className="flex gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleViewFile(fileStatus.file!.file_url); }}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="View"
                              >
                                <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadFile(fileStatus.file!.file_url, fileStatus.file!.file_name); }}
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Download"
                              >
                                <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-600" />
                              </button>
                            </div>
                          )}
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
