import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  UserGroupIcon,
  TagIcon,
  PlusIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { contentConfigService } from '@/services/contentConfigService';
import { videographerQueueService } from '@/services/videographerQueueService';
import type { ViralAnalysis, PickProjectData } from '@/types';
import MultiSelectTags from '@/components/MultiSelectTags';

interface PickProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ViralAnalysis | null;
  onSuccess?: (project: ViralAnalysis) => void;
}

const SHOOT_POSSIBILITIES = [
  { value: 25, label: '25%', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 50, label: '50%', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 75, label: '75%', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 100, label: '100%', color: 'bg-green-100 text-green-700 border-green-300' },
];

export default function PickProjectModal({
  isOpen,
  onClose,
  project,
  onSuccess,
}: PickProjectModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [profileId, setProfileId] = useState('');
  const [hookTagIds, setHookTagIds] = useState<string[]>([]);
  const [characterTagIds, setCharacterTagIds] = useState<string[]>([]);
  const [totalPeopleInvolved, setTotalPeopleInvolved] = useState<number | undefined>();
  const [shootPossibility, setShootPossibility] = useState<25 | 50 | 75 | 100 | undefined>();
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Fetch config data
  const { data: profiles = [] } = useQuery({
    queryKey: ['profile-list'],
    queryFn: contentConfigService.getAllProfiles,
    enabled: isOpen,
  });

  const { data: hookTags = [] } = useQuery({
    queryKey: ['hook-tags'],
    queryFn: contentConfigService.getAllHookTags,
    enabled: isOpen,
  });

  const { data: characterTags = [] } = useQuery({
    queryKey: ['character-tags'],
    queryFn: contentConfigService.getAllCharacterTags,
    enabled: isOpen,
  });

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: (name: string) => contentConfigService.createProfile({ name }),
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile-list'] });
      setProfileId(newProfile.id);
      setNewProfileName('');
      setIsAddingProfile(false);
      toast.success(`Profile "${newProfile.name}" created!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create profile');
    },
  });

  // Pick project mutation
  const pickProjectMutation = useMutation({
    mutationFn: (data: PickProjectData) => videographerQueueService.pickProject(data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ['videographer', 'available'] });
      queryClient.invalidateQueries({ queryKey: ['videographer', 'my-projects'] });
      toast.success('Project picked successfully! You can now start shooting.');
      onSuccess?.(updatedProject);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to pick project');
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setProfileId(project.profile_id || '');
      setHookTagIds(project.hook_tags?.map(t => t.id) || []);
      setCharacterTagIds(project.character_tags?.map(t => t.id) || []);
      setTotalPeopleInvolved(project.total_people_involved || undefined);
      setShootPossibility(project.shoot_possibility || undefined);
    }
  }, [project]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProfileId('');
      setHookTagIds([]);
      setCharacterTagIds([]);
      setTotalPeopleInvolved(undefined);
      setShootPossibility(undefined);
      setIsAddingProfile(false);
      setNewProfileName('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!project) return;

    // Profile is now OPTIONAL when picking - can be set later when uploading
    // Content ID will only be generated when profile is finally selected

    pickProjectMutation.mutate({
      analysisId: project.id,
      profileId: profileId || undefined, // Optional - can be set later
      hookTagIds: hookTagIds.length > 0 ? hookTagIds : undefined,
      characterTagIds: characterTagIds.length > 0 ? characterTagIds : undefined,
      totalPeopleInvolved,
      shootPossibility,
    });
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 flex flex-col bg-white rounded-t-2xl max-h-[90vh] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full sm:rounded-2xl sm:max-h-[85vh]">
        {/* Drag Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <VideoCameraIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pick Project</h2>
              <p className="text-xs text-gray-500">Set details and start shooting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Project Summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                  {project.hook || project.title || 'Untitled Script'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span>By {project.full_name || 'Unknown'}</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    project.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    project.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {project.priority || 'NORMAL'}
                  </span>
                </div>
              </div>
            </div>
            {project.reference_url && (
              <a
                href={project.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="truncate">View Reference Video</span>
              </a>
            )}
          </div>

          {/* Profile Selection (OPTIONAL - can be set later) */}
          <div className={`rounded-xl p-4 border-2 ${profileId ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <UserGroupIcon className="w-4 h-4 text-indigo-600" />
              Profile
              <span className="text-xs font-normal text-gray-500 ml-auto">
                Optional - can select when uploading
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              {profiles
                .filter((p: any) => p.is_active)
                .map((profile: any) => {
                  const isSelected = profileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setProfileId(profile.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-400'
                      }`}
                    >
                      {isSelected && <CheckCircleIcon className="w-4 h-4 inline mr-1" />}
                      {profile.name}
                    </button>
                  );
                })}

              {/* Add New Profile Button */}
              {!isAddingProfile && (
                <button
                  type="button"
                  onClick={() => setIsAddingProfile(true)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-dashed border-gray-400 flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add
                </button>
              )}

              {/* Inline Add Profile Form */}
              {isAddingProfile && (
                <div className="flex items-center gap-2 w-full mt-2">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="New profile name"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                    onClick={() => {
                      if (newProfileName.trim()) {
                        createProfileMutation.mutate(newProfileName.trim());
                      }
                    }}
                    disabled={!newProfileName.trim() || createProfileMutation.isPending}
                    className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createProfileMutation.isPending ? '...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProfile(false);
                      setNewProfileName('');
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {profileId
                ? `Content ID will be generated: ${profiles.find((p: any) => p.id === profileId)?.name || 'PROFILE'}-001`
                : 'Content ID will be generated when you select a profile (can be done later when uploading files)'}
            </p>
          </div>

          {/* Hook Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <MultiSelectTags
              label={
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <TagIcon className="w-4 h-4 text-purple-600" />
                  Hook Tags
                </span>
              }
              options={hookTags.filter((t: any) => t.is_active).map((t: any) => ({ id: t.id, name: t.name }))}
              selectedIds={hookTagIds}
              onChange={setHookTagIds}
              placeholder="Select hook types..."
            />
          </div>

          {/* Character Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <MultiSelectTags
              label={
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <UserGroupIcon className="w-4 h-4 text-teal-600" />
                  Character Tags
                </span>
              }
              options={characterTags.filter((t: any) => t.is_active).map((t: any) => ({ id: t.id, name: t.name }))}
              selectedIds={characterTagIds}
              onChange={setCharacterTagIds}
              placeholder="Select characters..."
            />
          </div>

          {/* People Involved & Shoot Possibility */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                People Involved
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Number"
                value={totalPeopleInvolved ?? ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '') {
                    setTotalPeopleInvolved(undefined);
                  } else {
                    setTotalPeopleInvolved(Math.min(Math.max(parseInt(val), 1), 20));
                  }
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Shoot Possibility
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SHOOT_POSSIBILITIES.map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShootPossibility(value as any)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      shootPossibility === value
                        ? `${color} ring-2 ring-offset-1`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 safe-area-inset-bottom">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pickProjectMutation.isPending}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pickProjectMutation.isPending}
              className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {pickProjectMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Picking...
                </>
              ) : (
                <>
                  <VideoCameraIcon className="w-5 h-5" />
                  Pick & Start Shooting
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
