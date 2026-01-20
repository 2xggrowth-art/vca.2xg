import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { adminService } from '@/services/adminService';
import { productionFilesService } from '@/services/productionFilesService';
import { assignmentService } from '@/services/assignmentService';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { ViralAnalysis, ReviewAnalysisData, UpdateProductionStageData } from '@/types';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  FilmIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import AssignTeamModal from '@/components/AssignTeamModal';
import RejectScriptModal from '@/components/admin/RejectScriptModal';
import BulkRejectModal from '@/components/admin/BulkRejectModal';
import { SplitViewLayout } from '@/components/admin/layout/SplitViewLayout';
import { BulkActionToolbar, type BulkAction } from '@/components/admin/layout/BulkActionToolbar';
import ApprovalDetailPanel from '@/components/admin/ApprovalDetailPanel';
import { useSelection } from '@/hooks/useSelection';

type TabType = 'scripts' | 'shoots' | 'edits' | 'approved';

export default function NeedApprovalPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('scripts');
  const [selectedScript, setSelectedScript] = useState<ViralAnalysis | null>(null);
  const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [pendingScriptSearch, setPendingScriptSearch] = useState('');
  const [approvedScriptSearch, setApprovedScriptSearch] = useState('');

  // Selection hooks for each section
  const scriptsSelection = useSelection<ViralAnalysis>();
  const shootsSelection = useSelection<ViralAnalysis>();
  const editsSelection = useSelection<ViralAnalysis>();
  const approvedSelection = useSelection<ViralAnalysis>();

  // Active item state (for detail panel)
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [activeShootId, setActiveShootId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [activeApprovedId, setActiveApprovedId] = useState<string | null>(null);

  // Fetch pending scripts
  const { data: pendingScripts = [], isLoading: scriptsLoading } = useQuery({
    queryKey: ['admin', 'pending-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(
          `
          *,
          profiles:user_id (email, full_name, avatar_url)
        `
        )
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
      }));
    },
  });

  // Fetch shoots awaiting review
  const { data: shootReviews = [], isLoading: shootsLoading } = useQuery({
    queryKey: ['admin', 'shoot-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(
          `
          *,
          profiles:user_id (email, full_name, avatar_url),
          assignments:project_assignments (
            *,
            user:profiles!project_assignments_user_id_fkey (id, email, full_name, avatar_url, role)
          )
        `
        )
        .eq('production_stage', 'SHOOT_REVIEW')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        videographer: item.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
      }));
    },
  });

  // Fetch edits awaiting review
  const { data: editReviews = [], isLoading: editsLoading } = useQuery({
    queryKey: ['admin', 'edit-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(
          `
          *,
          profiles:user_id (email, full_name, avatar_url),
          assignments:project_assignments (
            *,
            user:profiles!project_assignments_user_id_fkey (id, email, full_name, avatar_url, role)
          )
        `
        )
        .eq('production_stage', 'EDIT_REVIEW')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        editor: item.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
      }));
    },
  });

  // Fetch files for selected shoot
  const { data: shootFiles = [] } = useQuery({
    queryKey: ['production-files', activeShootId],
    queryFn: () => productionFilesService.getFiles(activeShootId!),
    enabled: !!activeShootId,
  });

  // Fetch all approved scripts (for viewing/disapproving)
  const { data: approvedScripts = [], isLoading: approvedLoading } = useQuery({
    queryKey: ['admin', 'approved-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(
          `
          *,
          profiles:user_id (email, full_name, avatar_url),
          assignments:project_assignments (
            *,
            videographer:profiles!project_assignments_videographer_id_fkey (id, email, full_name, avatar_url),
            editor:profiles!project_assignments_editor_id_fkey (id, email, full_name, avatar_url),
            posting_manager:profiles!project_assignments_posting_manager_id_fkey (id, email, full_name, avatar_url)
          )
        `
        )
        .eq('status', 'APPROVED')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
      }));
    },
  });

  // Approve script mutation
  const approveScriptMutation = useMutation({
    mutationFn: (data: ReviewAnalysisData & { scriptId: string }) =>
      adminService.reviewAnalysis(data.scriptId, data),
    onSuccess: (updatedAnalysis) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success('Script approved! Assign team members now.');
      setActiveScriptId(null);
      // Open team assignment modal
      setSelectedScript(updatedAnalysis);
      setShowAssignTeamModal(true);
    },
    onError: () => {
      toast.error('Failed to approve script');
    },
  });

  // Reject script mutation
  const rejectScriptMutation = useMutation({
    mutationFn: (data: ReviewAnalysisData & { scriptId: string }) =>
      adminService.reviewAnalysis(data.scriptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success('Script rejected');
      setActiveScriptId(null);
      setSelectedScript(null);
    },
    onError: () => {
      toast.error('Failed to reject script');
    },
  });

  // Approve shoot mutation
  const approveShootMutation = useMutation({
    mutationFn: (data: UpdateProductionStageData & { shootId: string }) =>
      assignmentService.updateProductionStage(data.shootId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shoot-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });

      if (variables.production_stage === 'EDITING') {
        toast.success('Shoot approved! Moving to editing stage.');
      } else if (variables.production_stage === 'SHOOTING') {
        toast.success('Reshoot requested. Videographer has been notified.');
      }

      setActiveShootId(null);
    },
    onError: () => {
      toast.error('Failed to update shoot status');
    },
  });

  // Approve edit mutation
  const approveEditMutation = useMutation({
    mutationFn: (data: UpdateProductionStageData & { editId: string }) =>
      assignmentService.updateProductionStage(data.editId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'edit-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });

      if (variables.production_stage === 'FINAL_REVIEW') {
        toast.success('Edit approved! Moving to final review.');
      } else if (variables.production_stage === 'EDITING') {
        toast.success('Revision requested. Editor has been notified.');
      }

      setActiveEditId(null);
    },
    onError: () => {
      toast.error('Failed to update edit status');
    },
  });

  // Disapprove approved script mutation
  const disapproveScriptMutation = useMutation({
    mutationFn: async ({ scriptId, reason }: { scriptId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .update({
          status: 'PENDING',
          production_stage: null,
          feedback: reason,
          disapproval_count: supabase.rpc('increment_disapproval_count'),
        })
        .eq('id', scriptId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approved-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success('Script disapproved and sent back for revision.');
      setActiveApprovedId(null);
    },
    onError: () => {
      toast.error('Failed to disapprove script');
    },
  });

  // Bulk approve scripts mutation
  const bulkApproveScriptsMutation = useMutation({
    mutationFn: async (scriptIds: string[]) => {
      const promises = scriptIds.map((id) =>
        adminService.reviewAnalysis(id, {
          status: 'APPROVED',
          hookStrength: 7,
          contentQuality: 7,
          viralPotential: 7,
          replicationClarity: 7,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success(`${scriptsSelection.selectedCount} scripts approved!`);
      scriptsSelection.deselectAll();
    },
    onError: () => {
      toast.error('Failed to approve scripts');
    },
  });

  // Bulk reject scripts mutation
  const bulkRejectScriptsMutation = useMutation({
    mutationFn: async ({ scriptIds, feedback }: { scriptIds: string[]; feedback: string }) => {
      const promises = scriptIds.map((id) =>
        adminService.reviewAnalysis(id, {
          status: 'REJECTED',
          feedback,
          hookStrength: 5,
          contentQuality: 5,
          viralPotential: 5,
          replicationClarity: 5,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success(`${scriptsSelection.selectedCount} scripts rejected!`);
      scriptsSelection.deselectAll();
      setShowBulkRejectModal(false);
    },
    onError: () => {
      toast.error('Failed to reject scripts');
    },
  });

  // Bulk approve shoots mutation
  const bulkApproveShootsMutation = useMutation({
    mutationFn: async (shootIds: string[]) => {
      const promises = shootIds.map((id) =>
        assignmentService.updateProductionStage(id, { production_stage: 'EDITING' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shoot-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success(`${shootsSelection.selectedCount} shoots approved!`);
      shootsSelection.deselectAll();
    },
    onError: () => {
      toast.error('Failed to approve shoots');
    },
  });

  // Bulk approve edits mutation
  const bulkApproveEditsMutation = useMutation({
    mutationFn: async (editIds: string[]) => {
      const promises = editIds.map((id) =>
        assignmentService.updateProductionStage(id, { production_stage: 'FINAL_REVIEW' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'edit-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success(`${editsSelection.selectedCount} edits approved!`);
      editsSelection.deselectAll();
    },
    onError: () => {
      toast.error('Failed to approve edits');
    },
  });

  // Filter pending scripts by search
  const filteredPendingScripts = useMemo(() => {
    if (!pendingScriptSearch.trim()) return pendingScripts;
    const search = pendingScriptSearch.toLowerCase();
    return pendingScripts.filter(
      (script: ViralAnalysis) =>
        script.content_id?.toLowerCase().includes(search) ||
        script.hook?.toLowerCase().includes(search) ||
        script.full_name?.toLowerCase().includes(search) ||
        script.email?.toLowerCase().includes(search)
    );
  }, [pendingScripts, pendingScriptSearch]);

  // Filter approved scripts by search
  const filteredApprovedScripts = useMemo(() => {
    if (!approvedScriptSearch.trim()) return approvedScripts;
    const search = approvedScriptSearch.toLowerCase();
    return approvedScripts.filter(
      (script: ViralAnalysis) =>
        script.content_id?.toLowerCase().includes(search) ||
        script.hook?.toLowerCase().includes(search) ||
        script.full_name?.toLowerCase().includes(search) ||
        script.email?.toLowerCase().includes(search)
    );
  }, [approvedScripts, approvedScriptSearch]);

  const totalPending = filteredPendingScripts.length + shootReviews.length + editReviews.length;

  // Get active item based on current tab
  const getActiveItem = (): ViralAnalysis | null => {
    switch (activeTab) {
      case 'scripts':
        return filteredPendingScripts.find((s: ViralAnalysis) => s.id === activeScriptId) || null;
      case 'shoots':
        return shootReviews.find((s: ViralAnalysis) => s.id === activeShootId) || null;
      case 'edits':
        return editReviews.find((s: ViralAnalysis) => s.id === activeEditId) || null;
      case 'approved':
        return filteredApprovedScripts.find((s: ViralAnalysis) => s.id === activeApprovedId) || null;
      default:
        return null;
    }
  };

  const activeItem = getActiveItem();

  // Get detail type for the panel
  const getDetailType = (): 'pending' | 'approved' | 'shoot' | 'edit' => {
    switch (activeTab) {
      case 'scripts':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'shoots':
        return 'shoot';
      case 'edits':
        return 'edit';
      default:
        return 'pending';
    }
  };

  // Get current selection based on tab
  const getCurrentSelection = () => {
    switch (activeTab) {
      case 'scripts':
        return scriptsSelection;
      case 'shoots':
        return shootsSelection;
      case 'edits':
        return editsSelection;
      case 'approved':
        return approvedSelection;
      default:
        return scriptsSelection;
    }
  };

  const currentSelection = getCurrentSelection();

  // Get current items based on tab
  const getCurrentItems = (): ViralAnalysis[] => {
    switch (activeTab) {
      case 'scripts':
        return filteredPendingScripts;
      case 'shoots':
        return shootReviews;
      case 'edits':
        return editReviews;
      case 'approved':
        return filteredApprovedScripts;
      default:
        return [];
    }
  };

  // Build bulk actions based on active tab
  const buildBulkActions = (): BulkAction[] => {
    switch (activeTab) {
      case 'scripts':
        return [
          {
            id: 'bulk-approve',
            label: 'Approve All',
            icon: <CheckCircleIcon className="w-4 h-4" />,
            variant: 'success',
            onClick: () => {
              const ids = Array.from(scriptsSelection.selectedIds);
              bulkApproveScriptsMutation.mutate(ids);
            },
            disabled: bulkApproveScriptsMutation.isPending,
          },
          {
            id: 'bulk-reject',
            label: 'Reject All',
            icon: <XCircleIcon className="w-4 h-4" />,
            variant: 'danger',
            onClick: () => {
              setShowBulkRejectModal(true);
            },
            disabled: bulkRejectScriptsMutation.isPending,
          },
        ];
      case 'shoots':
        return [
          {
            id: 'bulk-approve-shoots',
            label: 'Approve All',
            icon: <CheckCircleIcon className="w-4 h-4" />,
            variant: 'success',
            onClick: () => {
              const ids = Array.from(shootsSelection.selectedIds);
              bulkApproveShootsMutation.mutate(ids);
            },
            disabled: bulkApproveShootsMutation.isPending,
          },
        ];
      case 'edits':
        return [
          {
            id: 'bulk-approve-edits',
            label: 'Approve All',
            icon: <CheckCircleIcon className="w-4 h-4" />,
            variant: 'success',
            onClick: () => {
              const ids = Array.from(editsSelection.selectedIds);
              bulkApproveEditsMutation.mutate(ids);
            },
            disabled: bulkApproveEditsMutation.isPending,
          },
        ];
      default:
        return [];
    }
  };

  // Handle item click
  const handleItemClick = (item: ViralAnalysis) => {
    switch (activeTab) {
      case 'scripts':
        setActiveScriptId(item.id);
        break;
      case 'shoots':
        setActiveShootId(item.id);
        break;
      case 'edits':
        setActiveEditId(item.id);
        break;
      case 'approved':
        setActiveApprovedId(item.id);
        break;
    }
  };

  // Handle close detail
  const handleCloseDetail = () => {
    switch (activeTab) {
      case 'scripts':
        setActiveScriptId(null);
        break;
      case 'shoots':
        setActiveShootId(null);
        break;
      case 'edits':
        setActiveEditId(null);
        break;
      case 'approved':
        setActiveApprovedId(null);
        break;
    }
  };

  // Check if has active item
  const hasActiveItem = (): boolean => {
    switch (activeTab) {
      case 'scripts':
        return !!activeScriptId;
      case 'shoots':
        return !!activeShootId;
      case 'edits':
        return !!activeEditId;
      case 'approved':
        return !!activeApprovedId;
      default:
        return false;
    }
  };

  // Render the master content (list)
  const renderMasterContent = () => {
    const currentItems = getCurrentItems();
    const isLoading =
      activeTab === 'scripts'
        ? scriptsLoading
        : activeTab === 'shoots'
          ? shootsLoading
          : activeTab === 'edits'
            ? editsLoading
            : approvedLoading;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-600" />
                Review
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {totalPending} item{totalPending !== 1 ? 's' : ''} waiting for your review
              </p>
            </div>
            {totalPending > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-xs font-medium text-red-800">Action Required</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'scripts'
                  ? 'bg-white text-yellow-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4 mr-1.5" />
              Scripts
              {filteredPendingScripts.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  {filteredPendingScripts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('shoots')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'shoots'
                  ? 'bg-white text-green-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <VideoCameraIcon className="w-4 h-4 mr-1.5" />
              Shoots
              {shootReviews.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                  {shootReviews.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('edits')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'edits'
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FilmIcon className="w-4 h-4 mr-1.5" />
              Edits
              {editReviews.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                  {editReviews.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition ${
                activeTab === 'approved'
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              Approved
            </button>
          </div>

          {/* Search bar for scripts and approved tabs */}
          {(activeTab === 'scripts' || activeTab === 'approved') && (
            <div className="mt-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={activeTab === 'scripts' ? pendingScriptSearch : approvedScriptSearch}
                onChange={(e) =>
                  activeTab === 'scripts'
                    ? setPendingScriptSearch(e.target.value)
                    : setApprovedScriptSearch(e.target.value)
                }
                placeholder="Search by content ID, hook, name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-500">
                {activeTab === 'scripts' && pendingScriptSearch
                  ? `No scripts found matching "${pendingScriptSearch}"`
                  : activeTab === 'approved' && approvedScriptSearch
                    ? `No approved scripts found matching "${approvedScriptSearch}"`
                    : activeTab === 'scripts'
                      ? 'No scripts pending approval'
                      : activeTab === 'shoots'
                        ? 'No shoots pending review'
                        : activeTab === 'edits'
                          ? 'No edits pending review'
                          : 'No approved scripts yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {currentItems.map((item: ViralAnalysis) => {
                const isSelected = currentSelection.isSelected(item.id);
                const isActive =
                  (activeTab === 'scripts' && activeScriptId === item.id) ||
                  (activeTab === 'shoots' && activeShootId === item.id) ||
                  (activeTab === 'edits' && activeEditId === item.id) ||
                  (activeTab === 'approved' && activeApprovedId === item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`px-4 py-3 cursor-pointer transition ${
                      isActive
                        ? 'bg-primary-50 border-l-4 border-l-primary-500'
                        : isSelected
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox (not for approved tab) */}
                      {activeTab !== 'approved' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            currentSelection.toggle(item.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {item.content_id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                              {item.content_id}
                            </span>
                          )}
                          {activeTab === 'scripts' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              PENDING
                            </span>
                          )}
                          {activeTab === 'shoots' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              SHOOT DONE
                            </span>
                          )}
                          {activeTab === 'edits' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              EDIT DONE
                            </span>
                          )}
                          {activeTab === 'approved' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              APPROVED
                            </span>
                          )}
                          {item.rejection_count !== undefined && item.rejection_count > 0 && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.rejection_count >= 4
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              Rejected {item.rejection_count}x
                            </span>
                          )}
                        </div>

                        {/* Hook */}
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {item.hook || 'No hook provided'}
                        </h3>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>
                            By:{' '}
                            {activeTab === 'shoots'
                              ? item.videographer?.full_name ||
                                item.videographer?.email ||
                                'Unknown'
                              : activeTab === 'edits'
                                ? item.editor?.full_name || item.editor?.email || 'Unknown'
                                : item.full_name || item.email || 'Unknown'}
                          </span>
                          <span>
                            {new Date(
                              activeTab === 'scripts' ? item.created_at : item.updated_at
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Quick actions (inline) */}
                        {activeTab !== 'approved' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab === 'scripts') {
                                  setSelectedScript(item);
                                  approveScriptMutation.mutate({
                                    scriptId: item.id,
                                    status: 'APPROVED',
                                    hookStrength: 7,
                                    contentQuality: 7,
                                    viralPotential: 7,
                                    replicationClarity: 7,
                                  });
                                } else if (activeTab === 'shoots') {
                                  approveShootMutation.mutate({
                                    shootId: item.id,
                                    production_stage: 'EDITING',
                                  });
                                } else if (activeTab === 'edits') {
                                  approveEditMutation.mutate({
                                    editId: item.id,
                                    production_stage: 'FINAL_REVIEW',
                                  });
                                }
                              }}
                              disabled={
                                approveScriptMutation.isPending ||
                                approveShootMutation.isPending ||
                                approveEditMutation.isPending
                              }
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab === 'scripts') {
                                  setSelectedScript(item);
                                  setShowRejectModal(true);
                                } else if (activeTab === 'shoots') {
                                  approveShootMutation.mutate({
                                    shootId: item.id,
                                    production_stage: 'SHOOTING',
                                    production_notes: 'Reshoot required',
                                  });
                                } else if (activeTab === 'edits') {
                                  approveEditMutation.mutate({
                                    editId: item.id,
                                    production_stage: 'EDITING',
                                    production_notes: 'Revision needed',
                                  });
                                }
                              }}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition"
                            >
                              <XCircleIcon className="w-3.5 h-3.5 mr-1" />
                              {activeTab === 'scripts'
                                ? 'Reject'
                                : activeTab === 'shoots'
                                  ? 'Reshoot'
                                  : 'Fix'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render detail content
  const renderDetailContent = () => {
    const detailType = getDetailType();

    return (
      <ApprovalDetailPanel
        analysis={activeItem}
        detailType={detailType}
        onClose={handleCloseDetail}
        shootFiles={activeTab === 'shoots' ? shootFiles : undefined}
        isSubmitting={
          approveScriptMutation.isPending ||
          rejectScriptMutation.isPending ||
          approveShootMutation.isPending ||
          approveEditMutation.isPending ||
          disapproveScriptMutation.isPending
        }
        // Script actions
        onApprove={
          detailType === 'pending' && activeItem
            ? (data) => {
                approveScriptMutation.mutate({
                  ...data,
                  scriptId: activeItem.id,
                });
              }
            : undefined
        }
        onReject={
          detailType === 'pending' && activeItem
            ? (data) => {
                rejectScriptMutation.mutate({
                  ...data,
                  scriptId: activeItem.id,
                });
              }
            : undefined
        }
        // Approved script actions
        onDisapprove={
          detailType === 'approved' && activeItem
            ? (reason) => {
                disapproveScriptMutation.mutate({
                  scriptId: activeItem.id,
                  reason,
                });
              }
            : undefined
        }
        // Shoot actions
        onApproveShoot={
          detailType === 'shoot' && activeItem
            ? () => {
                approveShootMutation.mutate({
                  shootId: activeItem.id,
                  production_stage: 'EDITING',
                });
              }
            : undefined
        }
        onRejectShoot={
          detailType === 'shoot' && activeItem
            ? () => {
                approveShootMutation.mutate({
                  shootId: activeItem.id,
                  production_stage: 'SHOOTING',
                  production_notes: 'Reshoot required',
                });
              }
            : undefined
        }
        // Edit actions
        onApproveEdit={
          detailType === 'edit' && activeItem
            ? () => {
                approveEditMutation.mutate({
                  editId: activeItem.id,
                  production_stage: 'FINAL_REVIEW',
                });
              }
            : undefined
        }
        onRejectEdit={
          detailType === 'edit' && activeItem
            ? () => {
                approveEditMutation.mutate({
                  editId: activeItem.id,
                  production_stage: 'EDITING',
                  production_notes: 'Revision needed',
                });
              }
            : undefined
        }
      />
    );
  };

  // Build bulk toolbar if items selected
  const bulkToolbar =
    currentSelection.selectedCount > 0 && activeTab !== 'approved' ? (
      <BulkActionToolbar
        selectedCount={currentSelection.selectedCount}
        totalCount={getCurrentItems().length}
        onSelectAll={() => currentSelection.selectAll(getCurrentItems())}
        onDeselectAll={currentSelection.deselectAll}
        actions={buildBulkActions()}
        allSelected={currentSelection.selectedCount === getCurrentItems().length}
      />
    ) : null;

  return (
    <div className="h-full">
      <SplitViewLayout
        masterContent={renderMasterContent()}
        detailContent={renderDetailContent()}
        hasActiveItem={hasActiveItem()}
        onCloseDetail={handleCloseDetail}
        bulkActionToolbar={bulkToolbar}
      />

      {/* Reject Script Modal */}
      {selectedScript && (
        <RejectScriptModal
          script={selectedScript}
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedScript(null);
          }}
          onReject={(data) => {
            rejectScriptMutation.mutate({
              ...data,
              scriptId: selectedScript.id,
            });
            setShowRejectModal(false);
          }}
          isLoading={rejectScriptMutation.isPending}
        />
      )}

      {/* Bulk Reject Modal */}
      <BulkRejectModal
        isOpen={showBulkRejectModal}
        selectedCount={scriptsSelection.selectedCount}
        onClose={() => setShowBulkRejectModal(false)}
        onReject={(feedback) => {
          const ids = Array.from(scriptsSelection.selectedIds);
          bulkRejectScriptsMutation.mutate({ scriptIds: ids, feedback });
        }}
        isLoading={bulkRejectScriptsMutation.isPending}
      />

      {/* Assign Team Modal */}
      {showAssignTeamModal && selectedScript && (
        <AssignTeamModal
          analysis={selectedScript}
          isOpen={showAssignTeamModal}
          onClose={() => {
            setShowAssignTeamModal(false);
            setSelectedScript(null);
          }}
        />
      )}
    </div>
  );
}
