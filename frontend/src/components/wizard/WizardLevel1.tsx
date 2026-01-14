/**
 * Wizard Level 1 - Easy (Basic Information)
 *
 * Fields:
 * 1. Reference Link - URL
 * 2. Platform - DD (Instagram / YouTube long)
 * 3. Type of Content - DD (Challenge / Transformation / Education / Entertainment / POV / Review)
 * 4. Shoot type of Content - DD (in store, outside store)
 * 5. Select the characters involved in the content?
 * 6. Creator name - tag option
 * 7. What was unusual in the first 3 seconds? - DD Visual, Audio, Text, SFX, Nothing unusual
 * 8. Hook Text in first 6 seconds - Text box (short)
 * 9. Turn off audio - would this still work? - DD (Yes / No / Maybe)
 * 10. From 1 to 10 rate this content?
 * 11. From 1 to 10 how strongly can we replicate it?
 */

import { LinkIcon, SparklesIcon, FireIcon, StarIcon } from '@heroicons/react/24/outline';
import type { AnalysisFormData } from '@/types';

interface WizardLevel1Props {
  formData: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Dropdown options
const PLATFORMS = ['Instagram', 'YouTube Long', 'YouTube Shorts', 'TikTok', 'Facebook'];

const CONTENT_TYPES = [
  'Challenge',
  'Transformation',
  'Education',
  'Entertainment',
  'POV',
  'Review',
  'Tutorial',
  'Behind the Scenes',
  'Story Time',
];

const SHOOT_TYPES = [
  'In Store',
  'Outside Store',
  'Home/Indoor',
  'Outdoor',
  'Office',
  'Studio',
  'On Location',
];

const UNUSUAL_ELEMENTS = [
  'Visual',
  'Audio',
  'Text',
  'SFX',
  'Nothing unusual',
  'Camera angle',
  'Lighting',
  'Editing technique',
];

const YES_NO_MAYBE = ['Yes', 'No', 'Maybe'];

export default function WizardLevel1({ formData, onChange }: WizardLevel1Props) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <SparklesIcon className="w-4 h-4 mr-2 text-blue-600" />
          Basic Information
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">
          Start with the essentials - the reference video and content details
        </p>
      </div>

      {/* 1. Reference Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <LinkIcon className="w-4 h-4 inline mr-1 text-gray-500" />
          Reference Link
        </label>
        <input
          type="url"
          value={formData.referenceUrl}
          onChange={(e) => onChange({ referenceUrl: e.target.value })}
          placeholder="https://www.instagram.com/reel/..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 2. Platform & 3. Type of Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Platform
          </label>
          <select
            value={formData.platform || ''}
            onChange={(e) => onChange({ platform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select platform...</option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type of Content
          </label>
          <select
            value={formData.contentType || ''}
            onChange={(e) => onChange({ contentType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
          >
            <option value="">Select type...</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Shoot Type of Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Shoot Type of Content
        </label>
        <select
          value={formData.shootType || ''}
          onChange={(e) => onChange({ shootType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
        >
          <option value="">Select shoot type...</option>
          {SHOOT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Characters Involved */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Select the characters involved in the content?
        </label>
        <input
          type="text"
          value={formData.charactersInvolved || ''}
          onChange={(e) => onChange({ charactersInvolved: e.target.value })}
          placeholder="e.g., 1 presenter, 2 customers, background crowd"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 6. Creator Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Creator Name
        </label>
        <input
          type="text"
          value={formData.creatorName || ''}
          onChange={(e) => onChange({ creatorName: e.target.value })}
          placeholder="@username or creator name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 7. What was unusual in first 3 seconds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          What was unusual in the first 3 seconds?
        </label>
        <select
          value={formData.unusualElement || ''}
          onChange={(e) => onChange({ unusualElement: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
        >
          <option value="">Select unusual element...</option>
          {UNUSUAL_ELEMENTS.map((element) => (
            <option key={element} value={element}>
              {element}
            </option>
          ))}
        </select>
      </div>

      {/* 8. Hook Text in first 6 seconds */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <FireIcon className="w-4 h-4 inline mr-1 text-orange-500" />
          Hook Text in first 6 seconds
        </label>
        <input
          type="text"
          value={formData.hook}
          onChange={(e) => onChange({ hook: e.target.value })}
          placeholder="e.g., POV: You just discovered..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 9. Turn off audio - would this still work? */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Turn off audio - would this still work?
        </label>
        <select
          value={formData.worksWithoutAudio || ''}
          onChange={(e) => onChange({ worksWithoutAudio: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
        >
          <option value="">Select...</option>
          {YES_NO_MAYBE.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* 10. Rate this content (1-10) & 11. How strongly can we replicate (1-10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <StarIcon className="w-4 h-4 inline mr-1 text-yellow-500" />
            Rate this content (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.contentRating || ''}
            onChange={(e) => onChange({ contentRating: parseInt(e.target.value) || 0 })}
            placeholder="1-10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <StarIcon className="w-4 h-4 inline mr-1 text-green-500" />
            How strongly can we replicate? (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.replicationStrength || ''}
            onChange={(e) => onChange({ replicationStrength: parseInt(e.target.value) || 0 })}
            placeholder="1-10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
          />
        </div>
      </div>
    </div>
  );
}
