import { useId } from 'react';
import Chip from './Chip';

export interface ChipSelectProps {
  label: string;
  required?: boolean;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  onAdd?: () => void;
  hint?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ChipSelect({
  label,
  required = false,
  options,
  value,
  onChange,
  onAdd,
  hint,
  disabled = false,
  size = 'md',
}: ChipSelectProps) {
  const labelId = useId();
  const hintId = useId();

  return (
    <div className="space-y-2">
      {/* Label */}
      <label
        id={labelId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Hint */}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Chips */}
      <div
        role="listbox"
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        aria-required={required}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={value === option}
            disabled={disabled}
            size={size}
            onClick={() => {
              if (!disabled) {
                onChange(option);
              }
            }}
          />
        ))}

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
