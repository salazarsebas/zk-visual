import { useMemo } from 'react';
import type { CircuitStep, LayoutedCircuitGraph } from '../lib/types';
import { layoutCircuit, padSteps } from '../lib/circuits/shared';
import { CircuitVisualizer } from './CircuitVisualizer';
import { CostComparison } from './CostComparison';
import { DescriptionPanel } from './DescriptionPanel';
import { COLORS } from '../lib/colors';

interface Props {
  naiveSteps: CircuitStep[];
  optimizedSteps: CircuitStep[];
  currentStep: number;
  className?: string;
}

export function SplitView({
  naiveSteps,
  optimizedSteps,
  currentStep,
  className = '',
}: Props) {
  // Pad shorter sequence
  const totalLength = Math.max(naiveSteps.length, optimizedSteps.length);
  const paddedNaive = useMemo(
    () => padSteps(naiveSteps, totalLength),
    [naiveSteps, totalLength],
  );
  const paddedOptimized = useMemo(
    () => padSteps(optimizedSteps, totalLength),
    [optimizedSteps, totalLength],
  );

  const naiveStep = paddedNaive[currentStep];
  const optimizedStep = paddedOptimized[currentStep];

  // Layout for each side (computed once from first graph)
  const naiveLayout = useMemo((): LayoutedCircuitGraph | null => {
    const firstGraph = naiveSteps.find((s) => s.graph)?.graph;
    return firstGraph ? layoutCircuit(firstGraph) : null;
  }, [naiveSteps]);

  const optimizedLayout = useMemo((): LayoutedCircuitGraph | null => {
    const firstGraph = optimizedSteps.find((s) => s.graph)?.graph;
    return firstGraph ? layoutCircuit(firstGraph) : null;
  }, [optimizedSteps]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Circuit panels */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        {/* Naive (left/top) */}
        <div className="flex-1 flex flex-col border-b sm:border-b-0 sm:border-r border-white/5">
          <div
            className="px-3 py-1.5 text-[10px] font-medium border-b border-white/5 flex items-center justify-between"
            style={{ color: COLORS.panelCostly }}
          >
            <span>Naive</span>
            <span className="font-mono tabular-nums text-gray-600">
              {naiveStep.satisfiedConstraints?.length ?? 0}/{naiveStep.totalConstraints}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            {naiveStep.graph && naiveLayout ? (
              <CircuitVisualizer
                graph={naiveStep.graph}
                layout={naiveLayout}
                className="h-full"
              />
            ) : naiveStep.comparison ? (
              <CostComparison comparison={naiveStep.comparison} className="h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                {naiveStep.description}
              </div>
            )}
          </div>
        </div>

        {/* Optimized (right/bottom) */}
        <div className="flex-1 flex flex-col">
          <div
            className="px-3 py-1.5 text-[10px] font-medium border-b border-white/5 flex items-center justify-between"
            style={{ color: COLORS.panelEfficient }}
          >
            <span>Optimized</span>
            <span className="font-mono tabular-nums text-gray-600">
              {optimizedStep.satisfiedConstraints?.length ?? 0}/{optimizedStep.totalConstraints}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            {optimizedStep.graph && optimizedLayout ? (
              <CircuitVisualizer
                graph={optimizedStep.graph}
                layout={optimizedLayout}
                className="h-full"
              />
            ) : optimizedStep.comparison ? (
              <CostComparison comparison={optimizedStep.comparison} className="h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                {optimizedStep.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combined description */}
      <div className="border-t border-white/5">
        <DescriptionPanel
          description={optimizedStep.description || naiveStep.description}
          insight={optimizedStep.insight || naiveStep.insight}
          signals={optimizedStep.signals || naiveStep.signals}
          totalConstraints={optimizedStep.totalConstraints}
          satisfiedConstraints={optimizedStep.satisfiedConstraints}
        />
      </div>
    </div>
  );
}
