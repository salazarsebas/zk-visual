# SplitView Synchronization Pattern

> Implementation guide — how to synchronize two independent `CircuitStep[]` arrays in
> the `SplitView` renderer for naive-vs-optimized comparisons (catalog items 2.1, 6.1, 6.2).

---

## Table of Contents

1. [What SplitView Synchronizes](#1-what-splitview-synchronizes)
2. [The Length Mismatch Problem](#2-the-length-mismatch-problem)
3. [Strategy A: Hold Last Frame (Default)](#3-strategy-a-hold-last-frame-default)
4. [Strategy B: Phase Alignment (For Structural Comparisons)](#4-strategy-b-phase-alignment-for-structural-comparisons)
5. [The `SplitViewState` Interface](#5-the-splitviewstate-interface)
6. [Label and Color Conventions](#6-label-and-color-conventions)
7. [Code Panel in SplitView](#7-code-panel-in-splitview)
8. [Constraint Counter in SplitView](#8-constraint-counter-in-splitview)

---

## 1. What SplitView Synchronizes

A SplitView visualization displays two circuits side-by-side, each with its own `generateSteps()` function producing an independent `CircuitStep[]` array. One set of playback controls — one play button, one step slider — drives both panels simultaneously.

The challenge: the two arrays have **different lengths** and **different content** at each position. The playback engine must map a single integer `i` (the current step index) to a meaningful position in each array.

```
Left circuit (naive):   [step 0] [step 1] ... [step 255]   → 256 steps
Right circuit (optimized): [step 0] [step 1] ... [step 8]  → 9 steps
                                               ↑
                         One slider position drives both
```

---

## 2. The Length Mismatch Problem

When the user steps through the animation, the shorter circuit finishes while the longer circuit is still running. Two valid approaches:

| | **Strategy A: Hold Last Frame** | **Strategy B: Phase Alignment** |
|---|---|---|
| **Mechanism** | Pad the shorter array to match the longer | Map logical phases to relative positions |
| **Visual story** | "The shorter one finishes faster" | "Both handle the same phase the same way" |
| **Best for** | Cost-difference comparisons (Plookup vs bit decomp) | Structural comparisons (naive gadget vs optimized gadget) |
| **Implementation** | Simple padding function | Phase definition in the `Circuit` object |

---

## 3. Strategy A: Hold Last Frame (Default)

The default strategy: the shorter circuit stays on its final step while the longer circuit continues. The user sees the left panel's constraint counter keep climbing while the right panel shows its final satisfied state.

**Implementation:**

```typescript
/**
 * Pad a step array to a target length by repeating the last step.
 * Use when the visual story is "the shorter circuit finishes faster."
 */
function padSteps(steps: CircuitStep[], targetLength: number): CircuitStep[] {
  if (steps.length >= targetLength) return steps;
  const lastStep = steps[steps.length - 1];
  const padding = Array(targetLength - steps.length).fill(lastStep);
  return [...steps, ...padding];
}

// In the SplitView component:
function synchronizeSteps(
  leftSteps: CircuitStep[],
  rightSteps: CircuitStep[]
): { left: CircuitStep[]; right: CircuitStep[]; totalLength: number } {
  const totalLength = Math.max(leftSteps.length, rightSteps.length);
  return {
    left:  padSteps(leftSteps, totalLength),
    right: padSteps(rightSteps, totalLength),
    totalLength,
  };
}

// Usage:
const { left, right, totalLength } = synchronizeSteps(naiveSteps, optimizedSteps);
// Now: left[i] and right[i] are always valid for 0 ≤ i < totalLength
```

**When to use:**
- Catalog item 2.1: Naive range check (256 steps) vs bit decomposition (8 steps)
- Catalog item 6.1: 16-bit range check (16 steps) vs Plookup (1 step)
- Catalog item 6.2: ECDSA constraint count vs EdDSA constraint count

The visual divergence is the pedagogical payoff: the right panel hits its final state early and "holds" while the left panel keeps counting up. The contrast is visceral.

---

## 4. Strategy B: Phase Alignment (For Structural Comparisons)

When the comparison is about **structure** rather than just count, both circuits should advance through equivalent logical phases at the same relative speed. This makes the structural difference visible without one circuit finishing while the other has steps remaining.

**Phase definition in the `Circuit` object:**

```typescript
interface CircuitPhase {
  label: string;   // Human-readable phase name: 'Input', 'Processing', 'Output'
  endStep: number; // Inclusive index of the last step in this phase
}

// Example: a circuit with phases
const naiveCircuit: Circuit = {
  id: 'naive-range-check',
  phases: [
    { label: 'Input',      endStep: 1 },   // Steps 0–1
    { label: 'Processing', endStep: 14 },  // Steps 2–14 (13 constraint checks)
    { label: 'Output',     endStep: 16 },  // Steps 15–16
  ],
  // ...
};

const optimizedCircuit: Circuit = {
  id: 'optimized-range-check',
  phases: [
    { label: 'Input',      endStep: 1 },  // Steps 0–1
    { label: 'Processing', endStep: 5 },  // Steps 2–5 (4 constraint checks)
    { label: 'Output',     endStep: 7 },  // Steps 6–7
  ],
  // ...
};
```

**Phase-aligned step resolver:**

```typescript
/**
 * Given a normalized playback position (0.0–1.0) and a circuit with phases,
 * return the step index for that circuit at that position.
 */
function resolvePhaseAlignedStep(
  position: number,    // 0.0 = start, 1.0 = end
  steps: CircuitStep[],
  phases: CircuitPhase[]
): number {
  const totalPhases = phases.length;
  const phasePosition = position * totalPhases;
  const phaseIndex = Math.min(Math.floor(phasePosition), totalPhases - 1);
  const phaseOffset = phasePosition - phaseIndex;

  const phaseStart = phaseIndex === 0 ? 0 : phases[phaseIndex - 1].endStep + 1;
  const phaseEnd   = phases[phaseIndex].endStep;
  const phaseLength = phaseEnd - phaseStart + 1;

  const stepIndex = Math.min(
    phaseStart + Math.floor(phaseOffset * phaseLength),
    phaseEnd
  );

  return Math.max(0, Math.min(stepIndex, steps.length - 1));
}
```

**When to use:**
- Comparing gadget implementations where both have the same logical phases (input → processing → output) but different step counts within each phase
- When showing "both approaches handle input the same, then diverge in the processing phase"

---

## 5. The `SplitViewState` Interface

The data structure the `SplitView` component receives:

```typescript
interface SplitViewProps {
  leftCircuit:  Circuit;
  rightCircuit: Circuit;
  strategy: 'hold' | 'phase';
  labels: {
    left:  string;  // e.g., "Naive (Bit Decomposition)"
    right: string;  // e.g., "Optimized (Plookup)"
  };
}
```

**Component implementation sketch:**

```typescript
function SplitView({ leftCircuit, rightCircuit, strategy, labels }: SplitViewProps) {
  // Generate step arrays from both circuits
  const leftSteps  = useMemo(() => leftCircuit.generateSteps(), [leftCircuit]);
  const rightSteps = useMemo(() => rightCircuit.generateSteps(), [rightCircuit]);

  // Synchronize based on strategy
  const { left, right, totalLength } = useMemo(() => {
    if (strategy === 'hold') {
      return synchronizeSteps(leftSteps, rightSteps);
    } else {
      // Phase alignment: use normalized position
      return {
        left: leftSteps,
        right: rightSteps,
        totalLength: 100, // 100 discrete positions for the slider
      };
    }
  }, [leftSteps, rightSteps, strategy]);

  // Single playback hook drives both panels
  const { currentStep, isPlaying, play, pause, next, prev } = usePlayback(totalLength);

  // Resolve step indices
  const leftIndex = strategy === 'hold'
    ? currentStep
    : resolvePhaseAlignedStep(
        currentStep / (totalLength - 1),
        leftSteps,
        leftCircuit.phases ?? []
      );

  const rightIndex = strategy === 'hold'
    ? currentStep
    : resolvePhaseAlignedStep(
        currentStep / (totalLength - 1),
        rightSteps,
        rightCircuit.phases ?? []
      );

  return (
    <div className="splitview-container">
      <div className="splitview-panel splitview-left">
        <h3>{labels.left}</h3>
        <CircuitVisualizer
          circuit={leftCircuit}
          step={left[leftIndex]}
          layout={leftLayout}
        />
        <ConstraintCounter step={left[leftIndex]} color="highlightCostly" />
      </div>

      <div className="splitview-divider" />

      <div className="splitview-panel splitview-right">
        <h3>{labels.right}</h3>
        <CircuitVisualizer
          circuit={rightCircuit}
          step={right[rightIndex]}
          layout={rightLayout}
        />
        <ConstraintCounter step={right[rightIndex]} color="highlightEfficient" />
      </div>

      <PlaybackControls
        currentStep={currentStep}
        totalSteps={totalLength}
        isPlaying={isPlaying}
        onPlay={play}
        onPause={pause}
        onNext={next}
        onPrev={prev}
      />
    </div>
  );
}
```

---

## 6. Label and Color Conventions

**The left panel always shows the naive/expensive approach. The right panel always shows the optimized approach.** This convention is enforced in the data passed to `SplitView`, not in the renderer itself. The renderer is color-neutral.

| Panel | Always shows | Label convention | Color token |
|---|---|---|---|
| Left | Naive / expensive | "Naive", "Before optimization", "With ECDSA" | `highlightCostly` (red) |
| Right | Optimized / efficient | "Optimized", "With Plookup", "With EdDSA" | `highlightEfficient` (green) |

**Color token values (from design system):**

```typescript
const COLOR_COSTLY    = '#ef4444';  // red-500 — for left (naive) panel accents
const COLOR_EFFICIENT = '#22c55e';  // green-500 — for right (optimized) panel accents
```

These colors appear in:
- The panel header border/accent
- The constraint counter label
- The `CostComparison` bar chart (when used alongside SplitView)

The `CircuitVisualizer` itself does not use these colors — node states use the design system's `gateActive`, `gateSatisfied`, `gateViolated` colors regardless of which panel they are in.

---

## 7. Code Panel in SplitView

When SplitView is active, the code panel shows **two Monaco editor instances stacked vertically**. Each follows its own `codeLine`.

```typescript
// In the SplitView code panel:
function SplitViewCodePanel({ leftCircuit, rightCircuit, leftStep, rightStep }) {
  return (
    <div className="splitview-code-panel">
      {/* Top half: left circuit code */}
      <div className="splitview-code-half">
        <span className="code-panel-label">{leftLabels.title}</span>
        <MonacoEditor
          value={leftCircuit.code}
          language={leftCircuit.language}
          activeLine={leftStep.codeLine}
          annotations={leftStep.codeAnnotations}
          options={{ readOnly: true, minimap: { enabled: false } }}
        />
      </div>

      <div className="splitview-code-divider" />

      {/* Bottom half: right circuit code */}
      <div className="splitview-code-half">
        <span className="code-panel-label">{rightLabels.title}</span>
        <MonacoEditor
          value={rightCircuit.code}
          language={rightCircuit.language}
          activeLine={rightStep.codeLine}
          annotations={rightStep.codeAnnotations}
          options={{ readOnly: true, minimap: { enabled: false } }}
        />
      </div>
    </div>
  );
}
```

**Important:** Use `monaco.editor.create()` twice — once for each editor instance. Do **not** use `monaco.editor.createDiffEditor()`. The diff view would show the syntactic difference between the two Circom templates, which would mislead users into thinking the two circuits are variations of the same code rather than two independent implementations of the same logical operation.

**Height split:** 50% / 50% (equal height for both editors). Use CSS:

```css
.splitview-code-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.splitview-code-half {
  flex: 1;
  overflow: hidden;
  min-height: 0;  /* Required for flex children to respect overflow */
}
```

---

## 8. Constraint Counter in SplitView

Each panel shows its own constraint counter, updated independently:

```typescript
function ConstraintCounter({ step, color }: { step: CircuitStep; color: string }) {
  return (
    <div className="constraint-counter" style={{ borderColor: color }}>
      <span className="constraint-count" style={{ color }}>
        {step.totalConstraints}
      </span>
      <span className="constraint-label">constraints</span>
    </div>
  );
}
```

**The pedagogical payoff:** As the animation progresses with Strategy A (hold last frame), the constraint counters diverge dramatically:

```
Step 8 of 256:

┌──────────────────┐    ┌──────────────────┐
│  Naive           │    │  Optimized       │
│                  │    │                  │
│     8            │    │     1 ✓          │
│  constraints     │    │  constraint      │
│  (still going)   │    │  (done)          │
└──────────────────┘    └──────────────────┘

Step 256 of 256:

┌──────────────────┐    ┌──────────────────┐
│  Naive           │    │  Optimized       │
│                  │    │                  │
│     256          │    │     1 ✓          │
│  constraints     │    │  constraint      │
└──────────────────┘    └──────────────────┘
```

The right counter reaches 1 and stays there. The left counter climbs to 256. The user sees both numbers simultaneously at the end — 256 vs 1 — making the 256× cost difference concrete and memorable.

**Cross-links:**
- Step encoding: [step-encoding.md](./step-encoding.md)
- Architecture: [architecture.md](./architecture.md)
- Catalog items: [catalog.md — items 2.1, 6.1, 6.2](../content/catalog.md)
