import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ChartBarIcon, MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon, MinusCircleIcon, ArrowDownTrayIcon, EyeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ProductionStage } from '@/types';
import type { ViralAnalysis } from '@/types';
import ProductionDetailDrawer from '@/components/admin/ProductionDetailDrawer';

type TabType = 'unassigned' | 'shooting' | 'editing' | 'ready' | 'posted';

interface ProductionFile {
  id: string;
  file_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

export default function ProductionStatusPage() {
  const [activeTab, setActiveTab] = useState<TabType>('unassigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<ViralAnalysis | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Fetch all approved analyses
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['admin', 'production-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('viral_analyses')
        .select(`
          *,
          profiles:user_id (email, full_name, avatar_url),
          assignments:project_assignments (
            *,
            user:profiles!project_assignments_user_id_fkey (id, email, full_name, avatar_url, role)
          )
        `)
        .eq('status', 'APPROVED')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        email: item.profiles?.email,
        full_name: item.profiles?.full_name,
        avatar_url: item.profiles?.avatar_url,
        videographer: item.assignments?.find((a: any) => a.role === 'VIDEOGRAPHER')?.user,
        editor: item.assignments?.find((a: any) => a.role === 'EDITOR')?.user,
        posting_manager: item.assignments?.find((a: any) => a.role === 'POSTING_MANAGER')?.user,
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

      // Group files by analysis_id
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

  // Group by tabs
  const unassigned = filteredAnalyses.filter(a => !a.videographer && !a.editor && !a.posting_manager);
  const shooting = filteredAnalyses.filter(a =>
    a.production_stage === ProductionStage.PRE_PRODUCTION ||
    a.production_stage === ProductionStage.SHOOTING ||
    a.production_stage === ProductionStage.SHOOT_REVIEW
  );
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
    { id: 'shooting' as TabType, label: 'Shooting', count: shooting.length, color: 'indigo' },
    { id: 'editing' as TabType, label: 'Editing', count: editing.length, color: 'purple' },
    { id: 'ready' as TabType, label: 'Ready to Post', count: ready.length, color: 'green' },
    { id: 'posted' as TabType, label: 'Posted', count: posted.length, color: 'emerald' },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'unassigned': return unassigned;
      case 'shooting': return shooting;
      case 'editing': return editing;
      case 'ready': return ready;
      case 'posted': return posted;
      default: return [];
    }
  };

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

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-primary-600" />
              Production Status
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAnalyses.length} project{filteredAnalyses.length !== 1 ? 's' : ''} in pipeline
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by content ID, hook, team..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8">
        <div className="flex overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-shrink-0 px-4 md:px-6 py-3 md:py-4 text-sm font-medium border-b-2 transition whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? `bg-${tab.color}-100 text-${tab.color}-800` : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : getCurrentData().length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No projects in this stage</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Content ID
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                      Hook/Title
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Stage
                    </th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Team
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Files
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Priority
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Deadline
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Days
                    </th>
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentData().map((project) => {
                    const daysInStage = getDaysInStage(project.updated_at);
                    let fileStatus;

                    if (activeTab === 'shooting') {
                      fileStatus = getFileStatus(project.id, 'raw-footage', project.deadline);
                    } else if (activeTab === 'editing') {
                      fileStatus = getFileStatus(project.id, 'edited-video', project.deadline);
                    } else if (activeTab === 'ready') {
                      fileStatus = getFileStatus(project.id, 'final-video', project.deadline);
                    }

                    return (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                          {project.content_id || '-'}
                        </td>
                        <td className="px-3 md:px-6 py-4 text-sm text-gray-900">
                          <div className="line-clamp-2 max-w-xs">
                            {project.hook || 'No hook provided'}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(project.production_stage)}`}>
                            {project.production_stage?.replace(/_/g, ' ') || 'NOT STARTED'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                          <div className="space-y-1">
                            {project.videographer && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">V:</span>
                                <span>{project.videographer.full_name || project.videographer.email}</span>
                              </div>
                            )}
                            {project.editor && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">E:</span>
                                <span>{project.editor.full_name || project.editor.email}</span>
                              </div>
                            )}
                            {project.posting_manager && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">PM:</span>
                                <span>{project.posting_manager.full_name || project.posting_manager.email}</span>
                              </div>
                            )}
                            {!project.videographer && !project.editor && !project.posting_manager && (
                              <span className="text-red-600 font-medium">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          {fileStatus ? (
                            <div className="flex items-center justify-center gap-2">
                              <fileStatus.icon className={`w-5 h-5 ${fileStatus.color}`} />
                              {fileStatus.file && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleViewFile(fileStatus.file!.file_url)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="View file"
                                  >
                                    <EyeIcon className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadFile(fileStatus.file!.file_url, fileStatus.file!.file_name)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Download file"
                                  >
                                    <ArrowDownTrayIcon className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                            {project.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center">
                          {project.deadline ? (
                            <div className={`${new Date(project.deadline) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              {new Date(project.deadline).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`${daysInStage > 7 ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                            {daysInStage}d
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedAnalysis(project);
                              setShowDetailDrawer(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="View details"
                          >
                            View <ChevronRightIcon className="w-4 h-4 ml-1" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Production Detail Drawer */}
      <ProductionDetailDrawer
        analysis={selectedAnalysis}
        isOpen={showDetailDrawer}
        onClose={() => {
          setShowDetailDrawer(false);
          setSelectedAnalysis(null);
        }}
      />
    </div>
  );
}
