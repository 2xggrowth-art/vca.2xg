/**
 * Wizard Level 2 - Advanced Form (15 fields)
 *
 * Fields:
 * 1. In the first 6 seconds, what did your body do? - Multi-select
 * 2. Emotion in first 6 seconds - Dropdown
 * 3. Did this challenge a belief you had? - Dropdown (Yes/No)
 * 4. Emotional identity impact - Multi-select
 * 5. Did it suggest "if he can, why can't you?" - Dropdown (Yes/No)
 * 6. Did you feel like commenting? - Dropdown (Yes/No)
 * 7. Did you read the comments? - Dropdown (Yes/No)
 * 8. Sharing number on platform - Numeric field
 * 9. What action did the video want you to take? - Dropdown
 * 10. Industry (from DB)
 * 11. Profile/Admin (from DB)
 * 12. Hook Tags (multi-select from DB)
 * 13. Character Tags (multi-select from DB)
 * 14. Total People Involved
 * 15. Shoot Possibility (25%, 50%, 75%, 100%)
 */

import { useQuery } from '@tanstack/react-query';
import { contentConfigService } from '@/services/contentConfigService';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon,
  HeartIcon,
  FaceSmileIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import MultiSelectTags from '@/components/MultiSelectTags';
import type { AnalysisFormData } from '@/types';

interface WizardLevel2Props {
  formData: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// New dropdown/multi-select options
const BODY_REACTIONS = [
  'Breath held',
  'Leaned closer',
  'Eyebrows raised',
  'Smile',
  'Physical tension',
  'No reaction',
];

const EMOTIONS_FIRST_6_SEC = [
  'Shock',
  'Curiosity',
  'Fear',
  'Disbelief',
  'Amusement',
  'Neutral',
];

const YES_NO = ['Yes', 'No'];

const EMOTIONAL_IDENTITY_IMPACT = [
  'Inspired',
  'Inferior',
  'Motivated',
  'Embarrassed',
  'Neutral',
];

const VIDEO_ACTIONS = [
  'None',
  'Follow',
  'Learn more',
  'Buy',
  'Try it',
];

const SHOOT_POSSIBILITIES = [
  { value: 25, label: '25%', description: 'Low - Needs significant changes', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 50, label: '50%', description: 'Medium - Some adjustments needed', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 75, label: '75%', description: 'Good - Minor tweaks only', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 100, label: '100%', description: 'Ready - Can shoot as-is', color: 'bg-green-100 text-green-800 border-green-300' },
];

export default function WizardLevel2({ formData, onChange }: WizardLevel2Props) {
  // Fetch industries from DB
  const { data: industries = [], isLoading: industriesLoading } = useQuery({
    queryKey: ['industries'],
    queryFn: contentConfigService.getAllIndustries,
  });

  // Fetch profiles from DB
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profile-list'],
    queryFn: contentConfigService.getAllProfiles,
  });

  // Fetch hook tags from DB
  const { data: hookTags = [], isLoading: hookTagsLoading } = useQuery({
    queryKey: ['hook-tags'],
    queryFn: contentConfigService.getAllHookTags,
  });

  // Fetch character tags from DB
  const { data: characterTags = [], isLoading: characterTagsLoading } = useQuery({
    queryKey: ['character-tags'],
    queryFn: contentConfigService.getAllCharacterTags,
  });

  const isLoading = industriesLoading || profilesLoading || hookTagsLoading || characterTagsLoading;

  // Helper to toggle multi-select values
  const toggleMultiSelect = (field: keyof AnalysisFormData, value: string) => {
    const currentValues = (formData[field] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
    onChange({ [field]: newValues });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <HeartIcon className="w-4 h-4 mr-2 text-purple-600" />
          Advanced Analysis
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Analyze your emotional and physical reactions to the content
        </p>
      </div>

      {/* 1. Body Reactions (Multi-select) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FaceSmileIcon className="w-4 h-4 inline mr-1 text-gray-500" />
          In the first 6 seconds, what did your body do?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BODY_REACTIONS.map((reaction) => {
            const isSelected = (formData.bodyReactions || []).includes(reaction);
            return (
              <button
                key={reaction}
                type="button"
                onClick={() => toggleMultiSelect('bodyReactions', reaction)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-purple-100 border-purple-600 text-purple-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {reaction}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Emotion in first 6 seconds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Emotion in first 6 seconds
        </label>
        <select
          value={formData.emotionFirst6Sec || ''}
          onChange={(e) => onChange({ emotionFirst6Sec: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
        >
          <option value="">Select emotion...</option>
          {EMOTIONS_FIRST_6_SEC.map((emotion) => (
            <option key={emotion} value={emotion}>
              {emotion}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Did this challenge a belief? & 4. If he can, why can't you? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Did this challenge a belief you had?
          </label>
          <select
            value={formData.challengedBelief || ''}
            onChange={(e) => onChange({ challengedBelief: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select...</option>
            {YES_NO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Did it suggest "if he can, why can't you?"
          </label>
          <select
            value={formData.ifHeCanWhyCantYou || ''}
            onChange={(e) => onChange({ ifHeCanWhyCantYou: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select...</option>
            {YES_NO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Emotional Identity Impact (Multi-select) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emotional identity impact
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {EMOTIONAL_IDENTITY_IMPACT.map((impact) => {
            const isSelected = (formData.emotionalIdentityImpact || []).includes(impact);
            return (
              <button
                key={impact}
                type="button"
                onClick={() => toggleMultiSelect('emotionalIdentityImpact', impact)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-pink-100 border-pink-600 text-pink-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {impact}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Feel like commenting & 7. Read the comments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Did you feel like commenting?
          </label>
          <select
            value={formData.feelLikeCommenting || ''}
            onChange={(e) => onChange({ feelLikeCommenting: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select...</option>
            {YES_NO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Did you read the comments?
          </label>
          <select
            value={formData.readComments || ''}
            onChange={(e) => onChange({ readComments: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select...</option>
            {YES_NO.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 8. Sharing number & 9. Video action */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <ShareIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Sharing number on platform
          </label>
          <input
            type="number"
            min="0"
            value={formData.sharingNumber || ''}
            onChange={(e) => onChange({ sharingNumber: parseInt(e.target.value) || 0 })}
            placeholder="Enter number of shares"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <CursorArrowRaysIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            What action did the video want you to take?
          </label>
          <select
            value={formData.videoAction || ''}
            onChange={(e) => onChange({ videoAction: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select action...</option>
            {VIDEO_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Section Header - Production Details */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <BuildingOfficeIcon className="w-4 h-4 mr-2 text-blue-600" />
          Production Details
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Categorization and production requirements
        </p>
      </div>

      {/* 10. Industry & 11. Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <BuildingOfficeIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Industry
          </label>
          <select
            value={formData.industryId}
            onChange={(e) => onChange({ industryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select industry...</option>
            {industries
              .filter((i) => i.is_active)
              .map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name} ({industry.short_code})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <UserGroupIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Profile / Admin
          </label>
          <select
            value={formData.profileId}
            onChange={(e) => onChange({ profileId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select profile...</option>
            {profiles
              .filter((p) => p.is_active)
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 12. Hook Tags */}
      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
        <MultiSelectTags
          label="Hook Tags"
          options={hookTags.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name }))}
          selectedIds={formData.hookTagIds || []}
          onChange={(ids) => onChange({ hookTagIds: ids })}
          placeholder="Select hook types..."
          allowCreate={true}
          onAddCustomTag={(tagName) => {
            console.log('Custom hook tag added:', tagName);
          }}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Select hook types or type and press Enter to create custom tags
        </p>
      </div>

      {/* 13. Character Tags */}
      <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
        <MultiSelectTags
          label="Character Tags"
          options={characterTags.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name }))}
          selectedIds={formData.characterTagIds || []}
          onChange={(ids) => onChange({ characterTagIds: ids })}
          placeholder="Select characters..."
          allowCreate={true}
          onAddCustomTag={(tagName) => {
            console.log('Custom character tag added:', tagName);
          }}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Who will appear in the video? Type and press Enter to add custom characters
        </p>
      </div>

      {/* 14. Total People & 15. Shoot Possibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <UsersIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Total People Involved
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={formData.totalPeopleInvolved || 1}
            onChange={(e) => onChange({ totalPeopleInvolved: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            How many people will be needed for the shoot?
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ChartBarIcon className="w-4 h-4 inline mr-1 text-gray-500" />
            Shoot Possibility
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SHOOT_POSSIBILITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ shootPossibility: option.value as 25 | 50 | 75 | 100 })}
                className={`px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${
                  formData.shootPossibility === option.value
                    ? `${option.color} ring-2 ring-offset-1 ring-primary-400`
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-bold">{option.label}</div>
                <div className="text-xs mt-0.5 opacity-75">{option.description.split(' - ')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
