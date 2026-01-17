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
      {/* Section Header - Friendly & Clear */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
          <SparklesIcon className="w-5 h-5 mr-2 text-blue-600" />
          Let's start simple!
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Tell us about the video you want to analyze. Don't worry, this is easy! 😊
        </p>
      </div>

      {/* 1. Video Link - Required */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          <LinkIcon className="w-5 h-5 inline mr-1.5 text-primary-600" />
          Where's the video? <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={formData.referenceUrl}
          onChange={(e) => onChange({ referenceUrl: e.target.value })}
          placeholder="Paste Instagram, TikTok, or YouTube link here"
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm md:text-base"
        />
        <p className="mt-1 text-xs md:text-sm text-gray-500">Example: https://www.instagram.com/reel/...</p>
      </div>

      {/* 2. Shoot Type - Simple Choice */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          Was it filmed indoors or outdoors?
        </label>
        <select
          value={formData.shootType || ''}
          onChange={(e) => onChange({ shootType: e.target.value })}
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white text-sm md:text-base"
        >
          <option value="">Choose one...</option>
          {SHOOT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* 3. People in Video */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          Who's in the video?
        </label>
        <input
          type="text"
          value={formData.charactersInvolved || ''}
          onChange={(e) => onChange({ charactersInvolved: e.target.value })}
          placeholder="E.g., 1 person talking, 2 friends dancing, a family"
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm md:text-base"
        />
        <p className="mt-1 text-xs md:text-sm text-gray-500">Just describe who appears in the video</p>
      </div>

      {/* 4. Creator Name */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          Who made this video?
        </label>
        <input
          type="text"
          value={formData.creatorName || ''}
          onChange={(e) => onChange({ creatorName: e.target.value })}
          placeholder="E.g., @johndoe or John's Vlogs"
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm md:text-base"
        />
      </div>

      {/* 5. Hook Type - What grabs attention */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          How does it grab your attention?
        </label>
        <select
          value={formData.unusualElement || ''}
          onChange={(e) => onChange({ unusualElement: e.target.value })}
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition bg-white text-sm md:text-base"
        >
          <option value="">Pick what makes you stop scrolling...</option>
          {HOOK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs md:text-sm text-gray-500">What makes you want to watch in the first 3 seconds?</p>
      </div>

      {/* 6. Hook Text - First words */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          <FireIcon className="w-5 h-5 inline mr-1.5 text-orange-500" />
          What are the first words you hear? <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.hook}
          onChange={(e) => onChange({ hook: e.target.value })}
          placeholder="E.g., POV: You just won the lottery..."
          className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-sm md:text-base"
        />
        <p className="mt-1 text-xs md:text-sm text-gray-500">The opening line or text in the first 6 seconds</p>
      </div>

      {/* 7. Works without sound? */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          Would this work on mute? 🔇
        </label>
        <div className="grid grid-cols-3 gap-3">
          {YES_NO_MAYBE.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ worksWithoutAudio: option })}
              className={`px-4 py-3 min-h-[48px] border-2 rounded-lg font-medium transition text-sm md:text-base ${
                formData.worksWithoutAudio === option
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs md:text-sm text-gray-500">Can you understand the video without audio?</p>
      </div>

      {/* 8. How easy to recreate */}
      <div>
        <label className="block text-sm md:text-base font-medium text-gray-900 mb-2">
          <StarIcon className="w-5 h-5 inline mr-1.5 text-green-500" />
          How easy is it to recreate? (1 = very hard, 10 = super easy)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="10"
            value={formData.replicationStrength || 5}
            onChange={(e) => onChange({ replicationStrength: parseInt(e.target.value) })}
            className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <span className="text-2xl font-bold text-primary-600 min-w-[3rem] text-center">
            {formData.replicationStrength || 5}
          </span>
        </div>
        <p className="mt-2 text-xs md:text-sm text-gray-500">Can we make something similar easily?</p>
      </div>
    </div>
  );
}
