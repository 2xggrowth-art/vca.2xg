import { XMarkIcon } from '@heroicons/react/24/outline';
import type { CastFilter } from '@/types';

export interface ActiveCastFiltersProps {
  filters: CastFilter;
  onRemove: (key: keyof CastFilter) => void;
  onClearAll: () => void;
}

// Generate human-readable label for a filter
function getFilterLabel(key: keyof CastFilter, value: any): string {
  const labels: Record<string, (v: any) => string> = {
    minMen: (v) => `≥${v} Men`,
    maxMen: (v) => `≤${v} Men`,
    minWomen: (v) => `≥${v} Women`,
    maxWomen: (v) => `≤${v} Women`,
    minBoys: (v) => `≥${v} Boys`,
    maxBoys: (v) => `≤${v} Boys`,
    minGirls: (v) => `≥${v} Girls`,
    maxGirls: (v) => `≤${v} Girls`,
    needsChildren: () => 'Has Kids',
    needsSeniors: () => 'Has Seniors',
    needsTeens: () => 'Has Teens',
    ownerRequired: (v) => v ? 'With Owner' : 'No Owner',
    minTotal: (v) => `≥${v} Total`,
    maxTotal: (v) => `≤${v} Total`,
  };

  return labels[key]?.(value) || `${key}: ${value}`;
}

// Get chip color based on filter type
function getChipColor(key: keyof CastFilter): string {
  if (key.includes('Men') || key.includes('Women')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (key.includes('Boys') || key.includes('Girls') || key === 'needsChildren') {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (key.includes('Total')) {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  if (key === 'ownerRequired') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
  if (key === 'needsSeniors') {
    return 'bg-teal-100 text-teal-800 border-teal-200';
  }
  if (key === 'needsTeens') {
    return 'bg-pink-100 text-pink-800 border-pink-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export default function ActiveCastFilters({
  filters,
  onRemove,
  onClearAll,
}: ActiveCastFiltersProps) {
  // Get active filter entries
  const activeFilters = Object.entries(filters).filter(
    ([_, value]) => value !== undefined && value !== null
  ) as [keyof CastFilter, any][];

  // Combine min/max pairs for display
  const combinedFilters: { key: keyof CastFilter; label: string; removeKeys: (keyof CastFilter)[] }[] = [];
  const processed = new Set<string>();

  activeFilters.forEach(([key, value]) => {
    if (processed.has(key)) return;

    // Check for min/max pairs
    const baseKey = key.replace(/^(min|max)/, '');
    const minKey = `min${baseKey}` as keyof CastFilter;
    const maxKey = `max${baseKey}` as keyof CastFilter;

    if (key.startsWith('min') && filters[maxKey] !== undefined) {
      // Both min and max exist
      const minVal = filters[minKey];
      const maxVal = filters[maxKey];
      if (minVal === maxVal) {
        combinedFilters.push({
          key: minKey,
          label: `=${minVal} ${baseKey.replace(/([A-Z])/g, ' $1').trim()}`,
          removeKeys: [minKey, maxKey],
        });
      } else {
        combinedFilters.push({
          key: minKey,
          label: `${minVal}-${maxVal} ${baseKey.replace(/([A-Z])/g, ' $1').trim()}`,
          removeKeys: [minKey, maxKey],
        });
      }
      processed.add(minKey);
      processed.add(maxKey);
    } else if (!processed.has(key)) {
      // Single filter
      combinedFilters.push({
        key,
        label: getFilterLabel(key, value),
        removeKeys: [key],
      });
      processed.add(key);
    }
  });

  if (combinedFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Active:</span>

      {combinedFilters.map(({ key, label, removeKeys }) => (
        <span
          key={key}
          className={`
            inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border
            ${getChipColor(key)}
          `}
        >
          {label}
          <button
            type="button"
            onClick={() => removeKeys.forEach(k => onRemove(k))}
            className="p-0.5 hover:bg-black/10 rounded-full transition-colors"
            aria-label={`Remove ${label} filter`}
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </span>
      ))}

      {combinedFilters.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
