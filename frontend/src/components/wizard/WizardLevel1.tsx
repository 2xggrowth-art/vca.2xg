/**
 * Wizard Level 1 - Easy (Basic Information)
 *
 * Fields:
 * 1. Reference Link - URL
 * 2. Shoot type - Indoor / Outdoor
 * 3. People involved
 * 4. Creator name
 * 5. Hook Type
 * 6. Hook Text
 * 7. Turn off audio - would this still work?
 * 8. Rate of duplication (1-10)
 */

import { LinkIcon, SparklesIcon, FireIcon, StarIcon } from '@heroicons/react/24/outline';
import type { AnalysisFormData } from '@/types';

interface WizardLevel1Props {
  formData: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Dropdown options
const SHOOT_TYPES = ['Indoor', 'Outdoor'];

const HOOK_TYPES = [
  'Question',
  'Statement',
  'POV',
  'Challenge',
  'Shocking Fact',
  'Story Opening',
  'Direct Address',
  'Visual Hook',
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

      {/* 2. Shoot Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Shoot Type
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

      {/* 3. People Involved */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          People Involved
        </label>
        <input
          type="text"
          value={formData.charactersInvolved || ''}
          onChange={(e) => onChange({ charactersInvolved: e.target.value })}
          placeholder="e.g., 1 presenter, 2 customers, background crowd"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 4. Creator Name */}
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

      {/* 5. Hook Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Hook Type
        </label>
        <select
          value={formData.unusualElement || ''}
          onChange={(e) => onChange({ unusualElement: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white text-sm"
        >
          <option value="">Select hook type...</option>
          {HOOK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* 6. Hook Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <FireIcon className="w-4 h-4 inline mr-1 text-orange-500" />
          Hook Text
        </label>
        <input
          type="text"
          value={formData.hook}
          onChange={(e) => onChange({ hook: e.target.value })}
          placeholder="e.g., POV: You just discovered..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* 7. Turn off audio - would this still work? */}
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

      {/* 8. Rate of Duplication (1-10) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <StarIcon className="w-4 h-4 inline mr-1 text-green-500" />
          Rate of Duplication (1-10)
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
  );
}
