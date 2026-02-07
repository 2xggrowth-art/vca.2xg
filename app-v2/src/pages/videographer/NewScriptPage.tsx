import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Loader2, Plus, X } from 'lucide-react';
import { analysesService } from '@/services/analysesService';
import { videographerService } from '@/services/videographerService';
import type { AnalysisFormData } from '@/types';
import toast from 'react-hot-toast';

const SHOOT_TYPES = ['Indoor', 'Outdoor'];

const HOOK_TYPES = ['Visual Hook', 'Audio Hook', 'SFX Hook', 'Onscreen Hook'];

const YES_NO_MAYBE = ['Yes', 'No', 'Maybe'];

const INITIAL_FORM_DATA: AnalysisFormData = {
  referenceUrl: '',
  title: '',
  shootType: '',
  creatorName: '',
  hookTypes: [],
  worksWithoutAudio: '',
  profileId: '',
};

interface Profile {
  id: string;
  name: string;
}

export default function VideographerNewScriptPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AnalysisFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [addingProfile, setAddingProfile] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await videographerService.getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    try {
      setAddingProfile(true);
      const newProfile = await videographerService.createProfile(newProfileName.trim());
      setProfiles((prev) => [...prev, newProfile].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProfileName('');
      setShowAddProfile(false);
      toast.success('Profile added');
      // Auto-select the new profile
      updateField('profileId', newProfile.id);
    } catch (error) {
      console.error('Failed to add profile:', error);
      toast.error('Failed to add profile');
    } finally {
      setAddingProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      setDeletingProfileId(profileId);
      await videographerService.deleteProfile(profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      // Clear selection if deleted profile was selected
      if (formData.profileId === profileId) {
        updateField('profileId', '');
      }
      toast.success('Profile removed');
    } catch (error) {
      console.error('Failed to delete profile:', error);
      toast.error('Failed to delete profile');
    } finally {
      setDeletingProfileId(null);
    }
  };

  const updateField = <K extends keyof AnalysisFormData>(
    field: K,
    value: AnalysisFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleHookType = (hookType: string) => {
    const current = formData.hookTypes || [];
    const updated = current.includes(hookType)
      ? current.filter((t) => t !== hookType)
      : [...current, hookType];
    updateField('hookTypes', updated);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!formData.profileId) {
      toast.error('Please select a profile');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await analysesService.createAnalysis(formData);
      toast.success('Script submitted successfully!');
      navigate('/videographer/my-projects');
    } catch (error) {
      console.error('Failed to submit script:', error);
      toast.error('Failed to submit script');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={() => navigate('/videographer')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Submit Script</h1>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 px-4"
      >
        {/* Profile Selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Profile <span className="text-red-500">*</span>
          </label>
          {loadingProfiles ? (
            <div className="flex items-center gap-2 py-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading profiles...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile) => (
                <div key={profile.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => updateField('profileId', profile.id)}
                    className={`px-4 py-2 rounded-full font-medium text-xs transition-all active:scale-95 pr-7 ${
                      formData.profileId === profile.id
                        ? 'bg-videographer text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {profile.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProfile(profile.id, e)}
                    disabled={deletingProfileId === profile.id}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      formData.profileId === profile.id
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    {deletingProfileId === profile.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}

              {/* Add New Profile Button */}
              {!showAddProfile && (
                <button
                  type="button"
                  onClick={() => setShowAddProfile(true)}
                  className="px-4 py-2 rounded-full font-medium text-xs bg-gray-100 text-gray-700 border-2 border-dashed border-gray-300 hover:border-videographer hover:text-videographer transition-all active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add New
                </button>
              )}
            </div>
          )}

          {/* Inline Add Profile Form */}
          {showAddProfile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 flex gap-2"
            >
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name (e.g., BCH)"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-videographer focus:border-videographer"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProfile();
                  } else if (e.key === 'Escape') {
                    setShowAddProfile(false);
                    setNewProfileName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddProfile}
                disabled={addingProfile}
                className="px-4 py-2 bg-videographer text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center gap-1"
              >
                {addingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddProfile(false);
                  setNewProfileName('');
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Content ID will be auto-generated (e.g., BCH-1048)
          </p>
        </div>

        {/* Reference URL */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Reference Link
          </label>
          <input
            type="url"
            value={formData.referenceUrl}
            onChange={(e) => updateField('referenceUrl', e.target.value)}
            placeholder="Paste video link..."
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-videographer focus:border-videographer"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Give this content a title"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-videographer focus:border-videographer"
          />
        </div>

        {/* Shoot Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1.5">
            Shoot Type
          </label>
          <div className="flex gap-2">
            {SHOOT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField('shootType', type)}
                className={`px-4 py-2 rounded-full font-medium text-xs transition-all active:scale-95 ${
                  formData.shootType === type
                    ? 'bg-videographer text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {type === 'Indoor' ? '🏠' : '🌳'} {type}
              </button>
            ))}
          </div>
        </div>

        {/* Creator Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Creator Name
          </label>
          <input
            type="text"
            value={formData.creatorName}
            onChange={(e) => updateField('creatorName', e.target.value)}
            placeholder="@username or channel name"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-videographer focus:border-videographer"
          />
        </div>

        {/* Hook Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1.5">
            Hook Type <span className="text-gray-400 font-normal">(select all)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {HOOK_TYPES.map((type) => {
              const isSelected = (formData.hookTypes || []).includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleHookType(type)}
                  className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-videographer text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Works Without Audio */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1.5">
            Works Without Audio?
          </label>
          <div className="flex gap-2">
            {YES_NO_MAYBE.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => updateField('worksWithoutAudio', option)}
                className={`px-4 py-2 rounded-full font-medium text-xs transition-all active:scale-95 ${
                  formData.worksWithoutAudio === option
                    ? 'bg-videographer text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-videographer text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:bg-orange-600 disabled:opacity-50 mt-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Submit Script
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
