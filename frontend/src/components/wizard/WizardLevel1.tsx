/**
 * Wizard Level 1 - Simplified Script Writer
 *
 * Fields:
 * 1. Reference Link - URL
 * 2. Title - Content title
 * 3. Shoot type - Indoor / Outdoor (chip selection)
 * 4. Creator name
 * 5. Hook Type (multi-select chip selection)
 * 6. Works without audio - Yes/No/Maybe (chip selection)
 */

import { LinkIcon, UserIcon, FilmIcon } from '@heroicons/react/24/outline';
import type { AnalysisFormData } from '@/types';

interface WizardLevel1Props {
  formData: AnalysisFormData;
  onChange: (updates: Partial<AnalysisFormData>) => void;
}

// Chip selection options
const SHOOT_TYPES = ['Indoor', 'Outdoor'];

const HOOK_TYPES = [
  'Visual Hook',
  'Audio Hook',
  'SFX Hook',
  'Onscreen Hook',
];

const YES_NO_MAYBE = ['Yes', 'No', 'Maybe'];

export default function WizardLevel1({ formData, onChange }: WizardLevel1Props) {
  return (
    <div className="space-y-5">
      {/* 1. Video Link - Required */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-2">
          <LinkIcon className="w-5 h-5 inline mr-2 text-primary-600" />
          Reference Link <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={formData.referenceUrl}
          onChange={(e) => onChange({ referenceUrl: e.target.value })}
          placeholder="Paste Instagram, TikTok, or YouTube link"
          className="w-full px-4 py-3.5 min-h-[52px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base"
        />
        <p className="mt-1.5 text-sm text-gray-500">Example: https://www.instagram.com/reel/...</p>
      </div>

      {/* 2. Title - New field after Reference URL */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-2">
          <FilmIcon className="w-5 h-5 inline mr-2 text-primary-600" />
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Give this content a title"
          className="w-full px-4 py-3.5 min-h-[52px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base"
        />
        <p className="mt-1.5 text-sm text-gray-500">A short, descriptive title for easy reference</p>
      </div>

      {/* 3. Shoot Type - Chip Selection */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-3">
          Shoot Type
        </label>
        <div className="flex flex-wrap gap-3">
          {SHOOT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ shootType: type })}
              className={`px-5 py-3 min-h-[48px] rounded-full font-medium transition-all text-base ${
                formData.shootType === type
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Creator Name */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-2">
          <UserIcon className="w-5 h-5 inline mr-2 text-gray-600" />
          Creator Name
        </label>
        <input
          type="text"
          value={formData.creatorName || ''}
          onChange={(e) => onChange({ creatorName: e.target.value })}
          placeholder="E.g., @johndoe or John's Vlogs"
          className="w-full px-4 py-3.5 min-h-[52px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition text-base"
        />
      </div>

      {/* 5. Hook Type - Multi-Select Chips */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-3">
          Hook Type <span className="text-sm font-normal text-gray-500">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {HOOK_TYPES.map((type) => {
            const isSelected = (formData.hookTypes || []).includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  const current = formData.hookTypes || [];
                  const updated = isSelected
                    ? current.filter((t) => t !== type)
                    : [...current, type];
                  onChange({ hookTypes: updated });
                }}
                className={`px-5 py-3 min-h-[48px] rounded-full font-medium transition-all text-base ${
                  isSelected
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-gray-500">What makes you stop scrolling in the first 3 seconds?</p>
      </div>

      {/* 6. Works without sound? - Chip Selection */}
      <div>
        <label className="block text-base font-semibold text-gray-900 mb-3">
          Works Without Audio?
        </label>
        <div className="flex flex-wrap gap-3">
          {YES_NO_MAYBE.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ worksWithoutAudio: option })}
              className={`px-5 py-3 min-h-[48px] rounded-full font-medium transition-all text-base ${
                formData.worksWithoutAudio === option
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500">Can you understand the video without audio?</p>
      </div>
    </div>
  );
}
