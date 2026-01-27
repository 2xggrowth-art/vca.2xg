import { useState, useRef, useEffect } from 'react';
import {
  UserGroupIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type { CastFilter } from '@/types';

export interface CastFilterDropdownProps {
  filters: CastFilter;
  onChange: (filters: CastFilter) => void;
  matchCount?: number;
  disabled?: boolean;
}

// Quick preset definitions - these are the only filters
const QUICK_PRESETS: { id: string; label: string; filter: Partial<CastFilter> }[] = [
  { id: 'solo', label: 'Solo', filter: { maxTotal: 1 } },
  { id: 'small', label: '≤3 People', filter: { maxTotal: 3 } },
  { id: 'kids', label: 'Has Kids', filter: { needsChildren: true } },
  { id: 'seniors', label: 'Has Seniors', filter: { needsSeniors: true } },
  { id: 'teens', label: 'Has Teens', filter: { needsTeens: true } },
  { id: 'with-owner', label: 'With Owner', filter: { ownerRequired: true } },
  { id: 'no-owner', label: 'No Owner', filter: { ownerRequired: false } },
];

export default function CastFilterDropdown({
  filters,
  onChange,
  matchCount,
  disabled = false,
}: CastFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== null);

  // Check if a preset is currently active
  const isPresetActive = (preset: typeof QUICK_PRESETS[0]): boolean => {
    return Object.entries(preset.filter).every(
      ([key, value]) => filters[key as keyof CastFilter] === value
    );
  };

  // Toggle a preset on/off
  const togglePreset = (preset: typeof QUICK_PRESETS[0]) => {
    if (isPresetActive(preset)) {
      // Remove this preset's keys
      const newFilters = { ...filters };
      Object.keys(preset.filter).forEach(key => {
        delete newFilters[key as keyof CastFilter];
      });
      onChange(newFilters);
    } else {
      // Apply this preset (merge with existing)
      onChange({ ...filters, ...preset.filter });
    }
  };

  const clearAll = () => onChange({});

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium rounded-lg border transition-all
          ${hasActiveFilters
            ? 'bg-primary-50 border-primary-300 text-primary-700'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <UserGroupIcon className="w-4 h-4" />
        <span>Cast</span>
        {hasActiveFilters && (
          <span className="flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs rounded-full">
            {Object.values(filters).filter(v => v !== undefined && v !== null).length}
          </span>
        )}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Simple Dropdown - Just Preset Chips */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Filter by Cast</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => togglePreset(preset)}
                  className={`
                    px-3 py-2 min-h-[36px] text-sm font-medium rounded-full border transition-all
                    ${isPresetActive(preset)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary-300'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {matchCount !== undefined && (
              <p className="mt-2 text-xs text-gray-500">{matchCount} projects match</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
