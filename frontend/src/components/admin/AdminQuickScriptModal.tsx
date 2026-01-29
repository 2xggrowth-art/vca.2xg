import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  XMarkIcon,
  LinkIcon,
  CheckIcon,
  UserGroupIcon,
  SparklesIcon,
  PlusIcon,
  BoltIcon,
  FilmIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { contentConfigService } from '@/services/contentConfigService';
import { assignmentService } from '@/services/assignmentService';
import { CastCompositionGrid } from '@/components/forms';
import type { CastComposition } from '@/types';
import { DEFAULT_CAST_COMPOSITION } from '@/types';

interface AdminQuickScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickScriptFormData {
  // Script basics
  referenceUrl: string;
  title: string;
  targetEmotion: string;
  expectedOutcome: string;

  // Production details
  profileId: string;
  hookTagIds: string[];
  castComposition: CastComposition;
  shootPossibility: 25 | 50 | 75 | 100 | undefined;
  adminRemarks: string;
}

const TARGET_EMOTIONS = [
  'Curiosity',
  'Shock',
  'Fear',
  'Joy',
  'Anger',
  'Surprise',
  'Nostalgia',
  'Inspiration',
  'FOMO',
  'Relatability',
];

const EXPECTED_OUTCOMES = [
  'Watch till end',
  'Like/Heart',
  'Comment',
  'Share',
  'Follow',
  'Save',
  'Visit Profile',
  'Click Link',
  'Buy Product',
];

const SHOOT_POSSIBILITIES = [
  { value: 25, label: '25%', color: 'bg-red-500 text-white' },
  { value: 50, label: '50%', color: 'bg-yellow-500 text-white' },
  { value: 75, label: '75%', color: 'bg-blue-500 text-white' },
  { value: 100, label: '100%', color: 'bg-green-500 text-white' },
];

export default function AdminQuickScriptModal({ isOpen, onClose }: AdminQuickScriptModalProps) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    if (isOpen) {
      getUser();
    }
  }, [isOpen]);

  const [formData, setFormData] = useState<QuickScriptFormData>({
    referenceUrl: '',
    title: '',
    targetEmotion: '',
    expectedOutcome: '',
    profileId: '',
    hookTagIds: [],
    castComposition: { ...DEFAULT_CAST_COMPOSITION },
    shootPossibility: undefined,
    adminRemarks: '',
  });

  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isAddingHookTag, setIsAddingHookTag] = useState(false);
  const [newHookTagName, setNewHookTagName] = useState('');
  const [editingHookTag, setEditingHookTag] = useState<{ id: string; name: string } | null>(null);

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profile-list'],
    queryFn: contentConfigService.getAllProfiles,
    enabled: isOpen,
  });

  // Fetch hook tags
  const { data: hookTags = [] } = useQuery({
    queryKey: ['hook-tags'],
    queryFn: contentConfigService.getAllHookTags,
    enabled: isOpen,
  });

  // Fetch BCH industry ID
  const { data: industries = [] } = useQuery({
    queryKey: ['industries'],
    queryFn: contentConfigService.getAllIndustries,
    enabled: isOpen,
  });

  const bchIndustry = industries.find((i: any) => i.short_code === 'BCH');

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: (name: string) => contentConfigService.createProfile({ name }),
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile-list'] });
      setFormData(prev => ({ ...prev, profileId: newProfile.id }));
      setNewProfileName('');
      setIsAddingProfile(false);
      toast.success(`Profile "${newProfile.name}" created!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create profile');
    },
  });

  // Hook tag mutations
  const createHookTagMutation = useMutation({
    mutationFn: (name: string) => contentConfigService.createHookTag({ name }),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['hook-tags'] });
      setFormData(prev => ({ ...prev, hookTagIds: [...prev.hookTagIds, newTag.id] }));
      setNewHookTagName('');
      setIsAddingHookTag(false);
      toast.success(`Hook tag "${newTag.name}" created!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create hook tag');
    },
  });

  const updateHookTagMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => contentConfigService.updateHookTag(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hook-tags'] });
      setEditingHookTag(null);
      toast.success('Hook tag updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update hook tag');
    },
  });

  const deleteHookTagMutation = useMutation({
    mutationFn: (id: string) => contentConfigService.deleteHookTag(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['hook-tags'] });
      setFormData(prev => ({ ...prev, hookTagIds: prev.hookTagIds.filter(id => id !== deletedId) }));
      toast.success('Hook tag deleted!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete hook tag');
    },
  });

  // Quick submit mutation
  const quickSubmitMutation = useMutation({
    mutationFn: async (data: QuickScriptFormData) => {
      if (!currentUserId || !bchIndustry?.id) throw new Error('Missing user or industry');

      // Step 1: Create the analysis directly as APPROVED
      const { data: analysis, error: createError } = await supabase
        .from('viral_analyses')
        .insert({
          user_id: currentUserId,
          reference_url: data.referenceUrl,
          title: data.title,
          target_emotion: data.targetEmotion,
          expected_outcome: data.expectedOutcome,
          status: 'APPROVED',
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
          // Set default scores for admin-submitted scripts
          hook_strength: 8,
          content_quality: 8,
          viral_potential: 8,
          replication_clarity: 8,
          overall_score: 8,
          // Production details
          industry_id: bchIndustry.id,
          profile_id: data.profileId,
          total_people_involved: data.castComposition.total || 1,
          shoot_possibility: data.shootPossibility,
          admin_remarks: data.adminRemarks || null,
          production_stage: 'PLANNING',
          production_started_at: new Date().toISOString(),
          // Cast composition (structured)
          cast_composition: {
            man: data.castComposition.man,
            woman: data.castComposition.woman,
            boy: data.castComposition.boy,
            girl: data.castComposition.girl,
            teen_boy: data.castComposition.teen_boy,
            teen_girl: data.castComposition.teen_girl,
            senior_man: data.castComposition.senior_man,
            senior_woman: data.castComposition.senior_woman,
            include_owner: data.castComposition.include_owner,
            total: data.castComposition.total,
          },
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 2: Generate content_id
      const { error: contentIdError } = await supabase.rpc(
        'generate_content_id_on_approval',
        {
          p_analysis_id: analysis.id,
          p_profile_id: data.profileId,
        }
      );

      if (contentIdError) {
        console.error('Content ID generation failed:', contentIdError);
      }

      // Step 3: Link hook tags (non-blocking - log errors but don't fail)
      if (data.hookTagIds.length > 0) {
        const hookTagInserts = data.hookTagIds.map(tagId => ({
          analysis_id: analysis.id,
          hook_tag_id: tagId,
        }));
        const { error: hookTagError } = await supabase.from('analysis_hook_tags').insert(hookTagInserts);
        if (hookTagError) {
          console.error('Hook tag linking failed:', hookTagError);
        }
      }

      // Step 4: Save production metadata (non-blocking - log errors but don't fail)
      // NOTE: Do NOT auto-assign videographer - scripts should go to Available Projects
      // queue so videographers can pick them. Only auto-assign editor/posting manager.
      try {
        await assignmentService.assignTeam(analysis.id, {
          autoAssignVideographer: false, // Videographers pick from Available queue
          autoAssignEditor: true,
          autoAssignPostingManager: true,
          industryId: bchIndustry.id,
          profileId: data.profileId,
          hookTagIds: data.hookTagIds,
          totalPeopleInvolved: data.castComposition.total || 1,
          shootPossibility: data.shootPossibility,
          adminRemarks: data.adminRemarks,
        });
      } catch (assignError) {
        console.error('Team auto-assignment failed:', assignError);
      }

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'production-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'approved-scripts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      // Invalidate videographer queue so new scripts show up in Available Projects
      queryClient.invalidateQueries({ queryKey: ['videographer', 'available'] });
      toast.success('Script added to production!');
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create script');
    },
  });

  const resetForm = () => {
    setFormData({
      referenceUrl: '',
      title: '',
      targetEmotion: '',
      expectedOutcome: '',
      profileId: '',
      hookTagIds: [],
      castComposition: { ...DEFAULT_CAST_COMPOSITION },
      shootPossibility: undefined,
      adminRemarks: '',
    });
    setIsAddingProfile(false);
    setNewProfileName('');
    setIsAddingHookTag(false);
    setNewHookTagName('');
  };

  const handleSubmit = () => {
    // Validation - Title is now required instead of Hook
    const errors: string[] = [];
    if (!formData.referenceUrl.trim()) errors.push('Reference URL');
    if (!formData.title.trim()) errors.push('Title');
    if (!formData.targetEmotion) errors.push('Target Emotion');
    if (!formData.expectedOutcome) errors.push('Expected Outcome');
    if (!formData.profileId) errors.push('Profile');
    if (formData.hookTagIds.length === 0) errors.push('Hook Tags');
    // Cast composition validation - need at least 1 person or include owner
    if (formData.castComposition.total === 0 && !formData.castComposition.include_owner) {
      errors.push('Cast Composition (add at least 1 person)');
    }
    if (!formData.shootPossibility) errors.push('Shoot Possibility');

    if (errors.length > 0) {
      toast.error(`Please fill: ${errors.join(', ')}`);
      return;
    }

    quickSubmitMutation.mutate(formData);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Toggle hook tag selection
  const toggleHookTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      hookTagIds: prev.hookTagIds.includes(tagId)
        ? prev.hookTagIds.filter(id => id !== tagId)
        : [...prev.hookTagIds, tagId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col md:items-center md:justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="relative bg-white md:rounded-2xl shadow-2xl w-full md:max-w-2xl h-full md:h-auto md:max-h-[92vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-primary-600 to-purple-600 px-4 md:px-6 py-4 md:rounded-t-2xl">
          <div className="flex items-center justify-between pt-safe">
            <div className="flex items-center text-white">
              <BoltIcon className="w-6 h-6 mr-2" />
              <div>
                <h2 className="text-lg font-bold">Quick Add Script</h2>
                <p className="text-xs text-white/80">Skip approval - direct to production</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 md:px-6 py-5 space-y-6">

            {/* Section 1: Script Basics */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                <LinkIcon className="w-4 h-4 mr-2" />
                Script Details
              </h3>

              {/* Reference URL */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Reference Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.referenceUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceUrl: e.target.value }))}
                  placeholder="Paste Instagram, TikTok, or YouTube link"
                  className="w-full px-4 py-3.5 min-h-[52px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  <FilmIcon className="w-5 h-5 inline mr-2 text-primary-600" />
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give this content a title"
                  className="w-full px-4 py-3.5 min-h-[52px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base"
                />
              </div>

              {/* Target Emotion - Chip Selection */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Target Emotion <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_EMOTIONS.map((emotion) => (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, targetEmotion: emotion }))}
                      className={`px-4 py-2.5 min-h-[44px] rounded-full font-medium transition-all text-sm ${
                        formData.targetEmotion === emotion
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Outcome - Chip Selection */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Expected Outcome <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPECTED_OUTCOMES.map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, expectedOutcome: outcome }))}
                      className={`px-4 py-2.5 min-h-[44px] rounded-full font-medium transition-all text-sm ${
                        formData.expectedOutcome === outcome
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {outcome}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Production Details */}
            <div className="space-y-5 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                <SparklesIcon className="w-4 h-4 mr-2" />
                Production Details
              </h3>

              {/* Profile Selection - Chip Selection */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  <UserGroupIcon className="w-5 h-5 inline mr-2 text-primary-600" />
                  Profile <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {profiles
                    .filter((p: any) => p.is_active)
                    .map((profile: any) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profileId: profile.id }))}
                        className={`px-4 py-2.5 min-h-[44px] rounded-full font-medium transition-all text-sm ${
                          formData.profileId === profile.id
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {profile.name}
                      </button>
                    ))}
                  {!isAddingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsAddingProfile(true)}
                      className="px-4 py-2.5 min-h-[44px] rounded-full font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300 text-sm"
                    >
                      <PlusIcon className="w-4 h-4 inline mr-1" />
                      Add New
                    </button>
                  )}
                </div>
                {isAddingProfile && (
                  <div className="flex gap-2 mt-3 items-center bg-gray-50 p-3 rounded-xl">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="New profile name..."
                      className="flex-1 px-4 py-2.5 text-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newProfileName.trim()) {
                          e.preventDefault();
                          createProfileMutation.mutate(newProfileName.trim());
                        } else if (e.key === 'Escape') {
                          setIsAddingProfile(false);
                          setNewProfileName('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => createProfileMutation.mutate(newProfileName.trim())}
                      disabled={!newProfileName.trim() || createProfileMutation.isPending}
                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingProfile(false); setNewProfileName(''); }}
                      className="px-3 py-2.5 text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Hook Tags - Multi-Select Chips with Add/Edit/Delete */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Hook Tags <span className="text-red-500">*</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {hookTags
                    .filter((t: any) => t.is_active)
                    .map((tag: any) => {
                      const isSelected = formData.hookTagIds.includes(tag.id);
                      const isEditing = editingHookTag?.id === tag.id;

                      if (isEditing && editingHookTag) {
                        return (
                          <div key={tag.id} className="flex items-center gap-1 bg-purple-50 rounded-full px-2 py-1">
                            <input
                              type="text"
                              value={editingHookTag.name}
                              onChange={(e) => setEditingHookTag({ id: editingHookTag.id, name: e.target.value })}
                              className="px-2 py-1 text-sm border border-purple-300 rounded-lg w-24 focus:ring-1 focus:ring-purple-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingHookTag.name.trim()) {
                                  e.preventDefault();
                                  updateHookTagMutation.mutate({ id: editingHookTag.id, name: editingHookTag.name.trim() });
                                } else if (e.key === 'Escape') {
                                  setEditingHookTag(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateHookTagMutation.mutate({ id: editingHookTag.id, name: editingHookTag.name.trim() })}
                              disabled={!editingHookTag.name.trim() || updateHookTagMutation.isPending}
                              className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingHookTag(null)}
                              className="p-1 text-gray-500 hover:text-gray-700"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={tag.id} className="group relative">
                          <button
                            type="button"
                            onClick={() => toggleHookTag(tag.id)}
                            className={`px-4 py-2.5 min-h-[44px] rounded-full font-medium transition-all text-sm ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {tag.name}
                          </button>
                          {/* Edit/Delete buttons on hover */}
                          <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingHookTag({ id: tag.id, name: tag.name }); }}
                              className="p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-purple-600 border border-gray-200"
                            >
                              <PencilIcon className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${tag.name}"?`)) deleteHookTagMutation.mutate(tag.id); }}
                              className="p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-red-600 border border-gray-200"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {/* Add new hook tag button */}
                  {!isAddingHookTag && (
                    <button
                      type="button"
                      onClick={() => setIsAddingHookTag(true)}
                      className="px-4 py-2.5 min-h-[44px] rounded-full font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300 text-sm"
                    >
                      <PlusIcon className="w-4 h-4 inline mr-1" />
                      Add Tag
                    </button>
                  )}
                </div>
                {isAddingHookTag && (
                  <div className="flex gap-2 mt-3 items-center bg-purple-50 p-3 rounded-xl">
                    <input
                      type="text"
                      value={newHookTagName}
                      onChange={(e) => setNewHookTagName(e.target.value)}
                      placeholder="New hook tag name..."
                      className="flex-1 px-4 py-2.5 text-sm border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newHookTagName.trim()) {
                          e.preventDefault();
                          createHookTagMutation.mutate(newHookTagName.trim());
                        } else if (e.key === 'Escape') {
                          setIsAddingHookTag(false);
                          setNewHookTagName('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => createHookTagMutation.mutate(newHookTagName.trim())}
                      disabled={!newHookTagName.trim() || createHookTagMutation.isPending}
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingHookTag(false); setNewHookTagName(''); }}
                      className="px-3 py-2.5 text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Cast Composition */}
              <CastCompositionGrid
                label="Cast Composition"
                hint="Select who will appear in the video"
                value={formData.castComposition}
                onChange={(cast) => setFormData(prev => ({ ...prev, castComposition: cast }))}
                showPresets
                showOwnerToggle
                showSummary
                columns={2}
              />

              {/* Shoot Possibility - Chip Selection */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Shoot Possibility <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHOOT_POSSIBILITIES.map((sp) => (
                    <button
                      key={sp.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, shootPossibility: sp.value as any }))}
                      className={`px-5 py-3 min-h-[48px] rounded-full font-bold transition-all text-base ${
                        formData.shootPossibility === sp.value
                          ? sp.color + ' shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Remarks */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-2">
                  Admin Remarks <span className="text-sm font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={formData.adminRemarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminRemarks: e.target.value }))}
                  placeholder="Special instructions for the team..."
                  rows={2}
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base resize-none"
                />
              </div>
            </div>
          </div>

        {/* Footer - Extra padding on mobile for bottom nav */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 md:px-6 py-4 pb-24 md:pb-4 md:rounded-b-2xl">
          <div className="flex items-center justify-between gap-3">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 font-semibold transition text-base"
            >
              Cancel
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={quickSubmitMutation.isPending}
              className="flex-1 max-w-xs inline-flex items-center justify-center px-6 py-3 min-h-[48px] bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 active:from-primary-800 active:to-purple-800 font-semibold transition text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quickSubmitMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Add to Production
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
