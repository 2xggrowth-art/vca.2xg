import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface BulkAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
  // If true, shows a dropdown instead of button
  hasDropdown?: boolean;
  dropdownContent?: ReactNode;
}

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: BulkAction[];
  // Whether all visible items are selected
  allSelected?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  actions,
  allSelected = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  const getButtonClasses = (variant: BulkAction['variant'] = 'default') => {
    const base =
      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    switch (variant) {
      case 'success':
        return `${base} bg-green-600 text-white hover:bg-green-700 disabled:hover:bg-green-600`;
      case 'danger':
        return `${base} bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600`;
      case 'warning':
        return `${base} bg-amber-500 text-white hover:bg-amber-600 disabled:hover:bg-amber-500`;
      default:
        return `${base} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white`;
    }
  };

  return (
    <div className="bg-primary-50 border-b border-primary-200 px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Selection info and actions */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Select All / Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-primary-900">
              {selectedCount} of {totalCount} selected
            </span>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-primary-300 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                className={getButtonClasses(action.variant)}
              >
                {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Deselect all */}
        <button
          onClick={onDeselectAll}
          className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-900 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Clear selection</span>
        </button>
      </div>
    </div>
  );
}
