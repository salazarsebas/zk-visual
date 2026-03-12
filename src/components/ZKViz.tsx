import { useMemo } from 'react';
import type { Circuit } from '../lib/types';
import { isSplitViewCircuit } from '../lib/types';
import { layoutCircuit } from '../lib/circuits/shared';
import { usePlayback } from '../hooks/usePlayback';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { CircuitVisualizer } from './CircuitVisualizer';
import { CostComparison } from './CostComparison';
import { PipelineVisualizer } from './PipelineVisualizer';
import { SplitView } from './SplitView';
import { CodePanel } from './CodePanel';
import { SplitCodePanel } from './SplitCodePanel';
import { Controls } from './Controls';
import { DescriptionPanel } from './DescriptionPanel';

interface Props {
  circuit: Circuit;
}

export function ZKViz({ circuit }: Props) {
  const isSplit = isSplitViewCircuit(circuit);

  // Generate steps
  const steps = useMemo(() => circuit.generateSteps(), [circuit]);
  const naiveSteps = useMemo(
    () => (isSplit ? circuit.naive.generateSteps() : []),
    [circuit, isSplit],
  );
  const optimizedSteps = useMemo(
    () => (isSplit ? circuit.optimized.generateSteps() : []),
    [circuit, isSplit],
  );

  // Layout (single circuit mode)
  const layout = useMemo(() => {
    if (isSplit) return null;
    const firstGraph = steps.find((s) => s.graph)?.graph;
    return firstGraph ? layoutCircuit(firstGraph) : null;
  }, [steps, isSplit]);

  // Playback
  const effectiveSteps = isSplit
    ? Array.from(
        { length: Math.max(naiveSteps.length, optimizedSteps.length) },
        (_, i) => {
          const naive = naiveSteps[Math.min(i, naiveSteps.length - 1)];
          const optimized = optimizedSteps[Math.min(i, optimizedSteps.length - 1)];
          return {
            totalConstraints: optimized.totalConstraints,
            description: optimized.description || naive.description,
            insight: optimized.insight || naive.insight,
          };
        },
      )
    : steps;

  const { state, actions, currentStepData } = usePlayback(effectiveSteps as any);
  useKeyboardShortcuts(actions, state.isPlaying);

  const currentStep = isSplit ? undefined : currentStepData;

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Visualization area */}
        <div className="flex-1 min-h-0">
          {isSplit ? (
            <SplitView
              naiveSteps={naiveSteps}
              optimizedSteps={optimizedSteps}
              currentStep={state.currentStep}
              className="h-full"
            />
          ) : currentStep?.pipeline ? (
            <PipelineVisualizer pipeline={currentStep.pipeline} className="h-full" />
          ) : currentStep?.graph && layout ? (
            <div className="flex flex-col sm:flex-row h-full">
              <CircuitVisualizer
                graph={currentStep.graph}
                layout={layout}
                className={currentStep.comparison ? 'sm:w-3/5 h-3/5 sm:h-full' : 'w-full h-full'}
              />
              {currentStep.comparison && (
                <CostComparison
                  comparison={currentStep.comparison}
                  className="h-2/5 sm:h-full sm:w-2/5 border-t sm:border-t-0 sm:border-l border-white/5"
                />
              )}
            </div>
          ) : currentStep?.comparison ? (
            <CostComparison comparison={currentStep.comparison} className="h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm px-4 sm:px-8 text-center">
              {currentStep?.description ?? 'Select a visualization to begin'}
            </div>
          )}
        </div>

        {/* Description panel (non-split mode) */}
        {!isSplit && currentStep && (
          <div className="border-t border-white/5">
            <DescriptionPanel
              description={currentStep.description}
              insight={currentStep.insight}
              signals={currentStep.signals}
              totalConstraints={currentStep.totalConstraints}
              satisfiedConstraints={currentStep.satisfiedConstraints}
            />
          </div>
        )}

        {/* Controls */}
        <Controls
          isPlaying={state.isPlaying}
          currentStep={state.currentStep}
          totalSteps={state.totalSteps}
          speed={state.speed}
          onPlay={actions.play}
          onPause={actions.pause}
          onStepForward={actions.stepForward}
          onStepBack={actions.stepBack}
          onGoToStep={actions.goToStep}
          onSetSpeed={actions.setSpeed}
        />
      </div>

      {/* Code panel */}
      <div className="hidden lg:block w-80 border-l border-white/5 shrink-0">
        {isSplit ? (
          <SplitCodePanel
            naiveCode={circuit.naive.code}
            optimizedCode={circuit.optimized.code}
            naiveLanguage={circuit.language}
            optimizedLanguage={circuit.language}
            naiveActiveLine={
              naiveSteps[Math.min(state.currentStep, naiveSteps.length - 1)]?.codeLine
            }
            optimizedActiveLine={
              optimizedSteps[Math.min(state.currentStep, optimizedSteps.length - 1)]?.codeLine
            }
            naiveLabel={circuit.naive.label}
            optimizedLabel={circuit.optimized.label}
          />
        ) : (
          <CodePanel
            code={circuit.code}
            language={circuit.language}
            activeLine={currentStep?.codeLine}
            annotations={currentStep?.codeAnnotations}
          />
        )}
      </div>
    </div>
  );
}
