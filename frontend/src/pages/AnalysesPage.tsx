import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { analysesService } from '@/services/analysesService';
import { adminService } from '@/services/adminService';
import { profileService } from '@/services/profileService';
import { contentConfigService } from '@/services/contentConfigService';
import {
  PlusIcon,
  PencilIcon,
  LinkIcon,
  EyeIcon,
  StarIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import VoiceRecorder from '@/components/VoiceRecorder';
import ReviewScoreInput from '@/components/ReviewScoreInput';
import { MultiStepAnalysisWizard } from '@/components/wizard';
import BottomNavigation from '@/components/BottomNavigation';
import type { ViralAnalysis, AnalysisFormData, ReviewAnalysisData } from '@/types';
import { UserRole } from '@/types';

type TabType = 'pending' | 'approved' | 'rejected';

// Helper function to create default form data
const createDefaultFormData = (): AnalysisFormData => ({
  // Existing fields
  referenceUrl: '',
  title: '',
  hook: '',
  hookVoiceNote: null,
  hookVoiceNoteUrl: '',
  whyViral: '',
  whyViralVoiceNote: null,
  whyViralVoiceNoteUrl: '',
  howToReplicate: '',
  howToReplicateVoiceNote: null,
  howToReplicateVoiceNoteUrl: '',
  targetEmotion: '',
  expectedOutcome: '',

  // Level 1 new fields
  platform: '',
  contentType: '',
  shootType: '',
  charactersInvolved: '',
  creatorName: '',
  unusualElement: '',
  hookTypes: [],
  worksWithoutAudio: '',
  contentRating: 5,
  replicationStrength: 5,

  // Level 2 - Emotional & Physical Reactions
  bodyReactions: [],
  emotionFirst6Sec: '',
  challengedBelief: '',
  emotionalIdentityImpact: [],
  ifHeCanWhyCantYou: '',
  feelLikeCommenting: '',
  readComments: '',
  sharingNumber: 0,
  videoAction: '',

  // Level 2 - Production Details
  industryId: '',
  profileId: '',
  hookTagIds: [],
  totalPeopleInvolved: 1,
  characterTagIds: [],
  shootPossibility: 50,

  // Level 3 - Hook Study
  stopFeel: '',
  stopFeelExplanation: '',
  stopFeelAudio: null,
  stopFeelAudioUrl: '',
  immediateUnderstanding: '',
  immediateUnderstandingAudio: null,
  immediateUnderstandingAudioUrl: '',
  hookCarrier: '',
  hookCarrierAudio: null,
  hookCarrierAudioUrl: '',
  hookWithoutAudio: '',
  hookWithoutAudioRecording: null,
  hookWithoutAudioRecordingUrl: '',
  audioAloneStopsScroll: '',
  audioAloneStopsScrollRecording: null,
  audioAloneStopsScrollRecordingUrl: '',
  dominantEmotionFirst6: '',
  dominantEmotionFirst6Audio: null,
  dominantEmotionFirst6AudioUrl: '',
  understandingBySecond6: '',
  understandingBySecond6Audio: null,
  understandingBySecond6AudioUrl: '',
  contentRatingLevel3: 5,

  // Level 3 - Production Planning
  onScreenTextHook: '',
  ourIdeaAudio: null,
  ourIdeaAudioUrl: '',
  shootLocation: '',
  planningDate: '',
  additionalRequirements: '',
});

export default function AnalysesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<ViralAnalysis | null>(null);
  const [editingAnalysis, setEditingAnalysis] = useState<ViralAnalysis | null>(null);
  const [formData, setFormData] = useState<AnalysisFormData>(createDefaultFormData());
  const [reviewData, setReviewData] = useState<ReviewAnalysisData>({
    status: 'APPROVED',
    feedback: '',
    hookStrength: 5,
    contentQuality: 5,
    viralPotential: 5,
    replicationClarity: 5,
  });

  // New state for table view
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Check if current user is admin
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getMyProfile,
  });

  const isAdmin = profile?.role === UserRole.SUPER_ADMIN;

  const { data: analyses, isLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: analysesService.getMyAnalyses,
  });

  const createMutation = useMutation({
    mutationFn: (data: AnalysisFormData) => analysesService.createAnalysis(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Analysis submitted successfully!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit analysis');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnalysisFormData }) =>
      analysesService.updateAnalysis(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.success('Analysis updated successfully!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update analysis');
    },
  });

  // Review analysis mutation (admin only)
  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewAnalysisData }) =>
      adminService.reviewAnalysis(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'analyses'] });
      toast.success('Analysis reviewed successfully');
      setIsReviewModalOpen(false);
      setIsViewModalOpen(false);
      setReviewData({
        status: 'APPROVED',
        feedback: '',
        hookStrength: 5,
        contentQuality: 5,
        viralPotential: 5,
        replicationClarity: 5,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to review analysis');
    },
  });

  const openModal = async (analysis?: ViralAnalysis) => {
    if (analysis) {
      setEditingAnalysis(analysis);

      // Fetch existing tags for this analysis
      let existingHookTagIds: string[] = [];
      let existingCharacterTagIds: string[] = [];

      if (analysis.id) {
        const hookTagsData = await contentConfigService.getAnalysisHookTags(analysis.id);
        const characterTagsData = await contentConfigService.getAnalysisCharacterTags(analysis.id);
        existingHookTagIds = hookTagsData.map(t => t.id);
        existingCharacterTagIds = characterTagsData.map(t => t.id);
      }

      setFormData({
        ...createDefaultFormData(),
        referenceUrl: analysis.reference_url || '',
        title: analysis.title || '',
        hook: analysis.hook || '',
        hookVoiceNoteUrl: analysis.hook_voice_note_url || '',
        whyViral: analysis.why_viral || '',
        whyViralVoiceNoteUrl: analysis.why_viral_voice_note_url || '',
        howToReplicate: analysis.how_to_replicate || '',
        howToReplicateVoiceNoteUrl: analysis.how_to_replicate_voice_note_url || '',
        targetEmotion: analysis.target_emotion || '',
        expectedOutcome: analysis.expected_outcome || '',
        // All new Level 1, 2, 3 fields from analysis
        platform: analysis.platform || '',
        contentType: analysis.content_type || '',
        shootType: analysis.shoot_type || '',
        charactersInvolved: analysis.characters_involved || '',
        creatorName: analysis.creator_name || '',
        unusualElement: analysis.unusual_element || '',
        worksWithoutAudio: analysis.works_without_audio || '',
        contentRating: analysis.content_rating || 5,
        replicationStrength: analysis.replication_strength || 5,
        // Level 2 production fields
        industryId: analysis.industry_id || '',
        profileId: analysis.profile_id || '',
        hookTagIds: existingHookTagIds,
        totalPeopleInvolved: analysis.total_people_involved || 1,
        characterTagIds: existingCharacterTagIds,
        shootPossibility: (analysis.shoot_possibility as 25 | 50 | 75 | 100) || 50,
        // Level 3 production planning
        onScreenTextHook: analysis.on_screen_text_hook || '',
        ourIdeaAudioUrl: analysis.our_idea_audio_url || '',
        shootLocation: analysis.shoot_location || '',
        planningDate: analysis.planning_date || '',
        additionalRequirements: analysis.additional_requirements || '',
      });
    } else {
      // Reset form for new entry
      setEditingAnalysis(null);
      setFormData(createDefaultFormData());
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAnalysis(null);
    setFormData(createDefaultFormData());
  };

  const openViewModal = (analysis: ViralAnalysis) => {
    setViewingAnalysis(analysis);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingAnalysis(null);
  };

  const openReviewModal = (analysis: ViralAnalysis) => {
    setViewingAnalysis(analysis);
    setIsReviewModalOpen(true);
    // Pre-fill with existing scores if already reviewed
    if (analysis.hook_strength) {
      setReviewData({
        status: analysis.status as 'APPROVED' | 'REJECTED',
        feedback: analysis.feedback || '',
        hookStrength: analysis.hook_strength,
        contentQuality: analysis.content_quality || 5,
        viralPotential: analysis.viral_potential || 5,
        replicationClarity: analysis.replication_clarity || 5,
      });
    }
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setViewingAnalysis(null);
    setReviewData({
      status: 'APPROVED',
      feedback: '',
      feedbackVoiceNote: null,
      hookStrength: 5,
      contentQuality: 5,
      viralPotential: 5,
      replicationClarity: 5,
    });
  };

  const handleSubmitReview = () => {
    if (!viewingAnalysis) return;

    if (reviewData.status === 'REJECTED' && !reviewData.feedback?.trim()) {
      toast.error('Feedback is required when rejecting an analysis');
      return;
    }

    reviewMutation.mutate({ id: viewingAnalysis.id, data: reviewData });
  };

  const handleSubmit = (data: AnalysisFormData, clearDraft: () => void) => {
    if (!data.title?.trim()) {
      toast.error('Please provide a title for the script');
      return;
    }
    if (editingAnalysis) {
      updateMutation.mutate({ id: editingAnalysis.id, data }, {
        onSuccess: () => clearDraft(),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => clearDraft(),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter and search analyses
  const filteredAnalyses = useMemo(() => {
    if (!analyses) return [];

    let filtered = analyses.filter((a: ViralAnalysis) => {
      const statusMatch = activeTab === 'pending'
        ? a.status === 'PENDING'
        : activeTab === 'approved'
        ? a.status === 'APPROVED'
        : a.status === 'REJECTED';
      return statusMatch;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a: ViralAnalysis) =>
        a.title?.toLowerCase().includes(query) ||
        a.hook?.toLowerCase().includes(query) ||
        a.id?.toLowerCase().includes(query) ||
        a.reference_url?.toLowerCase().includes(query) ||
        a.target_emotion?.toLowerCase().includes(query) ||
        a.platform?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [analyses, activeTab, searchQuery]);

  // Count by status
  const counts = useMemo(() => {
    if (!analyses) return { pending: 0, approved: 0, rejected: 0 };
    return {
      pending: analyses.filter((a: ViralAnalysis) => a.status === 'PENDING').length,
      approved: analyses.filter((a: ViralAnalysis) => a.status === 'APPROVED').length,
      rejected: analyses.filter((a: ViralAnalysis) => a.status === 'REJECTED').length,
    };
  }, [analyses]);

  // Tab config
  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'pending', label: 'Pending', icon: <ClockIcon className="w-4 h-4" />, count: counts.pending },
    { id: 'approved', label: 'Approved', icon: <CheckCircleIcon className="w-4 h-4" />, count: counts.approved },
    { id: 'rejected', label: 'Rejected', icon: <XCircleIcon className="w-4 h-4" />, count: counts.rejected },
  ];

  return (
    <div className="pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="w-7 h-7 text-primary-600" />
              My Scripts
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {analyses?.length || 0} total scripts
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="hidden md:inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Video
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 overflow-x-auto">
        <div className="flex min-w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none px-3 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="hidden md:inline">{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`px-1.5 md:px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-x border-gray-200 px-4 py-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, content ID, platform, emotion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Emotion
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAnalyses.map((analysis: ViralAnalysis) => (
                  <tr
                    key={analysis.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                    onClick={() => openViewModal(analysis)}
                  >
                    <td className="px-4 py-4 md:py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                            {analysis.title || analysis.hook || 'Untitled'}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[300px] mt-0.5">
                            ID: {analysis.id.slice(0, 8)}...
                          </p>
                          {/* Mobile-only info */}
                          <div className="md:hidden mt-1 flex items-center gap-2 text-xs text-gray-500">
                            {analysis.platform && (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded">{analysis.platform}</span>
                            )}
                            <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {/* Status badges for rejected tab */}
                        {activeTab === 'rejected' && (
                          <div className="flex flex-col items-end gap-1">
                            {analysis.rejection_count !== undefined && analysis.rejection_count > 0 && (
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  analysis.rejection_count >= 4
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {analysis.rejection_count}x
                              </span>
                            )}
                            {analysis.is_dissolved && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-600 text-white">
                                Dissolved
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-700">
                        {analysis.platform || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-700">
                        {analysis.target_emotion || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {analysis.reference_url ? (
                        <a
                          href={analysis.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                        >
                          <LinkIcon className="w-4 h-4 mr-1" />
                          Link
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openViewModal(analysis)}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                          title="View"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {(analysis.status === 'PENDING' || analysis.status === 'REJECTED') && !analysis.is_dissolved && (
                          <button
                            onClick={() => openModal(analysis)}
                            className={`p-2 rounded-lg transition ${
                              analysis.status === 'REJECTED'
                                ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-primary-500 hover:text-primary-600 hover:bg-primary-50'
                            }`}
                            title={analysis.status === 'REJECTED' ? 'Revise & Resubmit' : 'Edit'}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {activeTab === 'pending' && <ClockIcon className="w-8 h-8 text-gray-400" />}
              {activeTab === 'approved' && <CheckCircleIcon className="w-8 h-8 text-gray-400" />}
              {activeTab === 'rejected' && <XCircleIcon className="w-8 h-8 text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchQuery
                ? 'No scripts found'
                : activeTab === 'pending'
                ? 'No pending scripts'
                : activeTab === 'approved'
                ? 'No approved scripts yet'
                : 'No rejected scripts'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery
                ? 'Try a different search term'
                : activeTab === 'pending'
                ? 'Submit a new script to get started'
                : activeTab === 'approved'
                ? 'Your approved scripts will appear here'
                : 'Rejected scripts will appear here for revision'}
            </p>
            {activeTab === 'pending' && !searchQuery && (
              <button
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Video
              </button>
            )}
          </div>
        )}
      </div>


      {/* Multi-Step Analysis Wizard */}
      <MultiStepAnalysisWizard
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        editingAnalysis={editingAnalysis}
        initialFormData={formData}
      />

      {isViewModalOpen && viewingAnalysis && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeViewModal}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analysis Details</h2>
                    <span className={`mt-2 inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(viewingAnalysis.status)}`}>
                      {viewingAnalysis.status}
                    </span>
                  </div>
                  <button
                    onClick={closeViewModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* LEVEL 1: Basic Info Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Basic Information</h3>

                    {/* Reference URL */}
                    <div className="mb-4">
                      <span className="text-xs font-medium text-gray-500 uppercase">Reference Link</span>
                      {viewingAnalysis.reference_url ? (
                        <a
                          href={viewingAnalysis.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary-600 hover:text-primary-700 mt-1"
                        >
                          <LinkIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{viewingAnalysis.reference_url}</span>
                        </a>
                      ) : (
                        <p className="text-gray-500 text-sm mt-1">Not provided</p>
                      )}
                    </div>

                    {/* Grid of basic info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Shoot Type</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.shoot_type || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Creator</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.creator_name || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Works on Mute</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.works_without_audio || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Replication</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.replication_strength || '-'}/10</p>
                      </div>
                    </div>

                    {/* Characters Involved */}
                    {viewingAnalysis.characters_involved && (
                      <div className="mt-3 bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Who's in the Video</span>
                        <p className="text-sm text-gray-900 mt-1">{viewingAnalysis.characters_involved}</p>
                      </div>
                    )}
                  </div>

                  {/* Hook Section */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔥</span>
                      <h3 className="text-base font-semibold text-gray-900">The Hook</h3>
                    </div>

                    {viewingAnalysis.unusual_element && (
                      <div className="mb-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                          {viewingAnalysis.unusual_element}
                        </span>
                      </div>
                    )}

                    {viewingAnalysis.hook ? (
                      <p className="text-gray-800 font-medium">{viewingAnalysis.hook}</p>
                    ) : (
                      <p className="text-gray-500 text-sm">No hook text provided</p>
                    )}

                    {viewingAnalysis.hook_voice_note_url && (
                      <audio controls className="w-full mt-3">
                        <source src={viewingAnalysis.hook_voice_note_url} type="audio/webm" />
                        Your browser does not support audio playback.
                      </audio>
                    )}
                  </div>

                  {/* LEVEL 2: Advanced Analysis Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Advanced Analysis</h3>

                    {/* Body Reactions */}
                    {viewingAnalysis.body_reactions && viewingAnalysis.body_reactions.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs font-medium text-gray-500 uppercase block mb-2">Body Reactions (First 6 sec)</span>
                        <div className="flex flex-wrap gap-2">
                          {viewingAnalysis.body_reactions.map((reaction: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                              {reaction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emotion & Beliefs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Emotion (First 6 sec)</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.emotion_first_6_sec || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Challenged Belief</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.challenged_belief || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">"If he can, why can't you?"</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.if_he_can_why_cant_you || '-'}</p>
                      </div>
                    </div>

                    {/* Emotional Identity Impact */}
                    {viewingAnalysis.emotional_identity_impact && viewingAnalysis.emotional_identity_impact.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs font-medium text-gray-500 uppercase block mb-2">Emotional Identity Impact</span>
                        <div className="flex flex-wrap gap-2">
                          {viewingAnalysis.emotional_identity_impact.map((impact: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded-full">
                              {impact}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Engagement Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Feel Like Commenting</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.feel_like_commenting || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Read Comments</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.read_comments || '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Shares</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.sharing_number ?? '-'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase block">Video Action</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{viewingAnalysis.video_action || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Feedback (For Script Writers) */}
                  {!isAdmin && viewingAnalysis.status === 'REJECTED' && (viewingAnalysis.feedback || viewingAnalysis.feedback_voice_note_url) && (
                    <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg">
                      <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Rejection Feedback - Please Review & Revise
                      </h3>

                      {viewingAnalysis.feedback && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Admin Feedback:</h4>
                          <p className="text-gray-800 whitespace-pre-wrap bg-white p-4 rounded border border-red-200">
                            {viewingAnalysis.feedback}
                          </p>
                        </div>
                      )}

                      {viewingAnalysis.feedback_voice_note_url && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Voice Feedback:</h4>
                          <audio controls className="w-full">
                            <source src={viewingAnalysis.feedback_voice_note_url} type="audio/webm" />
                            <source src={viewingAnalysis.feedback_voice_note_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {viewingAnalysis.rejection_count !== undefined && viewingAnalysis.rejection_count > 0 && (
                        <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                          <p className="text-sm text-orange-800">
                            <strong>⚠️ Warning:</strong> This script has been rejected {viewingAnalysis.rejection_count} time{viewingAnalysis.rejection_count > 1 ? 's' : ''}.
                            {viewingAnalysis.rejection_count >= 4 && (
                              <span className="block mt-1 font-bold text-red-700">
                                🚨 One more rejection will permanently dissolve this project!
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {viewingAnalysis.is_dissolved && (
                        <div className="mt-4 p-3 bg-gray-800 text-white rounded">
                          <p className="text-sm font-bold">
                            ⛔ This project has been dissolved due to multiple rejections. No further revisions are allowed.
                          </p>
                          {viewingAnalysis.dissolution_reason && (
                            <p className="text-xs mt-1 text-gray-300">{viewingAnalysis.dissolution_reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Review Scores (if reviewed) */}
                  {viewingAnalysis.overall_score && (
                    <div className="bg-gradient-to-r from-primary-50 to-purple-50 p-6 rounded-lg border-2 border-primary-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <StarIconSolid className="w-5 h-5 text-yellow-500 mr-2" />
                        Admin Review Scores
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-3xl font-bold text-primary-600">{viewingAnalysis.hook_strength}</div>
                          <div className="text-xs text-gray-600 mt-1">Hook Strength</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-3xl font-bold text-purple-600">{viewingAnalysis.content_quality}</div>
                          <div className="text-xs text-gray-600 mt-1">Content Quality</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-3xl font-bold text-pink-600">{viewingAnalysis.viral_potential}</div>
                          <div className="text-xs text-gray-600 mt-1">Viral Potential</div>
                        </div>
                        <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-3xl font-bold text-blue-600">{viewingAnalysis.replication_clarity}</div>
                          <div className="text-xs text-gray-600 mt-1">Replication Clarity</div>
                        </div>
                        <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 shadow-md border-2 border-green-300">
                          <div className="text-4xl font-bold text-green-600">{viewingAnalysis.overall_score}</div>
                          <div className="text-xs text-gray-700 mt-1 font-semibold">Overall Score</div>
                        </div>
                      </div>
                      {(viewingAnalysis.feedback || viewingAnalysis.feedback_voice_note_url) && (
                        <div className="mt-4 space-y-3">
                          {viewingAnalysis.feedback && (
                            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center mb-2">
                                <svg className="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <span className="text-sm font-semibold text-gray-700">Admin Feedback:</span>
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewingAnalysis.feedback}</p>
                            </div>
                          )}
                          {viewingAnalysis.feedback_voice_note_url && (
                            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center mb-2">
                                <svg className="w-4 h-4 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <span className="text-sm font-semibold text-gray-700">Voice Feedback:</span>
                              </div>
                              <audio controls className="w-full mt-2">
                                <source src={viewingAnalysis.feedback_voice_note_url} type="audio/webm" />
                                <source src={viewingAnalysis.feedback_voice_note_url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                        </div>
                      )}
                      {viewingAnalysis.reviewed_at && (
                        <div className="mt-3 text-xs text-gray-600 text-right">
                          Reviewed on {new Date(viewingAnalysis.reviewed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-gray-500 border-t pt-4">
                    <p>Created: {new Date(viewingAnalysis.created_at).toLocaleString()}</p>
                    {viewingAnalysis.updated_at && (
                      <p>Updated: {new Date(viewingAnalysis.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        closeViewModal();
                        openReviewModal(viewingAnalysis);
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center"
                    >
                      <StarIcon className="w-5 h-5 mr-2" />
                      {viewingAnalysis.overall_score ? 'Update Review' : 'Review & Score'}
                    </button>
                  )}
                  {!isAdmin && (viewingAnalysis.status === 'PENDING' || viewingAnalysis.status === 'REJECTED') && !viewingAnalysis.is_dissolved && (
                    <button
                      onClick={() => {
                        closeViewModal();
                        openModal(viewingAnalysis);
                      }}
                      className={`px-6 py-2 border rounded-lg font-medium flex items-center ${
                        viewingAnalysis.status === 'REJECTED'
                          ? 'border-red-600 text-red-600 hover:bg-red-50 bg-red-50'
                          : 'border-primary-600 text-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      <PencilIcon className="w-5 h-5 mr-2" />
                      {viewingAnalysis.status === 'REJECTED' ? 'Revise & Resubmit' : 'Edit Analysis'}
                    </button>
                  )}
                  <button
                    onClick={closeViewModal}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal with Scoring (Admin Only) */}
      {isReviewModalOpen && viewingAnalysis && isAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeReviewModal}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <StarIcon className="w-7 h-7 text-yellow-500 mr-2" />
                      Review & Score Analysis
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Submitted by {viewingAnalysis.full_name || 'Unknown'} • {new Date(viewingAnalysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={closeReviewModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Decision */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">Decision</label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setReviewData({ ...reviewData, status: 'APPROVED' })}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                          reviewData.status === 'APPROVED'
                            ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setReviewData({ ...reviewData, status: 'REJECTED' })}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                          reviewData.status === 'REJECTED'
                            ? 'bg-red-600 text-white ring-2 ring-red-600 ring-offset-2'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>

                  {/* Scoring Criteria */}
                  <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Scoring Criteria (1-10)</h3>

                    <ReviewScoreInput
                      label="Hook Strength"
                      description="How compelling and attention-grabbing is the hook?"
                      value={reviewData.hookStrength}
                      onChange={(value) => setReviewData({ ...reviewData, hookStrength: value })}
                    />

                    <ReviewScoreInput
                      label="Content Quality"
                      description="Overall quality of the analysis and explanation"
                      value={reviewData.contentQuality}
                      onChange={(value) => setReviewData({ ...reviewData, contentQuality: value })}
                    />

                    <ReviewScoreInput
                      label="Viral Potential"
                      description="How likely is this strategy to actually work?"
                      value={reviewData.viralPotential}
                      onChange={(value) => setReviewData({ ...reviewData, viralPotential: value })}
                    />

                    <ReviewScoreInput
                      label="Replication Clarity"
                      description="How clear and actionable are the replication steps?"
                      value={reviewData.replicationClarity}
                      onChange={(value) => setReviewData({ ...reviewData, replicationClarity: value })}
                    />

                    {/* Overall Score Preview */}
                    <div className="pt-4 border-t border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Overall Score (Average):</span>
                        <span className="text-3xl font-bold text-primary-600">
                          {((reviewData.hookStrength + reviewData.contentQuality + reviewData.viralPotential + reviewData.replicationClarity) / 4).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Written Feedback {reviewData.status === 'REJECTED' && <span className="text-red-600">*</span>}
                      </label>
                      <textarea
                        value={reviewData.feedback}
                        onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                        rows={4}
                        placeholder={reviewData.status === 'REJECTED' ? 'Feedback is required when rejecting...' : 'Optional feedback for the script writer...'}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          reviewData.status === 'REJECTED' && !reviewData.feedback?.trim()
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300'
                        }`}
                      />
                      {reviewData.status === 'REJECTED' && !reviewData.feedback?.trim() && (
                        <p className="mt-1 text-sm text-red-600">Feedback is required when rejecting an analysis</p>
                      )}
                    </div>

                    <div>
                      <VoiceRecorder
                        label="Voice Feedback (Optional)"
                        placeholder="Record audio feedback for the script writer"
                        onRecordingComplete={(blob, _url) => {
                          setReviewData({ ...reviewData, feedbackVoiceNote: blob });
                        }}
                        onClear={() => {
                          setReviewData({ ...reviewData, feedbackVoiceNote: null });
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={closeReviewModal}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewMutation.isPending}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                    >
                      {reviewMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <StarIcon className="w-5 h-5 mr-2" />
                          Submit Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation
        role={UserRole.SCRIPT_WRITER}
        onNewAction={() => openModal()}
      />
    </div>
  );
}
