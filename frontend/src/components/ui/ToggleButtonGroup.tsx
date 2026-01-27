import { useId } from 'react';

export interface ToggleOption {
  label: string;
  value: string | boolean;
}

export interface ToggleButtonGroupProps {
  label?: string;
  options: ToggleOption[];
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  required?: boolean;
  hint?: string;
  fullWidth?: boolean;
}

const sizeConfig = {
  sm: {
    button: 'px-3 py-1.5 text-xs',
    container: 'p-0.5',
  },
  md: {
    button: 'px-4 py-2 text-sm',
    container: 'p-1',
  },
};

export default function ToggleButtonGroup({
  label,
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  required = false,
  hint,
  fullWidth = false,
}: ToggleButtonGroupProps) {
  const labelId = useId();
  const hintId = useId();
  const config = sizeConfig[size];

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
        </label>
      )}

      {/* Hint */}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Toggle Group */}
      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={hint ? hintId : undefined}
        className={`
          inline-flex ${fullWidth ? 'w-full' : ''}
          bg-gray-100 rounded-lg
          ${config.container}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onChange(option.value);
                }
              }}
              className={`
                ${config.button}
                ${fullWidth ? 'flex-1' : ''}
                font-medium rounded-md
                transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                ${isSelected
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
