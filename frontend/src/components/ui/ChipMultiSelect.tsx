import { useId } from 'react';
import Chip from './Chip';

// Support both simple strings and objects with id/label
type ChipOption = string | { id: string; label: string };

export interface ChipMultiSelectProps {
  label?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options: ChipOption[];
  // Support both patterns: selected (for strings) or selectedIds (for objects)
  selected?: string[];
  selectedIds?: string[];
  onChange: (selected: string[]) => void;
  onAdd?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxSelections?: number;
}

// Helper to normalize options
const getOptionId = (option: ChipOption): string => {
  return typeof option === 'string' ? option : option.id;
};

const getOptionLabel = (option: ChipOption): string => {
  return typeof option === 'string' ? option : option.label;
};

export default function ChipMultiSelect({
  label,
  required = false,
  hint,
  placeholder,
  options,
  selected,
  selectedIds,
  onChange,
  onAdd,
  disabled = false,
  size = 'md',
  maxSelections,
}: ChipMultiSelectProps) {
  const labelId = useId();
  const hintId = useId();

  // Use selectedIds if provided, otherwise fall back to selected, then empty array
  const selectedValues = selectedIds ?? selected ?? [];

  const handleToggle = (optionId: string) => {
    if (disabled) return;

    if (selectedValues.includes(optionId)) {
      // Remove from selection
      onChange(selectedValues.filter((item) => item !== optionId));
    } else {
      // Add to selection (check max limit)
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't add if at max
      }
      onChange([...selectedValues, optionId]);
    }
  };

  const isAtMax = maxSelections ? selectedValues.length >= maxSelections : false;
  const hasSelections = selectedValues.length > 0;

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          id={labelId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {maxSelections && (
            <span className="text-gray-400 font-normal ml-2">
              ({selectedValues.length}/{maxSelections})
            </span>
          )}
        </label>
      )}

      {/* Hint */}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Chips */}
      <div
        role="listbox"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={hint ? hintId : undefined}
        aria-required={required}
        aria-multiselectable="true"
        className="flex flex-wrap gap-2"
      >
        {options.length === 0 && placeholder && !hasSelections && (
          <span className="text-sm text-gray-400 py-2">{placeholder}</span>
        )}

        {options.map((option) => {
          const optionId = getOptionId(option);
          const optionLabel = getOptionLabel(option);
          const isSelected = selectedValues.includes(optionId);
          const isDisabledByMax = !isSelected && isAtMax;

          return (
            <Chip
              key={optionId}
              label={optionLabel}
              selected={isSelected}
              disabled={disabled || isDisabledByMax}
              size={size}
              onClick={() => handleToggle(optionId)}
            />
          );
        })}

        {/* Add New Button */}
        {onAdd && (
          <Chip
            label="Add New"
            isAddButton
            disabled={disabled}
            size={size}
            onClick={onAdd}
          />
        )}
      </div>
    </div>
  );
}
