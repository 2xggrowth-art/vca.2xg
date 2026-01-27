import { useId } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export interface CounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  hint?: string;
}

const sizeConfig = {
  sm: {
    container: 'p-2',
    button: 'w-6 h-6',
    icon: 'w-3 h-3',
    value: 'text-lg',
    label: 'text-xs',
  },
  md: {
    container: 'p-3',
    button: 'w-8 h-8',
    icon: 'w-4 h-4',
    value: 'text-xl',
    label: 'text-sm',
  },
  lg: {
    container: 'p-4',
    button: 'w-10 h-10',
    icon: 'w-5 h-5',
    value: 'text-2xl',
    label: 'text-base',
  },
};

export default function Counter({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  disabled = false,
  hint,
}: CounterProps) {
  const labelId = useId();
  const config = sizeConfig[size];

  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(value + 1);
    }
  };

  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  return (
    <div
      className={`flex flex-col items-center bg-gray-50 rounded-xl border border-gray-200 ${config.container} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {/* Label */}
      <span
        id={labelId}
        className={`${config.label} text-gray-600 font-medium mb-2 text-center`}
      >
        {label}
      </span>

      {/* Counter Controls */}
      <div className="flex items-center gap-3">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label={`Decrease ${label}`}
          className={`
            ${config.button}
            rounded-full bg-white border border-gray-300
            flex items-center justify-center
            transition-all
            ${canDecrement
              ? 'text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <MinusIcon className={config.icon} />
        </button>

        {/* Value Display */}
        <span
          aria-labelledby={labelId}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          role="spinbutton"
          className={`${config.value} font-bold text-gray-900 min-w-[2ch] text-center tabular-nums`}
        >
          {value}
        </span>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label={`Increase ${label}`}
          className={`
            ${config.button}
            rounded-full bg-white border border-gray-300
            flex items-center justify-center
            transition-all
            ${canIncrement
              ? 'text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <PlusIcon className={config.icon} />
        </button>
      </div>

      {/* Hint */}
      {hint && (
        <span className="text-xs text-gray-400 mt-2 text-center">
          {hint}
        </span>
      )}
    </div>
  );
}
