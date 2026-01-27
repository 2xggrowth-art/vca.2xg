import { forwardRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

// Design tokens
export const chipStyles = {
  base: 'px-4 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer select-none inline-flex items-center justify-center gap-1.5',
  selected: 'bg-blue-600 text-white border-blue-600 shadow-sm',
  unselected: 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-gray-50',
  add: 'bg-white text-blue-600 border-dashed border-blue-400 hover:bg-blue-50',
  disabled: 'opacity-50 cursor-not-allowed',
} as const;

export interface ChipProps {
  label: string;
  selected?: boolean;
  isAddButton?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ label, selected = false, isAddButton = false, disabled = false, onClick, className = '', size = 'md' }, ref) => {
    const getVariantStyles = () => {
      if (isAddButton) return chipStyles.add;
      if (selected) return chipStyles.selected;
      return chipStyles.unselected;
    };

    return (
      <button
        ref={ref}
        type="button"
        role={isAddButton ? 'button' : 'option'}
        aria-selected={!isAddButton ? selected : undefined}
        aria-pressed={isAddButton ? undefined : selected}
        disabled={disabled}
        onClick={onClick}
        className={`
          ${chipStyles.base}
          ${sizeStyles[size]}
          ${getVariantStyles()}
          ${disabled ? chipStyles.disabled : ''}
          ${className}
        `.trim()}
      >
        {isAddButton && <PlusIcon className="w-4 h-4" />}
        {label}
      </button>
    );
  }
);

Chip.displayName = 'Chip';

export default Chip;
