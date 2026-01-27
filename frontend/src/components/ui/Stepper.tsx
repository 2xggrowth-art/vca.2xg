import { useId } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hint?: string;
  showValue?: boolean;
  required?: boolean;
}

export default function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  hint,
  showValue = true,
  required = false,
}: StepperProps) {
  const labelId = useId();
  const hintId = useId();

  const handleDecrement = () => {
    if (!disabled && value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (!disabled && value + step <= max) {
      onChange(value + step);
    }
  };

  const canDecrement = value - step >= min && !disabled;
  const canIncrement = value + step <= max && !disabled;

  return (
    <div className="space-y-2">
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label
          id={labelId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {showValue && (
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {value}
          </span>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Stepper Controls */}
      <div
        role="spinbutton"
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className={`
          flex items-center justify-between
          bg-gray-50 rounded-xl border border-gray-200
          p-1
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label={`Decrease ${label}`}
          className={`
            w-12 h-12
            rounded-lg
            flex items-center justify-center
            transition-all
            ${canDecrement
              ? 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <MinusIcon className="w-5 h-5" />
        </button>

        {/* Value Display */}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 tabular-nums">
            {value}
          </span>
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label={`Increase ${label}`}
          className={`
            w-12 h-12
            rounded-lg
            flex items-center justify-center
            transition-all
            ${canIncrement
              ? 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
