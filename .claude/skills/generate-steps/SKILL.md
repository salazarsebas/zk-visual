# Skill: generate-steps

user-invocable: true
description: Scaffold a complete generateSteps() file for a catalog item
allowed-tools: Read, Write, Glob

## Usage

```
/generate-steps <catalog-id>
```

Examples:
- `/generate-steps 2.1`
- `/generate-steps 4.2`
- `/generate-steps bit-decomposition`

---

## Workflow

### Step 1 — Find the catalog item

Read `docs/content/catalog.md` and find the entry matching `$ARGUMENTS` (by ID like `2.1` or by name).

Extract:
- `title` — human-readable name
- `slug` — kebab-case identifier for the file name
- `renderer` — which visualization renderer to use
- `constraintCount` — expected total constraints
- `gadgets` — list of gadget components involved

If the item is not found, report: "Item `$ARGUMENTS` not found in docs/content/catalog.md. Available IDs: [list P0 IDs]."

### Step 2 — Find the most similar example

Read `docs/technical/step-encoding.md` sections §5–§8 (the worked examples).

Match the catalog item's renderer to the closest example:
- `arithmetic` renderer → use the arithmetic circuit example
- `hash` renderer → use the hash function example
- `merkle` renderer → use the Merkle tree example
- `lookup` renderer → use the lookup argument example

### Step 3 — Get gadget structure

Read `docs/zk/gadgets.md` and find entries for each gadget in the item's gadget list.

Extract the node/edge structure for each gadget (input signals, intermediate signals, output signals, constraint edges).

### Step 4 — Generate the scaffold file

Write to `src/lib/circuits/<slug>.ts`:

```typescript
/**
 * <title>
 * Catalog ID: <id>
 * Expected constraints: <constraintCount>
 *
 * See docs/technical/step-encoding.md for the generateSteps() pattern.
 * See docs/zk/gadgets.md for gadget constraint counts.
 */

import type { CircuitStep, CircuitGraph, Circuit } from '../types'

// ─── Circuit definition ──────────────────────────────────────────────────────

export const circuit: Circuit = {
  id: '<slug>',
  title: '<title>',
  language: 'circom',
  code: `// <title>
// TODO: Add full Circom template here
// Constraint count: <constraintCount>

template <TemplateName>() {
    // TODO: declare input signals
    // TODO: declare intermediate signals
    // TODO: declare output signal
    // TODO: add constraints
}

component main = <TemplateName>();`,
}

// ─── R1CS rows (for testing) ─────────────────────────────────────────────────
// Format: [A_coeffs, B_coeffs, C_coeffs] where each is {signalName: coefficient}
// See docs/technical/testing-correctness.md §3 for the full format.

export const r1csRows: Array<[Record<string, bigint>, Record<string, bigint>, Record<string, bigint>]> = [
  // TODO: Add one entry per constraint
  // Example: [{ a: 1n }, { b: 1n }, { c: 1n }]  // c = a * b
]

// ─── Initial graph (all nodes inactive) ─────────────────────────────────────

const initialGraph: CircuitGraph = {
  nodes: [
    // TODO: Add nodes based on gadget structure from docs/zk/gadgets.md
    // Input signals:
    // { id: 'in', type: 'input', label: 'in', active: false },

    // Intermediate signals / gates:
    // { id: 'gate_0', type: 'mul', label: '×', active: false },

    // Output:
    // { id: 'out', type: 'output', label: 'out', active: false },
  ],
  edges: [
    // TODO: Add edges connecting nodes
    // { id: 'e0', source: 'in', target: 'gate_0', active: false },
    // { id: 'e1', source: 'gate_0', target: 'out', active: false },
  ],
}

// ─── Steps ───────────────────────────────────────────────────────────────────
// x/y positions are NOT set here — layoutCircuit() handles positioning on mount.
// See docs/technical/dagre-layout.md.

export function generateSteps(): CircuitStep[] {
  const steps: CircuitStep[] = []

  // Step 0 — Initial state (nothing active)
  steps.push({
    title: 'Circuit Overview',
    description: '<title>. This circuit has <constraintCount> constraints.',
    graph: initialGraph,
    totalConstraints: 0,
    satisfiedConstraints: [],
    violatedConstraints: [],
    signals: {},
    codeLine: 1,
  })

  // Step 1 — Assign inputs
  steps.push({
    title: 'Assign Inputs',
    description: 'TODO: Describe what input values are being assigned.',
    graph: {
      ...initialGraph,
      nodes: initialGraph.nodes.map(n =>
        // TODO: Mark input nodes as active
        n.type === 'input' ? { ...n, active: true } : n
      ),
    },
    totalConstraints: 0,
    satisfiedConstraints: [],
    violatedConstraints: [],
    signals: {
      // TODO: Add signal values (use BigInt with n suffix, p=17 for pedagogy)
      // in: 3n,
    },
    codeLine: 1, // TODO: Point to the input signal declaration line
  })

  // TODO: Add intermediate steps for each gate/constraint
  // Pattern:
  // steps.push({
  //   title: 'Constraint N: <description>',
  //   description: 'Show that <signal> = <expression> (mod 17)',
  //   graph: { ...prevGraph, nodes: [...activateNode('gate_N')], edges: [...activateEdge('e_N')] },
  //   totalConstraints: N,
  //   satisfiedConstraints: [0, ..., N-1],
  //   violatedConstraints: [],
  //   signals: { ...prevSignals, gate_N: <value>n },
  //   codeLine: <line number of constraint in circuit.code>,
  // })

  // Final step — all constraints satisfied
  steps.push({
    title: 'All Constraints Satisfied',
    description: 'All <constraintCount> constraints are satisfied. The witness is valid.',
    graph: {
      ...initialGraph,
      nodes: initialGraph.nodes.map(n => ({ ...n, active: true })),
      edges: initialGraph.edges.map(e => ({ ...e, active: true })),
    },
    totalConstraints: <constraintCount>, // TODO: Replace with actual number
    satisfiedConstraints: Array.from({ length: <constraintCount> }, (_, i) => i), // TODO
    violatedConstraints: [],
    signals: {
      // TODO: Final values for all signals
    },
    codeLine: 1, // TODO: Last meaningful line
  })

  return steps
}
```

### Step 5 — Confirm

Report:
```
✓ Scaffold created at src/lib/circuits/<slug>.ts

Next steps:
1. Fill in the circuit.code Circom template
2. Add nodes/edges to initialGraph (see docs/zk/gadgets.md for <gadget> structure)
3. Complete signal values in each step (see docs/technical/witness-generation.md §3)
4. Add r1csRows for constraint testing (see docs/technical/testing-correctness.md §3)
5. Run /zk-review src/lib/circuits/<slug>.ts when done
```
