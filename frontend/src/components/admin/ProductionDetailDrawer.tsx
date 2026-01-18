import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { assignmentService } from '@/services/assignmentService';
import type { ViralAnalysis, AssignTeamData } from '@/types';
import {
  XMarkIcon,
  VideoCameraIcon,
  FilmIcon,
  MegaphoneIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';

interface ProductionDetailDrawerProps {
  analysis: ViralAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductionDetailDrawer({
  analysis,
  isOpen,
  onClose,
}: ProductionDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [formData, setFormData] = useState<AssignTeamData>({
    videographerId: undefined,
    editorId: undefined,
    postingManagerId: undefined,
    autoAssignVideographer: false,
    autoAssignEditor: false,
    autoAssignPostingManager: false,
  });

  // Update form data when analysis changes
  useEffect(() => {
    if (analysis) {
      setFormData({
        videographerId: analysis.videographer?.id,
        editorId: analysis.editor?.id,
        postingManagerId: analysis.posting_manager?.id,
        autoAssignVideographer: false,
        autoAssignEditor: false,
        autoAssignPostingManager: false,
      });
    }
  }, [analysis]);

  // Fetch users by role
  const { data: videographers = [] } = useQuery({
    queryKey: ['users', 'VIDEOGRAPHER'],
    queryFn: () => assignmentService.getUsersByRole('VIDEOGRAPHER'),
    enabled: isOpen && showAssignTeam,
  });

  const { data: editors = [] } = useQuery({
    queryKey: ['users', 'EDITOR'],
    queryFn: () => assignmentService.getUsersByRole('EDITOR'),
    enabled: isOpen && showAssignTeam,
  });

  const { data: postingManagers = [] } = useQuery({
    queryKey: ['users', 'POSTING_MANAGER'],
    queryFn: () => assignmentService.getUsersByRole('POSTING_MANAGER'),
    enabled: isOpen && showAssignTeam,
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: (data: AssignTeamData) =>
      assignmentService.assignTeam(analysis!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-status'] });
      toast.success('Team assigned successfully!');
      setShowAssignTeam(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign team');
    },
  });

  const handleAssignTeam = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one team member is assigned
    if (
      !formData.videographerId &&
      !formData.editorId &&
      !formData.postingManagerId &&
      !formData.autoAssignVideographer &&
      !formData.autoAssignEditor &&
      !formData.autoAssignPostingManager
    ) {
      toast.error('Please assign at least one team member');
      return;
    }

    assignMutation.mutate(formData);
  };

  if (!analysis) return null;

  const hasTeam = analysis.videographer || analysis.editor || analysis.posting_manager;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full md:max-w-3xl bg-white shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Production Details</h2>
                <p className="text-primary-100 text-sm mt-1">
                  {analysis.content_id || 'No content ID'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Script Details */}
              <section className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-primary-600" />
                  Script Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hook</label>
                    <p className="text-gray-900 mt-1">{analysis.hook || 'No hook provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Target Emotion</label>
                      <p className="text-gray-900 mt-1">{analysis.target_emotion || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Outcome</label>
                      <p className="text-gray-900 mt-1">{analysis.expected_outcome || 'Not specified'}</p>
                    </div>
                  </div>
                  {analysis.overall_score && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Overall Score</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-2xl font-bold text-primary-600">
                          {analysis.overall_score.toFixed(1)}
                        </div>
                        <span className="text-gray-500">/ 10</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Production Status */}
              <section className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FlagIcon className="w-5 h-5 mr-2 text-orange-600" />
                  Production Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Stage</label>
                    <p className="text-gray-900 mt-1 font-medium">
                      {analysis.production_stage?.replace(/_/g, ' ') || 'NOT STARTED'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className="text-gray-900 mt-1 font-medium">
                      {analysis.priority || 'NORMAL'}
                    </p>
                  </div>
                  {analysis.deadline && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        Deadline
                      </label>
                      <p className="text-gray-900 mt-1">
                        {new Date(analysis.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Days in Stage
                    </label>
                    <p className="text-gray-900 mt-1 font-medium">
                      {Math.floor((Date.now() - new Date(analysis.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              </section>

              {/* Team Assignment */}
              <section className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <UserGroupIcon className="w-5 h-5 mr-2 text-indigo-600" />
                    Team Assignment
                  </h3>
                  {!showAssignTeam && (
                    <button
                      onClick={() => setShowAssignTeam(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                    >
                      {hasTeam ? 'Edit Team' : 'Assign Team'}
                    </button>
                  )}
                </div>

                {!showAssignTeam ? (
                  <div className="space-y-3">
                    {/* Videographer */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <VideoCameraIcon className="w-5 h-5 text-indigo-600" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Videographer</p>
                        <p className="text-sm text-gray-900">
                          {analysis.videographer?.full_name || analysis.videographer?.email || (
                            <span className="text-red-600 font-medium">Unassigned</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Editor */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FilmIcon className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Editor</p>
                        <p className="text-sm text-gray-900">
                          {analysis.editor?.full_name || analysis.editor?.email || (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Posting Manager */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MegaphoneIcon className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-medium">Posting Manager</p>
                        <p className="text-sm text-gray-900">
                          {analysis.posting_manager?.full_name || analysis.posting_manager?.email || (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAssignTeam} className="space-y-4">
                    {/* Videographer Assignment */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <VideoCameraIcon className="w-5 h-5 text-indigo-600" />
                        Videographer
                      </label>
                      <select
                        value={formData.videographerId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            videographerId: e.target.value || undefined,
                            autoAssignVideographer: false,
                          })
                        }
                        disabled={formData.autoAssignVideographer}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                      >
                        <option value="">Select videographer</option>
                        {videographers.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.full_name || v.email}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={formData.autoAssignVideographer}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              autoAssignVideographer: e.target.checked,
                              videographerId: e.target.checked ? undefined : formData.videographerId,
                            })
                          }
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Auto-assign (lowest workload)
                      </label>
                    </div>

                    {/* Editor Assignment */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <FilmIcon className="w-5 h-5 text-purple-600" />
                        Editor (Optional)
                      </label>
                      <select
                        value={formData.editorId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            editorId: e.target.value || undefined,
                            autoAssignEditor: false,
                          })
                        }
                        disabled={formData.autoAssignEditor}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                      >
                        <option value="">Select editor</option>
                        {editors.map((e: any) => (
                          <option key={e.id} value={e.id}>
                            {e.full_name || e.email}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={formData.autoAssignEditor}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              autoAssignEditor: e.target.checked,
                              editorId: e.target.checked ? undefined : formData.editorId,
                            })
                          }
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Auto-assign (lowest workload)
                      </label>
                    </div>

                    {/* Posting Manager Assignment */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <MegaphoneIcon className="w-5 h-5 text-green-600" />
                        Posting Manager (Optional)
                      </label>
                      <select
                        value={formData.postingManagerId || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            postingManagerId: e.target.value || undefined,
                            autoAssignPostingManager: false,
                          })
                        }
                        disabled={formData.autoAssignPostingManager}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                      >
                        <option value="">Select posting manager</option>
                        {postingManagers.map((pm: any) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.full_name || pm.email}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={formData.autoAssignPostingManager}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              autoAssignPostingManager: e.target.checked,
                              postingManagerId: e.target.checked ? undefined : formData.postingManagerId,
                            })
                          }
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Auto-assign (lowest workload)
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAssignTeam(false)}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={assignMutation.isPending}
                        className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {assignMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Assigning...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-5 h-5" />
                            Assign Team
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Reference URL */}
              {analysis.reference_url && (
                <section className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference Content</h3>
                  <a
                    href={analysis.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline break-all"
                  >
                    {analysis.reference_url}
                  </a>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
