import { COLORS } from '../lib/colors';

interface Props {
  description: string;
  insight?: string;
  signals?: Record<string, bigint>;
  totalConstraints: number;
  satisfiedConstraints?: number[];
  className?: string;
}

export function DescriptionPanel({
  description,
  insight,
  signals,
  totalConstraints,
  satisfiedConstraints,
  className = '',
}: Props) {
  const satisfiedCount = satisfiedConstraints?.length ?? 0;
  const constraintProgress =
    totalConstraints > 0 ? (satisfiedCount / totalConstraints) * 100 : 0;

  return (
    <div className={`flex flex-col gap-2 px-4 py-2.5 ${className}`}>
      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>

      {/* Insight callout */}
      {insight && (
        <div className="border-l-2 border-yellow-400 pl-3 py-1">
          <p className="text-xs text-gray-400">{insight}</p>
        </div>
      )}

      <div className="flex gap-6 items-center">
        {/* Constraint counter */}
        {totalConstraints > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold font-mono tabular-nums"
              style={{ color: COLORS.constraintSatisfied }}
            >
              {satisfiedCount}/{totalConstraints}
            </span>
            <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${constraintProgress}%`,
                  backgroundColor: COLORS.constraintSatisfied,
                }}
              />
            </div>
          </div>
        )}

        {/* Signal values */}
        {signals && Object.keys(signals).length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(signals).map(([name, value]) => (
              <span key={name} className="text-[10px] font-mono text-gray-600">
                {name}={value.toString()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
