import type { PipelineState } from '../lib/types';
import { COLORS } from '../lib/colors';

interface Props {
  pipeline: PipelineState;
  className?: string;
}

export function PipelineVisualizer({ pipeline, className = '' }: Props) {
  return (
    <div className={`flex items-center justify-center gap-2 p-8 ${className}`}>
      {pipeline.stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-2">
          <div
            className={`
              relative flex items-center justify-center
              px-4 py-3 rounded-lg border min-w-[120px]
              transition-all duration-300
              ${stage.state === 'pending'
                ? 'border-white/5 bg-white/[0.02] text-gray-600'
                : stage.state === 'active'
                  ? 'border-blue-400/50 bg-blue-400/5 text-blue-300'
                  : 'border-green-400/30 bg-green-400/5 text-green-300'
              }
            `}
          >
            {stage.state === 'active' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </span>
            )}
            {stage.state === 'complete' && (
              <span className="absolute -top-1 -right-1 text-green-400 text-xs">
                ✓
              </span>
            )}
            <span className="text-sm font-medium text-center">
              {stage.label}
            </span>
          </div>

          {/* Arrow between stages */}
          {i < pipeline.stages.length - 1 && (
            <svg width="24" height="16" viewBox="0 0 24 16" className="shrink-0">
              <path
                d="M0 8 L18 8 M14 3 L20 8 L14 13"
                fill="none"
                stroke={
                  stage.state === 'complete'
                    ? COLORS.wireSatisfied
                    : COLORS.wireInactive
                }
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke 300ms' }}
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
