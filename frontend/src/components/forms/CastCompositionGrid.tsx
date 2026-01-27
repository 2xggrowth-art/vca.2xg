import { useId } from 'react';
import Counter from '../ui/Counter';
import ToggleButtonGroup from '../ui/ToggleButtonGroup';
import type { CastComposition } from '@/types';
import {
  DEFAULT_CAST_COMPOSITION,
  CastCategoryLabels,
} from '@/types';
import {
  CAST_PRESETS,
  CAST_PRESET_LABELS,
  calculateCastTotal,
  getCastSummary,
} from '@/services/castFilterService';

export interface CastCompositionGridProps {
  value: CastComposition;
  onChange: (cast: CastComposition) => void;
  showPresets?: boolean;
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  label?: string;
  hint?: string;
  maxPerCategory?: number;
  showOwnerToggle?: boolean;
  showSummary?: boolean;
  compact?: boolean;
}

const getColumnClass = (columns: 2 | 3 | 4): string => {
  const classes = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };
  return classes[columns];
};

// Categories grouped for display
const ADULT_CATEGORIES: Array<keyof Omit<CastComposition, 'total' | 'include_owner'>> = ['man', 'woman'];
const TEEN_CATEGORIES: Array<keyof Omit<CastComposition, 'total' | 'include_owner'>> = ['teen_boy', 'teen_girl'];
const CHILD_CATEGORIES: Array<keyof Omit<CastComposition, 'total' | 'include_owner'>> = ['boy', 'girl'];
const SENIOR_CATEGORIES: Array<keyof Omit<CastComposition, 'total' | 'include_owner'>> = ['senior_man', 'senior_woman'];

export default function CastCompositionGrid({
  value,
  onChange,
  showPresets = false,
  columns = 4,
  disabled = false,
  label,
  hint,
  maxPerCategory = 10,
  showOwnerToggle = true,
  showSummary = true,
  compact = false,
}: CastCompositionGridProps) {
  const labelId = useId();
  const hintId = useId();

  // Ensure value has all required fields
  const safeValue: CastComposition = {
    ...DEFAULT_CAST_COMPOSITION,
    ...value,
  };

  const handleCategoryChange = (category: keyof Omit<CastComposition, 'total' | 'include_owner'>, newValue: number) => {
    const updated = {
      ...safeValue,
      [category]: newValue,
    };
    // Recalculate total
    updated.total = calculateCastTotal(updated);
    onChange(updated);
  };

  const handleOwnerToggle = (include: boolean) => {
    onChange({
      ...safeValue,
      include_owner: include,
    });
  };

  const handlePresetClick = (presetKey: string) => {
    if (!disabled && CAST_PRESETS[presetKey]) {
      onChange(CAST_PRESETS[presetKey]);
    }
  };

  const isPresetActive = (presetKey: string): boolean => {
    const preset = CAST_PRESETS[presetKey];
    if (!preset) return false;

    return (
      safeValue.man === preset.man &&
      safeValue.woman === preset.woman &&
      safeValue.boy === preset.boy &&
      safeValue.girl === preset.girl &&
      safeValue.teen_boy === preset.teen_boy &&
      safeValue.teen_girl === preset.teen_girl &&
      safeValue.senior_man === preset.senior_man &&
      safeValue.senior_woman === preset.senior_woman &&
      safeValue.include_owner === preset.include_owner
    );
  };

  const renderCategoryCounter = (category: keyof Omit<CastComposition, 'total' | 'include_owner'>) => {
    return (
      <Counter
        key={category}
        label={CastCategoryLabels[category] || category}
        value={safeValue[category] as number}
        onChange={(newValue) => handleCategoryChange(category, newValue)}
        min={0}
        max={maxPerCategory}
        size={compact ? 'sm' : 'md'}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label
            id={labelId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
          <span className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-900">{safeValue.total}</span>
          </span>
        </div>
      )}

      {/* Hint */}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Presets */}
      {showPresets && (
        <div className="flex flex-wrap gap-2 pb-2">
          {Object.keys(CAST_PRESETS).map((presetKey) => (
            <button
              key={presetKey}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(presetKey)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full
                border transition-all
                ${isPresetActive(presetKey)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {CAST_PRESET_LABELS[presetKey]}
            </button>
          ))}
        </div>
      )}

      {/* Counter Grid - Adults */}
      <div
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={hint ? hintId : undefined}
      >
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Adults
        </div>
        <div className={`grid ${getColumnClass(columns)} gap-3`}>
          {ADULT_CATEGORIES.map(renderCategoryCounter)}
        </div>
      </div>

      {/* Counter Grid - Teens */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Teenagers
        </div>
        <div className={`grid ${getColumnClass(columns)} gap-3`}>
          {TEEN_CATEGORIES.map(renderCategoryCounter)}
        </div>
      </div>

      {/* Counter Grid - Children */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Children
        </div>
        <div className={`grid ${getColumnClass(columns)} gap-3`}>
          {CHILD_CATEGORIES.map(renderCategoryCounter)}
        </div>
      </div>

      {/* Counter Grid - Seniors */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Seniors
        </div>
        <div className={`grid ${getColumnClass(columns)} gap-3`}>
          {SENIOR_CATEGORIES.map(renderCategoryCounter)}
        </div>
      </div>

      {/* Owner Toggle */}
      {showOwnerToggle && (
        <div className="pt-2 border-t border-gray-100">
          <ToggleButtonGroup
            label="Include Owner (Syed Sir)"
            options={[
              { label: 'Yes', value: true },
              { label: 'No', value: false },
            ]}
            value={safeValue.include_owner}
            onChange={(val) => handleOwnerToggle(val as boolean)}
            disabled={disabled}
            size="sm"
          />
        </div>
      )}

      {/* Summary */}
      {showSummary && safeValue.total > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <span className="font-medium">Cast Summary: </span>
          {getCastSummary(safeValue)}
        </div>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { CastComposition };
export { DEFAULT_CAST_COMPOSITION };
