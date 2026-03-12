import type { ComparisonState } from '../lib/types';
import { getBarColor } from '../lib/colors';

interface Props {
  comparison: ComparisonState;
  className?: string;
}

export function CostComparison({ comparison, className = '' }: Props) {
  const maxValue = Math.max(...comparison.bars.map((b) => b.maxValue));

  return (
    <div className={`flex flex-col gap-3 sm:gap-4 p-4 sm:p-6 ${className}`}>
      {comparison.bars.map((bar) => {
        const percentage = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
        const color = getBarColor(bar.color);

        return (
          <div key={bar.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-400">{bar.label}</span>
              <span className="text-sm font-mono tabular-nums text-gray-500">
                {bar.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  transition: 'width 300ms ease-out',
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Reduction label if exactly 2 bars */}
      {comparison.bars.length === 2 && (
        <ReductionLabel bars={comparison.bars} />
      )}
    </div>
  );
}

function ReductionLabel({
  bars,
}: {
  bars: ComparisonState['bars'];
}) {
  const costly = bars.find((b) => b.color === 'costly');
  const efficient = bars.find((b) => b.color === 'efficient');
  if (!costly || !efficient || costly.value === 0) return null;

  const reduction = ((1 - efficient.value / costly.value) * 100).toFixed(1);

  return (
    <div className="mt-2 text-center">
      <span className="text-green-400 font-mono text-2xl font-bold">
        {reduction}%
      </span>
      <span className="block text-xs text-gray-600 mt-0.5">reduction</span>
    </div>
  );
}
