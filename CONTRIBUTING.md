# Contributing to ZK Visual

Thanks for your interest in contributing to ZK Visual. This guide covers how to set up the project, add new circuit visualizations, and submit your work.

## Setup

```bash
git clone https://github.com/salazar/zk-visual.git
cd zk-visual
bun install
bun run dev
```

The dev server runs at `http://localhost:4321`.

## Adding a New Circuit Visualization

Every visualization in ZK Visual follows the same pattern. Here's the full process:

### 1. Check the Content Catalog

Open `docs/content/catalog.md` to find available items. Each has an ID (e.g. `2.5`), title, renderer type, and priority level. Pick an unimplemented item or propose a new one.

### 2. Create the `generateSteps()` Function

This is the core of every visualization. It returns an array of `CircuitStep` snapshots that represent every frame of the animation.

Add your circuit to the appropriate category file in `src/lib/circuits/`:

| Category | File |
|---|---|
| Foundations | `foundations.ts` |
| Core Gadgets | `gadgets.ts` |
| Hash Functions | `hashes.ts` |
| Merkle Trees | `merkle.ts` |
| Proving Systems | `proving-systems.ts` |

Example structure:

```typescript
import {
  createNode, createEdge, buildGraph,
  withNodeState, withEdgeValue,
  fieldMul, SMALL_PRIME
} from './shared';
import type { Circuit, CircuitStep } from '../types';

const code = `
template MyCircuit() {
    signal input a;
    signal input b;
    signal output c;
    c <== a * b;
}
`;

function generateSteps(): CircuitStep[] {
  const nodes = [
    createNode('a', 'input', 'a'),
    createNode('b', 'input', 'b'),
    createNode('mul0', 'gate_mul', '*'),
    createNode('c', 'output', 'c'),
  ];
  const edges = [
    createEdge('e1', 'a', 'mul0'),
    createEdge('e2', 'b', 'mul0'),
    createEdge('e3', 'mul0', 'c'),
  ];
  const graph = buildGraph(nodes, edges);

  return [
    {
      graph,
      totalConstraints: 0,
      description: 'Initial circuit with no values assigned.',
      codeLine: 1,
    },
    {
      graph: withNodeState(graph, 'a', 'active'),
      totalConstraints: 0,
      description: 'Input signal `a` receives a value.',
      codeLine: 3,
    },
    // ... more steps
  ];
}

export const myCircuit: Circuit = {
  id: '2.5',
  title: 'My Circuit',
  category: 'Core Gadgets',
  description: 'A brief explanation of what this circuit demonstrates.',
  code,
  language: 'circom',
  generateSteps,
};
```

### 3. Register the Circuit

In `src/lib/circuits/index.ts`, import your circuit and add it to the `ALL_CIRCUITS` array:

```typescript
import { myCircuit } from './gadgets';

const ALL_CIRCUITS: Circuit[] = [
  // ... existing circuits
  myCircuit,
];
```

That's it. The routing, sidebar, and slug generation are all automatic.

### 4. Verify

```bash
bun run dev
# Navigate to your circuit in the sidebar
bun test
```

## Rules to Follow

These are not suggestions. Breaking them will cause bugs.

### Immutability

Every step must be a **new** `CircuitGraph` object. Never mutate a previous step's graph. Use the spread + override helpers:

```typescript
// Good
const next = withNodeState(prevGraph, 'mul0', 'active');

// Bad
prevGraph.nodes[2].state = 'active';
```

### Layout coordinates

**Never** set `x` or `y` inside `generateSteps()`. The `layoutCircuit()` function handles positioning once at mount time. Your steps should only change node/edge states and values.

### Field arithmetic

- Always use `p = 17` (the `SMALL_PRIME` constant) for pedagogical examples
- Always use BigInt suffix: `3n`, `255n`, `0n`
- Use the helpers: `fieldAdd()`, `fieldMul()`, `fieldSub()`, `fieldInv()`

### Constraint indexing

- 0-based, topological order of multiplication gates
- `totalConstraints` must never decrease across steps
- Satisfied constraints accumulate monotonically

### Step descriptions

Every step needs a clear `description` explaining what's happening. Use the optional `insight` field for key educational takeaways. Keep descriptions concise and jargon-appropriate for the target audience.

## Renderer Types

Choose the right renderer for your visualization:

| Renderer | Best for |
|---|---|
| `CircuitVisualizer` | Arithmetic circuit DAGs with gate-by-gate animation |
| `CostComparison` | Constraint count comparisons (bar charts) |
| `PipelineVisualizer` | Sequential stage diagrams (prover/verifier flow) |
| `RadarChart` | Multi-axis tradeoff comparisons |
| `SplitView` | Side-by-side naive vs. optimized circuits |

## Documentation

The `docs/` folder has detailed guides:

- `docs/technical/step-encoding.md` has 4 complete worked examples of `generateSteps()`
- `docs/technical/dagre-layout.md` explains the layout pipeline
- `docs/technical/witness-generation.md` covers field arithmetic conventions
- `docs/zk/gadgets.md` has canonical constraint counts for standard gadgets

Read the relevant docs before implementing.

## Submitting a PR

1. Fork the repo and create a branch: `git checkout -b add-circuit-2.5`
2. Implement your circuit following the rules above
3. Run `bun test` and make sure everything passes
4. Open a PR with a clear title and description of what the visualization teaches
5. Include a screenshot or screen recording if possible

## Reporting Issues

Use the [GitHub Issues](https://github.com/salazar/zk-visual/issues) page. For bug reports, include:

- What you expected to happen
- What actually happened
- Browser and OS
- Steps to reproduce

## Code Style

- TypeScript strict mode is enabled
- Use the existing color tokens from `src/lib/colors.ts`
- Follow the existing component patterns (no new state management libraries)
- Keep dependencies minimal
