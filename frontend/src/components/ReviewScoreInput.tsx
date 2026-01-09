import { useState } from 'react';

interface ReviewScoreInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function ReviewScoreInput({
  label,
  description,
  value,
  onChange,
  min = 1,
  max = 10,
}: ReviewScoreInputProps) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-900">{label}</label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center space-x-2">
        {scores.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            onMouseEnter={() => setHoveredScore(score)}
            onMouseLeave={() => setHoveredScore(null)}
            className={`
              w-10 h-10 rounded-lg font-semibold transition-all
              ${
                score <= (hoveredScore || value)
                  ? score <= 3
                    ? 'bg-red-500 text-white'
                    : score <= 6
                    ? 'bg-yellow-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }
              ${score === value ? 'ring-2 ring-offset-2 ring-primary-500' : ''}
            `}
          >
            {score}
          </button>
        ))}
        <div className="ml-4 text-2xl font-bold text-gray-900">
          {value}/{max}
        </div>
      </div>
    </div>
  );
}
