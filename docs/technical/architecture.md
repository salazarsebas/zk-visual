# Architecture

> Proposed technical stack, component model, and design decisions
> for the ZK Visual platform.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [The Circuit Step Pattern](#3-the-circuit-step-pattern)
4. [Renderer Types](#4-renderer-types)
5. [Code Panel Synchronization](#5-code-panel-synchronization)
6. [Design System](#6-design-system)
7. [Routing and i18n](#7-routing-and-i18n)
8. [Performance Principles](#8-performance-principles)

---

## 1. Tech Stack

The stack follows the alg0.dev model closely — it is validated for this use case and avoids unnecessary novelty.

| Layer | Technology | Rationale |
|---|---|---|
| Meta-framework | **Astro** | Static shell + hydrated islands. Zero JS overhead on non-interactive pages. Ideal for an educational product where load time is a UX concern. |
| UI library | **React** | Standard choice for interactive components. The visualizer and code panel are complex enough to warrant a component model. |
| Styling | **Tailwind CSS v4** | Utility-first, consistent with modern developer tooling. Avoids CSS-in-JS overhead. |
| Code editor | **Monaco Editor** | `@monaco-editor/react`. The same editor as VS Code — users already know it. Required for code highlighting synchronization with `deltaDecorations()`. |
| Language | **TypeScript** | Non-negotiable. ZK circuit data structures are complex typed objects — type safety is critical for correctness. |
| Graph rendering | **SVG** (inline React) | Arithmetic circuits are DAGs. SVG is the correct output format: scalable, animatable via CSS, no canvas API complexity, accessible via ARIA. |
| Package manager | **bun** | Fastest installs in the Node.js ecosystem. Native TypeScript runner, built-in test runner, and compatible with the npm registry. Single tool for install, run, and test. |
| Typography | **Geist** | Vercel's font. Developer-tool aesthetic appropriate for the audience. |
| Deployment | **Vercel** | First-class Astro integration via `@astrojs/vercel`. Edge CDN, automatic preview deployments per branch, and native support for Astro's static output adapter. |
| License | **MIT** | Open source from day one. Required for ecosystem grants and community trust. |

### Configuration files

| File | Purpose |
|---|---|
| `bun.lockb` | Bun binary lockfile — commit to version control for reproducible installs |
| `bunfig.toml` | Bun config (optional — only add if workspace or custom registry needed) |
**Bootstrap command:**
```sh
bun create astro@latest
```

### What is deliberately excluded

| Technology | Reason excluded |
|---|---|
| D3.js | Too low-level for this use case. SVG with React state is sufficient and more readable. |
| WebGL / Three.js | No 3D required. Adds complexity without educational value. |
| Redux / Zustand | `usePlayback` as a custom hook is sufficient state management. Global store is over-engineering at this scale. |
| Database / backend | Fully static. No user accounts, no server. All state is in-memory and URL-based. |
| WebAssembly | Not needed for visualizations. If live Circom compilation is added later, this is the correct addition. |

---

## 2. Project Structure

```
src/
  components/
    ZKViz.tsx                   # Root orchestrator — equivalent to AlgoViz.tsx
    CircuitVisualizer.tsx       # DAG renderer for arithmetic circuits
    CostComparison.tsx          # Bar chart renderer for constraint comparisons
    PipelineVisualizer.tsx      # Pipeline diagram for proof flow
    RadarChart.tsx              # Proving system comparison chart
    CodePanel.tsx               # Monaco editor with Circom/Noir highlighting
    Controls.tsx                # Playback controls (stateless/controlled)
    Sidebar.tsx                 # Category and topic navigation
    Header.tsx                  # Top navigation bar
    WelcomeScreen.tsx           # Landing / empty state
    ConstraintCounter.tsx       # Live constraint count badge
    KnowledgeBarrier.tsx        # Visual separator for public/private signals
  hooks/
    usePlayback.ts              # Playback state machine (identical pattern to alg0.dev)
    useKeyboardShortcuts.ts     # Global keyboard bindings
    useResizablePanel.ts        # Drag-resize logic for panels
  i18n/
    translations.ts             # EN string map (ES added in Phase 3)
  lib/
    colors.ts                   # Color token definitions (see Design System section)
    types.ts                    # All TypeScript interfaces
    circuits/
      index.ts                  # Registry and export aggregator
      foundations.ts            # Category 1: Foundation concepts
      gadgets.ts                # Category 2: Core gadgets
      hashes.ts                 # Category 3: Hash functions
      merkle.ts                 # Category 4: Merkle trees
      proving-systems.ts        # Category 5: Proving system comparisons
      optimizations.ts          # Category 6: Optimization patterns
      real-world.ts             # Category 7: Real-world circuits
      shared.ts                 # Shared utility functions
  pages/
    index.astro                 # Homepage
    [topic].astro               # Dynamic per-topic route
  styles/
    global.css                  # Base styles, font loading, CSS variables
```

---

## 3. The Circuit Step Pattern

Directly adapted from alg0.dev's Step Snapshot architecture. The key insight is identical: **pre-compute all steps as an immutable array before any animation begins**.

### Circuit interface

```typescript
interface Circuit {
  id:             string
  title:          string
  category:       CircuitCategory
  description:    string
  visualization:  VisualizationType
  language?:      'circom' | 'noir' | 'halo2'
  code?:          string              // source code shown in Monaco
  generateSteps:  () => CircuitStep[]
}
```

### Step interface

```typescript
interface CircuitStep {
  // Circuit DAG state
  graph?:         CircuitGraph        // nodes (gates), edges (wires), values

  // Comparison views
  comparison?:    ComparisonState     // side-by-side before/after

  // Pipeline diagram state
  pipeline?:      PipelineState       // which stage is active

  // Code synchronization
  codeLine?:      number              // which line to highlight in Monaco
  codeAnnotations?: CodeAnnotation[]  // inline value annotations

  // Constraint tracking
  activeConstraints?:  number[]       // which constraints are currently being checked
  satisfiedConstraints?: number[]     // which constraints are confirmed satisfied
  violatedConstraints?:  number[]     // which constraints are violated (for error demos)
  totalConstraints?:   number         // running total

  // Step metadata
  description:    string              // human-readable explanation of this step
  insight?:       string              // optional highlighted key insight for this step
}
```

### Circuit graph state

```typescript
interface CircuitGraph {
  nodes: CircuitNode[]
  edges: CircuitEdge[]
}

interface CircuitNode {
  id:       string
  type:     'add' | 'mul' | 'const' | 'input_public' | 'input_private' | 'output'
  label:    string            // display label: '+', '×', 'a', '42', etc.
  value?:   string | number   // current concrete value (if witness is being animated)
  state:    NodeState         // 'inactive' | 'active' | 'satisfied' | 'violated'
  x:        number            // SVG x position (pre-computed layout)
  y:        number            // SVG y position
}

interface CircuitEdge {
  id:       string
  from:     string            // source node id
  to:       string            // target node id
  value?:   string | number   // wire value if propagated
  state:    EdgeState         // 'inactive' | 'active' | 'satisfied' | 'violated'
}
```

### Why pre-computation is non-negotiable

The step snapshot architecture is especially important for ZK visualizations because:

1. **Bidirectional scrubbing** — users will frequently want to go back and re-examine a constraint or gadget structure. This requires O(1) step access.
2. **Constraint count accuracy** — the total constraint count for each step must be deterministic and pre-calculated, not computed live where floating-point or ordering issues could cause display artifacts.
3. **Code sync correctness** — the `codeLine` for each step is determined at generation time, not dynamically inferred during playback.
4. **Comparison views** — showing two circuit implementations side by side requires both step arrays to be generated independently and replayed synchronously.

---

## 4. Renderer Types

ZK Visual requires more renderer types than alg0.dev due to the diversity of visualization formats needed:

### 4.1 CircuitVisualizer (DAG)

The primary renderer. Renders an arithmetic circuit as an SVG directed acyclic graph.

**Implementation approach:**
- Pre-compute node positions using a topological layout algorithm (left-to-right layers: inputs → gates → output)
- Render nodes as SVG shapes (circle for gates, rect for constants, diamond for public inputs)
- Render edges as SVG `<path>` elements with directional arrows
- Animate transitions with CSS `transition` on fill, stroke, and opacity
- Value labels appear on edges as SVG `<text>` elements positioned at the midpoint
- Active nodes get a pulsing ring via SVG `<animate>` (matches alg0.dev's graph pulse pattern)

### 4.2 CostComparison (Bar Chart)

Renders side-by-side constraint count comparisons between implementations.

```
Naive approach   ████████████████████████████████  256 constraints
Optimized        ████████ 9 constraints
                                     96.5% reduction  ▼
```

**Implementation:** CSS-animated bars using Tailwind transitions. No external charting library. Values are pre-computed in the step array and the bar widths are derived from `(value / maxValue) * 100%`.

### 4.3 PipelineVisualizer

Renders the ZK proof pipeline as a series of labeled boxes connected by arrows. Each step of the animation activates a different stage.

**Use cases:**
- "What is a ZK Proof" (prover/verifier model)
- Proving system pipeline (witness → constraint check → prover → verifier)
- Hash function sponge construction

**Implementation:** SVG with CSS transitions. Each stage is a `<rect>` + `<text>` group. Active stage gets highlighted border and fill. Arrows between stages are animated with `stroke-dashoffset` for a "data flowing" effect.

### 4.4 RadarChart

Renders multi-axis comparison of proving systems (proof size, proving time, verification time, setup, recursion, post-quantum).

**Use cases:**
- Proving system comparison (Groth16 vs PLONK vs Halo2 vs STARKs)

**Implementation:** Custom SVG polygon construction. Each axis is a line from center to edge. Each system is a filled polygon connecting its scores across axes. CSS transitions on polygon points for animated reveals.

### 4.5 SplitView

A composite renderer that shows two instances of any other renderer side by side — used for before/after comparisons.

**Use cases:**
- Naive vs optimized gadget implementations
- Two different proving systems running "the same circuit"

---

## 5. Code Panel Synchronization

Identical to alg0.dev's approach but extended to support multiple ZK languages.

### Language support in Monaco

```typescript
// Circom syntax highlighting
monaco.languages.register({ id: 'circom' })
monaco.languages.setMonarchTokensProvider('circom', circomGrammar)

// Noir syntax highlighting
monaco.languages.register({ id: 'noir' })
monaco.languages.setMonarchTokensProvider('noir', noirGrammar)
```

Circom and Noir both have syntax close enough to C/Rust that a custom Monarch grammar is achievable without an external language server.

### Step synchronization

```typescript
// In CodePanel.tsx — same pattern as alg0.dev
useEffect(() => {
  if (!editorRef.current || step.codeLine === undefined) return

  const decorations = editorRef.current.deltaDecorations(
    prevDecorationsRef.current,
    [{
      range: new monaco.Range(step.codeLine, 1, step.codeLine, 1),
      options: {
        isWholeLine: true,
        className: 'zkviz-active-line',
        glyphMarginClassName: 'zkviz-active-glyph'
      }
    }]
  )
  prevDecorationsRef.current = decorations
}, [step.codeLine])
```

### Inline constraint annotations

For each step, constraint-relevant variables are annotated inline:

```
// Circom example — what the user sees during a range check visualization:
signal input x;                     // x = 42
signal bits[8];                     // computed
component bitDecomp = Bits(8);      // ← active line
bitDecomp.in <== x;                 // constraint #1 of 9
```

---

## 6. Design System

### Color Tokens

Defined in `src/lib/colors.ts` and applied via CSS custom properties for consistency across all renderers.

```typescript
export const CIRCUIT_COLORS = {
  // Wire states
  wireInactive:         '#374151',  // gray-700
  wireActive:           '#60a5fa',  // blue-400
  wireSatisfied:        '#34d399',  // green-400
  wireViolated:         '#f87171',  // red-400

  // Gate types
  gateAdd:              '#a78bfa',  // violet-400
  gateMul:              '#f59e0b',  // amber-400
  gateConst:            '#6b7280',  // gray-500
  gateInputPublic:      '#38bdf8',  // sky-400
  gateInputPrivate:     '#fb923c',  // orange-400
  gateOutput:           '#fbbf24',  // yellow-400
  gateActive:           '#ffffff',  // white

  // Constraint states
  constraintOpen:       '#374151',  // gray-700
  constraintSatisfied:  '#34d399',  // green-400
  constraintViolated:   '#f87171',  // red-400

  // Comparison views
  highlightEfficient:   '#34d399',  // green-400
  highlightCostly:      '#f87171',  // red-400
  highlightNeutral:     '#60a5fa',  // blue-400

  // Knowledge barrier
  barrierPublic:        '#38bdf8',  // sky-400 (visible to verifier)
  barrierPrivate:       '#fb923c',  // orange-400 (hidden from verifier)
} as const

export type CircuitColorToken = keyof typeof CIRCUIT_COLORS
```

### Node Shapes (SVG)

| Node type | Shape | Fill | Border |
|---|---|---|---|
| Addition gate | Circle | `gateAdd` | none |
| Multiplication gate | Circle | `gateMul` | none |
| Constant | Square | `gateConst` | none |
| Public input | Diamond | `gateInputPublic` | dashed (visible to verifier) |
| Private input | Diamond | `gateInputPrivate` | solid (hidden) |
| Output | Double circle | `gateOutput` | none |
| Active (any) | Any | base color | white glow ring |

### Typography

- **Font:** Geist — `font-sans` for UI, `font-mono` for signal names and values
- **Circuit labels:** `text-xs font-mono` for gate labels and wire values
- **Constraint counter:** `text-sm font-mono tabular-nums` for the running count
- **Description text:** `text-sm text-gray-300` in the explanation panel

---

## 7. Routing and i18n

### URL structure

```
/                           → homepage / welcome screen
/arithmetic-circuits        → dynamic topic route
/range-check                → dynamic topic route
/proving-systems            → dynamic topic route
```

### Dynamic routing (Astro)

```astro
// src/pages/[topic].astro
---
import { circuits } from '../lib/circuits'
export function getStaticPaths() {
  return circuits.map(c => ({ params: { topic: c.id } }))
}
const { topic } = Astro.params
const circuit = circuits.find(c => c.id === topic)
---
```

### Client-side navigation

Topic selection within the app uses `window.history.pushState` — no full page reload. The URL updates for shareability and browser back/forward support.

### i18n

Phase 1 is English-only. The i18n architecture should be set up from day one (following alg0.dev's `translations.ts` pattern) to make Phase 3 additions non-disruptive. All user-facing strings must go through the translation map from the start.

---

## 8. Performance Principles

| Principle | Implementation |
|---|---|
| **Zero JS on non-interactive pages** | Astro renders the shell and sidebar as static HTML. The visualizer islands are only hydrated on client when the component is in view. |
| **Pre-computed steps** | All circuit steps are generated at component mount time, not during playback. No computation happens during the animation interval. |
| **SVG over Canvas** | SVG is DOM-native, accessible, and animatable via CSS. No Canvas 2D or WebGL unless a future visualization strictly requires it. |
| **No heavy charting libraries** | All charts (bar, radar) are custom SVG. Eliminates ~100–200KB of chart library bundle. |
| **Monaco loaded lazily** | The code panel is a dynamically imported component. Monaco (~2MB) does not block the initial render of the visualization. |
| **Font subsetting** | Geist loaded with `display: swap` and subsetted to Latin characters only. |

---

*See also: [ZK Visualization Approach](../concept/zk-visualization.md) · [Content Catalog](../content/catalog.md) · [Roadmap](../roadmap/roadmap.md)*
