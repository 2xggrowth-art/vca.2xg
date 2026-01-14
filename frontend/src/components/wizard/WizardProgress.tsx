/**
 * Wizard Progress Indicator
 * Shows the current step in the 3-level analysis wizard
 */

import { CheckIcon } from '@heroicons/react/24/solid';

interface WizardProgressProps {
  currentLevel: 1 | 2 | 3;
  onLevelClick?: (level: 1 | 2 | 3) => void;
}

const levels = [
  { number: 1, title: 'Easy', description: 'Basic Info' },
  { number: 2, title: 'Advanced', description: 'Details & Tags' },
  { number: 3, title: 'Hook Study', description: 'Final Details' },
] as const;

export default function WizardProgress({ currentLevel, onLevelClick }: WizardProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-4">
      <ol className="flex items-center justify-between">
        {levels.map((level, index) => {
          const isCompleted = currentLevel > level.number;
          const isCurrent = currentLevel === level.number;
          const isClickable = onLevelClick && level.number <= currentLevel;

          return (
            <li key={level.number} className="flex-1 relative">
              {/* Connector line */}
              {index < levels.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    currentLevel > level.number ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                  style={{ transform: 'translateX(50%)' }}
                />
              )}

              <button
                type="button"
                onClick={() => isClickable && onLevelClick(level.number as 1 | 2 | 3)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center group ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Circle indicator */}
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : isCurrent
                      ? 'bg-white border-primary-600 text-primary-600'
                      : 'bg-white border-gray-300 text-gray-400'
                  } ${isClickable ? 'group-hover:shadow-md' : ''}`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-semibold">{level.number}</span>
                  )}
                </span>

                {/* Labels */}
                <span
                  className={`mt-1.5 text-xs font-semibold ${
                    isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {level.title}
                </span>
                <span
                  className={`text-xs ${
                    isCurrent ? 'text-primary-500' : 'text-gray-400'
                  }`}
                >
                  {level.description}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
