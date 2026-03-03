# Step Encoding: Writing generateSteps()

> Implementation guide — the complete reference for writing `generateSteps()` functions,
> the core translation layer between ZK circuit knowledge and animated visualization.

---

## Table of Contents

1. [Overview and Philosophy](#1-overview-and-philosophy)
2. [The CircuitStep Interface (Annotated Reference)](#2-the-circuitstep-interface-annotated-reference)
3. [Renderer Dispatch Rules](#3-renderer-dispatch-rules)
4. [Graph State Transitions](#4-graph-state-transitions)
5. [Worked Example 1: Simple Gate Circuit (Catalog 1.2)](#5-worked-example-1-simple-gate-circuit-catalog-12)
6. [Worked Example 2: Boolean Constraint Gadget (Catalog 2.3)](#6-worked-example-2-boolean-constraint-gadget-catalog-23)
7. [Worked Example 3: CostComparison (Catalog 2.1, Bit Decomposition)](#7-worked-example-3-costcomparison-catalog-21-bit-decomposition)
8. [Worked Example 4: PipelineVisualizer (Catalog 1.1, What Is a ZK Proof)](#8-worked-example-4-pipelinevisualizer-catalog-11-what-is-a-zk-proof)
9. [Graph Construction Utilities](#9-graph-construction-utilities)
10. [Code Synchronization Pattern](#10-code-synchronization-pattern)
11. [Constraint Index Convention](#11-constraint-index-convention)
12. [Step Count Guidelines and Common Patterns](#12-step-count-guidelines-and-common-patterns)

---

## 1. Overview and Philosophy

The `generateSteps()` function is the **only place where ZK knowledge meets the rendering engine**. Everything downstream is mechanical:

- **Renderers are dumb.** `CircuitVisualizer`, `PipelineVisualizer`, and `CostComparison` read the step array and display what they are told. They do no computation. They have no knowledge of ZK.
- **All intelligence lives in `generateSteps()`.**  Pre-compute every value, every state transition, every annotation before returning the step array.
- **No computation during playback.** Steps are computed once when the circuit is loaded. The playback engine is a simple array index — `steps[currentStep]`. This is non-negotiable.

This design is why animated visualizations can run at 60fps without any computation during animation: the `requestAnimationFrame` loop does nothing except read `steps[i]` and pass it to the renderer.

See [architecture.md §3](./architecture.md) for the full rationale behind this decision.

**What `generateSteps()` must do:**

1. Define the initial circuit graph (all nodes inactive, no values on edges)
2. Build an array of `CircuitStep` objects, each representing one frame of animation
3. For each step: specify which nodes are active/satisfied/violated, which wires carry values, which code line is highlighted, which constraint is being checked
4. Return the complete array

---

## 2. The CircuitStep Interface (Annotated Reference)

```typescript
interface CircuitStep {
  // ── Renderer selection ───────────────────────────────────────────────────
  // These fields determine which renderer(s) activate for this step.
  // Multiple can be present simultaneously.

  graph?: CircuitGraph;
  // Present → CircuitVisualizer (DAG renderer) activates.
  // Must be a complete snapshot of the graph for this step.
  // NEVER mutate a previous step's graph — always build a new object.

  comparison?: ComparisonState;
  // Present (and graph absent) → CostComparison bar chart activates.
  // Present alongside graph → dual layout: DAG left, bar chart right.

  pipeline?: PipelineState;
  // Present → PipelineVisualizer activates.
  // Mutually exclusive with graph and comparison (use separate steps).

  // ── Constraint tracking ──────────────────────────────────────────────────

  totalConstraints: number;
  // REQUIRED on every step. Running counter: 0 on step 0, increments as
  // constraints are verified. NOT the circuit's total constraint count
  // (which is fixed and known). This is the count of constraints verified
  // SO FAR in the current animation.

  activeConstraints?: number[];
  // Indices of constraints currently being checked (shown as "in progress").
  // 0-based, in topological order of multiplication gates.
  // Multiple simultaneous active constraints are valid.

  satisfiedConstraints?: number[];
  // Indices of constraints confirmed satisfied in this step.
  // Accumulates across steps — a constraint stays satisfied once marked.

  violatedConstraints?: number[];
  // Indices of constraints confirmed violated (witness does not satisfy them).
  // Typically causes a visual error state. Use for "ZK Bug" visualizations.

  // ── Signal values ────────────────────────────────────────────────────────

  signals?: Record<string, bigint>;
  // Signal name → current value mapping.
  // Key: the exact Circom/Noir signal name as written in Circuit.code.
  // Value: BigInt (use 'n' suffix: 3n, 255n, 0n).
  // Values appear as wire labels in the CircuitVisualizer.
  // Absent signals render as unlabeled wires.

  // ── Code synchronization ─────────────────────────────────────────────────

  codeLine?: number;
  // The 1-indexed line number in Circuit.code that is currently executing.
  // Monaco highlights this line with the active-line decoration.
  // Absent → no line highlighted (e.g., during pause steps or descriptions).

  codeAnnotations?: CodeAnnotation[];
  // Inline value annotations shown next to code lines.
  // { line: number, label: string } — e.g., { line: 3, label: "x = 42" }
  // Rendered as Monaco after-line decorations.

  // ── Narrative ────────────────────────────────────────────────────────────

  description?: string;
  // One sentence describing what is happening in this step.
  // Shown in the description panel below the visualization.
  // Should complete the sentence: "Now we are ____."

  insight?: string;
  // The key ZK concept this step illustrates. Shown as a callout card.
  // Optional: only use for steps that introduce a new concept.
  // Example: "Every multiplication gate produces one R1CS constraint."

  label?: string;
  // Short step label for the step navigator breadcrumb (3–6 words).
  // If absent, defaults to "Step N".
}
```

### Interface: CircuitGraph

```typescript
interface CircuitGraph {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

interface CircuitNode {
  id: string;             // Unique, stable across steps (used for dagre layout)
  type: NodeType;         // 'input' | 'gate_mul' | 'gate_add' | 'gate_const' | 'output'
  label: string;          // Display label (signal name, gate symbol, constant value)
  state: NodeState;       // 'inactive' | 'active' | 'satisfied' | 'violated'
  x?: number;             // Set by layoutCircuit() — do NOT set in generateSteps()
  y?: number;             // Set by layoutCircuit() — do NOT set in generateSteps()
}

interface CircuitEdge {
  id: string;             // Unique, stable across steps
  from: string;           // Source node id
  to: string;             // Target node id
  state: EdgeState;       // 'inactive' | 'active' | 'carrying'
  value?: bigint;         // Wire value, shown as edge label when present
}
```

---

## 3. Renderer Dispatch Rules

The rendering engine selects which renderer(s) to show based on which fields are present in the current step:

| `graph` | `comparison` | `pipeline` | Rendered layout |
|---|---|---|---|
| ✓ | — | — | CircuitVisualizer full width |
| — | ✓ | — | CostComparison full width |
| — | — | ✓ | PipelineVisualizer full width |
| ✓ | ✓ | — | Split: DAG left (60%), bar chart right (40%) |
| — | ✓ | ✓ | **Invalid** — do not combine |
| ✓ | — | ✓ | **Invalid** — do not combine |
| ✓ | ✓ | ✓ | **Invalid** — do not combine |
| — | — | — | Description-only step (text panel visible, no visualization) |

**Rule:** `pipeline` is always shown alone. Never combine `pipeline` with `graph` or `comparison`.

**Rule:** If `graph` and `comparison` are both present, the circuit DAG takes the left 60% and the bar chart takes the right 40% of the visualization area.

---

## 4. Graph State Transitions

A `CircuitGraph` is **immutable per step**. Each step must be a complete snapshot of the graph state. The renderer replaces the entire graph on each step — it does not diff or patch.

### Building State Transitions

The pattern is: start with an initial graph, produce modified copies for each subsequent step.

```typescript
// Helper: return a new graph with one node's state changed
function withNodeState(
  graph: CircuitGraph,
  nodeId: string,
  newState: NodeState
): CircuitGraph {
  return {
    ...graph,
    nodes: graph.nodes.map(n =>
      n.id === nodeId ? { ...n, state: newState } : n
    ),
  };
}

// Helper: return a new graph with one edge carrying a value
function withEdgeValue(
  graph: CircuitGraph,
  edgeId: string,
  value: bigint
): CircuitGraph {
  return {
    ...graph,
    edges: graph.edges.map(e =>
      e.id === edgeId ? { ...e, state: 'carrying', value } : e
    ),
  };
}
```

### Standard State Progressions

For a gate that evaluates correctly:
```
inactive → active → satisfied
```

For a gate whose constraint is violated (wrong witness):
```
inactive → active → violated
```

For a wire that receives a value:
```
inactive → carrying (with value)
```

For an input node that is assigned:
```
inactive → active (label updates to show the value)
```

**Never skip states.** If a gate goes from `inactive` to `satisfied` in one step, the user never sees the "gate is being evaluated" moment. Always include an `active` step between `inactive` and `satisfied`.

---

## 5. Worked Example 1: Simple Gate Circuit (Catalog 1.2)

**Circuit:** Compute `a² + b·c` for a=3, b=2, c=4. Result: 9 + 8 = 17.

**Circom code:**
```circom
template SimpleCompute() {
  signal input a;     // line 2
  signal input b;     // line 3
  signal input c;     // line 4
  signal output out;  // line 5

  signal a_sq;        // line 7
  signal bc;          // line 8

  a_sq <== a * a;     // line 10 — constraint 0
  bc <== b * c;       // line 11 — constraint 1
  out <== a_sq + bc;  // line 12 — constraint 2 (addition: no mul gate in R1CS)
}
```

**Full `generateSteps()` implementation:**

```typescript
export function generateSteps(): CircuitStep[] {
  // ── Initial graph (all inactive) ────────────────────────────────────────
  const initial: CircuitGraph = {
    nodes: [
      { id: 'a',     type: 'input',    label: 'a',    state: 'inactive' },
      { id: 'b',     type: 'input',    label: 'b',    state: 'inactive' },
      { id: 'c',     type: 'input',    label: 'c',    state: 'inactive' },
      { id: 'sq',    type: 'gate_mul', label: '×',    state: 'inactive' },
      { id: 'mul',   type: 'gate_mul', label: '×',    state: 'inactive' },
      { id: 'add',   type: 'gate_add', label: '+',    state: 'inactive' },
      { id: 'out',   type: 'output',   label: 'out',  state: 'inactive' },
    ],
    edges: [
      { id: 'a_sq1',  from: 'a',   to: 'sq',  state: 'inactive' },
      { id: 'a_sq2',  from: 'a',   to: 'sq',  state: 'inactive' },
      { id: 'b_mul',  from: 'b',   to: 'mul', state: 'inactive' },
      { id: 'c_mul',  from: 'c',   to: 'mul', state: 'inactive' },
      { id: 'sq_add', from: 'sq',  to: 'add', state: 'inactive' },
      { id: 'mul_add',from: 'mul', to: 'add', state: 'inactive' },
      { id: 'add_out',from: 'add', to: 'out', state: 'inactive' },
    ],
  };

  const steps: CircuitStep[] = [];

  // Step 0: Initial state — everything inactive
  steps.push({
    graph: initial,
    totalConstraints: 0,
    label: 'Circuit Overview',
    description: 'The circuit computes a² + b·c. All gates are inactive.',
    codeLine: 1,
  });

  // Step 1: Inject inputs a=3, b=2, c=4
  let g = initial;
  g = withNodeState(g, 'a', 'active');
  g = withNodeState(g, 'b', 'active');
  g = withNodeState(g, 'c', 'active');

  steps.push({
    graph: g,
    totalConstraints: 0,
    label: 'Input Injection',
    description: 'Assign inputs: a=3, b=2, c=4.',
    signals: { a: 3n, b: 2n, c: 4n },
    codeLine: 2,
    insight: 'Inputs are assigned by the prover as part of the witness.',
  });

  // Step 2: Wire values flow to squaring gate
  g = withEdgeValue(g, 'a_sq1', 3n);
  g = withEdgeValue(g, 'a_sq2', 3n);
  g = withNodeState(g, 'sq', 'active');

  steps.push({
    graph: g,
    totalConstraints: 0,
    activeConstraints: [0],
    label: 'Compute a²',
    description: 'Values flow along wires to the squaring gate. Gate is being evaluated.',
    signals: { a: 3n, b: 2n, c: 4n },
    codeLine: 10,
  });

  // Step 3: Squaring gate produces a² = 9; constraint 0 satisfied
  g = withEdgeValue(g, 'sq_add', 9n);
  g = withNodeState(g, 'sq', 'satisfied');

  steps.push({
    graph: g,
    totalConstraints: 1,
    satisfiedConstraints: [0],
    label: 'a² = 9 ✓',
    description: 'The multiplication gate outputs a² = 9. Constraint 0 is satisfied.',
    signals: { a: 3n, b: 2n, c: 4n, a_sq: 9n },
    codeLine: 10,
    insight: 'Each multiplication gate creates one R1CS constraint: a·a = a_sq.',
  });

  // Step 4: Wires flow to bc gate
  g = withEdgeValue(g, 'b_mul', 2n);
  g = withEdgeValue(g, 'c_mul', 4n);
  g = withNodeState(g, 'mul', 'active');

  steps.push({
    graph: g,
    totalConstraints: 1,
    satisfiedConstraints: [0],
    activeConstraints: [1],
    label: 'Compute b·c',
    description: 'Values 2 and 4 flow to the multiplication gate for b·c.',
    signals: { a: 3n, b: 2n, c: 4n, a_sq: 9n },
    codeLine: 11,
  });

  // Step 5: b·c = 8; constraint 1 satisfied
  g = withEdgeValue(g, 'mul_add', 8n);
  g = withNodeState(g, 'mul', 'satisfied');

  steps.push({
    graph: g,
    totalConstraints: 2,
    satisfiedConstraints: [0, 1],
    label: 'b·c = 8 ✓',
    description: 'The multiplication gate outputs b·c = 8. Constraint 1 is satisfied.',
    signals: { a: 3n, b: 2n, c: 4n, a_sq: 9n, bc: 8n },
    codeLine: 11,
  });

  // Step 6: Addition gate (no new mul constraint)
  g = withNodeState(g, 'add', 'active');

  steps.push({
    graph: g,
    totalConstraints: 2,
    satisfiedConstraints: [0, 1],
    label: 'Compute a² + b·c',
    description: 'The addition gate computes 9 + 8. Additions are free — no new constraint.',
    signals: { a: 3n, b: 2n, c: 4n, a_sq: 9n, bc: 8n },
    codeLine: 12,
    insight: 'Addition gates are "free" in R1CS — they do not add multiplication constraints.',
  });

  // Step 7: Output
  g = withEdgeValue(g, 'add_out', 17n);
  g = withNodeState(g, 'add', 'satisfied');
  g = withNodeState(g, 'out', 'active');

  steps.push({
    graph: g,
    totalConstraints: 2,
    satisfiedConstraints: [0, 1],
    label: 'Output: 17',
    description: 'Circuit output: a² + b·c = 9 + 8 = 17. All 2 constraints satisfied.',
    signals: { a: 3n, b: 2n, c: 4n, a_sq: 9n, bc: 8n, out: 17n },
    codeLine: 5,
  });

  return steps;
}
```

---

## 6. Worked Example 2: Boolean Constraint Gadget (Catalog 2.3)

**Circuit:** The boolean constraint `x*(1-x) = 0`. Shows two execution traces: `x=1` (satisfied) and `x=2` (violated).

**Circom code:**
```circom
template BooleanCheck() {
  signal input x;       // line 2
  signal output valid;  // line 3

  signal one_minus_x;   // line 5
  signal product;       // line 6

  one_minus_x <-- 1 - x;        // line 8
  product <== x * one_minus_x;  // line 9 — constraint 0
  valid <== product === 0;       // line 10
}
```

**Full `generateSteps()` for both traces:**

```typescript
export function generateSteps(): CircuitStep[] {
  // Initial graph
  const initial: CircuitGraph = {
    nodes: [
      { id: 'x',     type: 'input',    label: 'x',        state: 'inactive' },
      { id: 'sub',   type: 'gate_add', label: '1-x',      state: 'inactive' },
      { id: 'mul',   type: 'gate_mul', label: '×',        state: 'inactive' },
      { id: 'out',   type: 'output',   label: 'product',  state: 'inactive' },
    ],
    edges: [
      { id: 'x_sub',  from: 'x',   to: 'sub', state: 'inactive' },
      { id: 'x_mul',  from: 'x',   to: 'mul', state: 'inactive' },
      { id: 'sub_mul',from: 'sub', to: 'mul', state: 'inactive' },
      { id: 'mul_out',from: 'mul', to: 'out', state: 'inactive' },
    ],
  };

  const steps: CircuitStep[] = [];

  // ── TRACE 1: x = 1 (valid boolean) ──────────────────────────────────────

  // Step 0: Overview
  steps.push({
    graph: initial,
    totalConstraints: 0,
    label: 'Boolean Check',
    description: 'The boolean constraint x·(1−x)=0 forces x to be 0 or 1.',
    codeLine: 1,
    insight: 'In ZK circuits, "boolean" is enforced by a constraint, not a type.',
  });

  // Step 1: Inject x = 1
  let g = initial;
  g = withNodeState(g, 'x', 'active');
  g = withEdgeValue(g, 'x_sub', 1n);
  g = withEdgeValue(g, 'x_mul', 1n);

  steps.push({
    graph: g,
    totalConstraints: 0,
    label: 'x = 1',
    description: 'Assign x = 1. This is a valid boolean value.',
    signals: { x: 1n },
    codeLine: 8,
  });

  // Step 2: Compute 1 - x = 0
  g = withNodeState(g, 'sub', 'active');
  g = withEdgeValue(g, 'sub_mul', 0n);

  steps.push({
    graph: g,
    totalConstraints: 0,
    activeConstraints: [0],
    label: 'Compute 1−x',
    description: 'Compute 1 − x = 1 − 1 = 0.',
    signals: { x: 1n, one_minus_x: 0n },
    codeLine: 8,
  });

  // Step 3: Evaluate x * (1-x) = 1 * 0 = 0 → satisfied
  g = withNodeState(g, 'sub', 'satisfied');
  g = withNodeState(g, 'mul', 'active');

  steps.push({
    graph: g,
    totalConstraints: 0,
    activeConstraints: [0],
    label: 'Multiply',
    description: 'Multiply x · (1−x) = 1 · 0 = 0.',
    signals: { x: 1n, one_minus_x: 0n },
    codeLine: 9,
  });

  // Step 4: Constraint satisfied
  g = withNodeState(g, 'mul', 'satisfied');
  g = withEdgeValue(g, 'mul_out', 0n);
  g = withNodeState(g, 'out', 'active');

  steps.push({
    graph: g,
    totalConstraints: 1,
    satisfiedConstraints: [0],
    label: 'Constraint Satisfied ✓',
    description: 'Product = 0. Constraint x·(1−x)=0 is satisfied. x=1 is a valid boolean.',
    signals: { x: 1n, one_minus_x: 0n, product: 0n },
    codeLine: 10,
    insight: 'x=0 also satisfies the constraint: 0·(1−0) = 0·1 = 0. No other value works.',
  });

  // ── RESET STEP ───────────────────────────────────────────────────────────

  steps.push({
    graph: initial,
    totalConstraints: 0,
    label: 'Reset — try x = 2',
    description: 'Now let\'s try x = 2, a non-boolean value. The constraint should fail.',
    codeLine: 1,
  });

  // ── TRACE 2: x = 2 (invalid boolean) ────────────────────────────────────

  // Step 6: Inject x = 2
  let g2 = initial;
  g2 = withNodeState(g2, 'x', 'active');
  g2 = withEdgeValue(g2, 'x_sub', 2n);
  g2 = withEdgeValue(g2, 'x_mul', 2n);

  steps.push({
    graph: g2,
    totalConstraints: 0,
    label: 'x = 2',
    description: 'Assign x = 2. Not a boolean value.',
    signals: { x: 2n },
    codeLine: 8,
  });

  // Step 7: Compute 1 - 2 = -1 (mod p = p-1)
  // For pedagogical display: show as -1 with note that mod p it wraps
  const p_minus_1 = 16n; // using p=17 for display

  g2 = withNodeState(g2, 'sub', 'active');
  g2 = withEdgeValue(g2, 'sub_mul', p_minus_1);

  steps.push({
    graph: g2,
    totalConstraints: 0,
    activeConstraints: [0],
    label: 'Compute 1−x = −1',
    description: 'Compute 1 − x = 1 − 2 = −1 (shown as p−1 = 16 mod 17).',
    signals: { x: 2n, one_minus_x: p_minus_1 },
    codeLine: 8,
    insight: 'Fields have no negative numbers — subtraction wraps around the field modulus.',
  });

  // Step 8: Evaluate 2 * (p-1) = p-2 ≠ 0
  const result = 15n; // 2 * 16 mod 17 = 32 mod 17 = 15

  g2 = withNodeState(g2, 'sub', 'satisfied'); // sub computed correctly; mul will violate
  g2 = withNodeState(g2, 'mul', 'active');

  steps.push({
    graph: g2,
    totalConstraints: 0,
    activeConstraints: [0],
    label: 'Multiply',
    description: 'Multiply x · (1−x) = 2 · 16 = 32 ≡ 15 (mod 17). This is not 0.',
    signals: { x: 2n, one_minus_x: p_minus_1 },
    codeLine: 9,
  });

  // Step 9: Constraint violated
  g2 = withNodeState(g2, 'mul', 'violated');
  g2 = withEdgeValue(g2, 'mul_out', result);
  g2 = withNodeState(g2, 'out', 'violated');

  steps.push({
    graph: g2,
    totalConstraints: 0,
    violatedConstraints: [0],
    label: 'Constraint Violated ✗',
    description: 'Product = 15 ≠ 0. Constraint x·(1−x)=0 is VIOLATED. x=2 is not boolean.',
    signals: { x: 2n, one_minus_x: p_minus_1, product: result },
    codeLine: 10,
    insight: 'A violated constraint means the prover cannot generate a valid proof for this witness.',
  });

  return steps;
}
```

---

## 7. Worked Example 3: CostComparison (Catalog 2.1, Bit Decomposition)

**Circuit:** Naive range check (256 constraints, 8-bit decomposition) vs optimized decomposition (8 constraints). Uses `comparison` field — no `graph`.

```typescript
export function generateSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  // Initial comparison state — both sides at 0
  const initial: ComparisonState = {
    label: '8-bit Range Check: Constraint Cost',
    left: {
      label: 'Naive (bit-by-bit)',
      constraintCount: 0,
      maxConstraints: 256,
      description: 'Check every bit of every bit of the range',
      color: 'highlightCostly',
    },
    right: {
      label: 'Bit Decomposition',
      constraintCount: 0,
      maxConstraints: 8,
      description: 'Decompose into 8 boolean bits',
      color: 'highlightEfficient',
    },
  };

  steps.push({
    comparison: initial,
    totalConstraints: 0,
    label: 'Range Check: Two Approaches',
    description: 'Prove a value is in range [0, 255]. Two approaches — let\'s count the constraints.',
    insight: 'Constraint count determines proof generation time. Fewer is always better.',
  });

  // Animate naive approach growing to 256
  for (let i = 1; i <= 8; i++) {
    steps.push({
      comparison: {
        ...initial,
        left: { ...initial.left, constraintCount: i * 32 },
      },
      totalConstraints: i * 32,
      label: `Naive: ${i * 32} constraints`,
      description: `Adding ${i * 32} constraints so far for the naive approach.`,
    });
  }

  // Naive complete at 256
  steps.push({
    comparison: {
      ...initial,
      left: { ...initial.left, constraintCount: 256 },
    },
    totalConstraints: 256,
    label: 'Naive: 256 constraints',
    description: 'The naive approach requires 256 constraints — one per possible bit position checked.',
    insight: 'Checking "is value < 256" naively requires proving no bit above position 7 is set.',
  });

  // Now animate optimized approach growing 1 bit at a time
  for (let bit = 1; bit <= 8; bit++) {
    steps.push({
      comparison: {
        ...initial,
        left: { ...initial.left, constraintCount: 256 },
        right: { ...initial.right, constraintCount: bit },
      },
      totalConstraints: 256 + bit,
      label: `Bit decomp: ${bit} bit${bit > 1 ? 's' : ''}`,
      description: `Boolean constraint for bit ${bit - 1}: b${bit - 1}·(1−b${bit - 1}) = 0.`,
    });
  }

  // Final comparison
  steps.push({
    comparison: {
      ...initial,
      left: { ...initial.left, constraintCount: 256 },
      right: { ...initial.right, constraintCount: 8 },
    },
    totalConstraints: 264,
    label: 'Result: 256 vs 8',
    description: 'Bit decomposition uses only 8 constraints — a 32× improvement over the naive approach.',
    insight: 'Decompose n into k bits, each proved boolean. Total cost: k constraints for a 2^k range check.',
  });

  return steps;
}
```

---

## 8. Worked Example 4: PipelineVisualizer (Catalog 1.1, What Is a ZK Proof)

**Circuit:** The prover-verifier pipeline: Witness → Circuit → Prover → Proof → Verifier → Accept/Reject.

```typescript
export function generateSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  const stages = [
    'witness', 'circuit', 'prover', 'proof', 'verifier', 'result',
  ] as const;

  // Helper: build pipeline state with one active stage
  function pipelineAt(active: typeof stages[number]): PipelineState {
    return {
      stages: [
        {
          id: 'witness',
          label: 'Witness',
          description: 'Private inputs: a, b, c and all intermediate values',
          state: active === 'witness' ? 'active' :
                 stages.indexOf(active) > 0 ? 'satisfied' : 'inactive',
          icon: 'lock', // private data
        },
        {
          id: 'circuit',
          label: 'Circuit',
          description: 'The constraint system (public)',
          state: active === 'circuit' ? 'active' :
                 stages.indexOf(active) > 1 ? 'satisfied' : 'inactive',
          icon: 'grid',
        },
        {
          id: 'prover',
          label: 'Prover',
          description: 'Generates the proof (knows the witness)',
          state: active === 'prover' ? 'active' :
                 stages.indexOf(active) > 2 ? 'satisfied' : 'inactive',
          icon: 'cpu',
        },
        {
          id: 'proof',
          label: 'Proof',
          description: '~200 bytes (Groth16) — contains no witness information',
          state: active === 'proof' ? 'active' :
                 stages.indexOf(active) > 3 ? 'satisfied' : 'inactive',
          icon: 'file',
          // The knowledge barrier: the proof travels from prover to verifier
          // but carries NO information about the private inputs
          isKnowledgeBarrier: true,
        },
        {
          id: 'verifier',
          label: 'Verifier',
          description: 'Checks the proof using only public inputs + proof',
          state: active === 'verifier' ? 'active' :
                 stages.indexOf(active) > 4 ? 'satisfied' : 'inactive',
          icon: 'check-circle',
        },
        {
          id: 'result',
          label: 'Accept / Reject',
          description: 'Binary decision: is the proof valid?',
          state: active === 'result' ? 'satisfied' : 'inactive',
          icon: 'flag',
        },
      ],
      arrows: [
        { from: 'witness', to: 'circuit', label: 'fed into' },
        { from: 'circuit', to: 'prover', label: 'constrains' },
        { from: 'prover', to: 'proof', label: 'generates' },
        { from: 'proof', to: 'verifier', label: 'sent to' },
        { from: 'verifier', to: 'result', label: 'outputs' },
      ],
    };
  }

  steps.push({
    pipeline: pipelineAt('witness'),
    totalConstraints: 0,
    label: 'The Witness',
    description: 'The prover knows the secret witness: private inputs and all intermediate values.',
    codeLine: 1,
    insight: 'The witness is everything the prover knows — it satisfies the circuit constraints.',
  });

  steps.push({
    pipeline: pipelineAt('circuit'),
    totalConstraints: 0,
    label: 'The Circuit',
    description: 'The circuit (constraint system) is public. Both prover and verifier know it.',
    insight: 'The circuit defines WHAT must be true, without specifying the witness values.',
  });

  steps.push({
    pipeline: pipelineAt('prover'),
    totalConstraints: 0,
    label: 'The Prover',
    description: 'The prover uses the witness + circuit to generate a proof. This is computationally expensive.',
    insight: 'Proof generation is the bottleneck: seconds to minutes depending on circuit size.',
  });

  steps.push({
    pipeline: pipelineAt('proof'),
    totalConstraints: 0,
    label: 'The Proof',
    description: 'The proof is ~200 bytes (Groth16). It contains NO information about the private witness.',
    insight: 'Zero-knowledge: the proof reveals nothing about the witness beyond what the statement claims.',
  });

  steps.push({
    pipeline: pipelineAt('verifier'),
    totalConstraints: 0,
    label: 'The Verifier',
    description: 'The verifier checks the proof using only the proof + public inputs. Fast: milliseconds.',
    insight: 'Verification uses only public information. The verifier never sees the witness.',
  });

  steps.push({
    pipeline: pipelineAt('result'),
    totalConstraints: 0,
    label: 'Accept / Reject',
    description: 'The verifier outputs Accept or Reject. If the proof is valid, the statement is proven.',
  });

  return steps;
}
```

---

## 9. Graph Construction Utilities

Recommended helper functions to define alongside your `generateSteps()`:

```typescript
// Create a node with default inactive state
function createNode(
  id: string,
  type: CircuitNode['type'],
  label: string
): CircuitNode {
  return { id, type, label, state: 'inactive' };
  // Do NOT set x or y — layoutCircuit() handles positioning
}

// Create an edge with default inactive state
function createEdge(
  id: string,
  from: string,
  to: string
): CircuitEdge {
  return { id, from, to, state: 'inactive' };
}

// Return a new graph with one node's state changed
function withNodeState(
  graph: CircuitGraph,
  nodeId: string,
  newState: NodeState
): CircuitGraph {
  return {
    ...graph,
    nodes: graph.nodes.map(n =>
      n.id === nodeId ? { ...n, state: newState } : n
    ),
  };
}

// Return a new graph with one edge carrying a value
function withEdgeValue(
  graph: CircuitGraph,
  edgeId: string,
  value: bigint
): CircuitGraph {
  return {
    ...graph,
    edges: graph.edges.map(e =>
      e.id === edgeId ? { ...e, state: 'carrying', value } : e
    ),
  };
}

// Mark a constraint satisfied and increment the counter
// (use when building the step — not a graph mutation)
function satisfiedStep(
  prevStep: CircuitStep,
  constraintIdx: number
): Partial<CircuitStep> {
  return {
    totalConstraints: prevStep.totalConstraints + 1,
    satisfiedConstraints: [
      ...(prevStep.satisfiedConstraints ?? []),
      constraintIdx,
    ],
    activeConstraints: (prevStep.activeConstraints ?? []).filter(
      i => i !== constraintIdx
    ),
  };
}
```

**Note on x/y coordinates:** Never set `x` or `y` in `generateSteps()`. The `layoutCircuit()` function in [`dagre-layout.md`](./dagre-layout.md) computes positions before the first render and stores them in the component state. The step array only needs node ids and edges — positions are applied once and reused.

---

## 10. Code Synchronization Pattern

The `codeLine` field is 1-indexed and must match the line number in `Circuit.code`. The `code` string is the canonical Circom/Noir source that the Monaco editor renders.

**Convention:** Comment each Circom template line with the step index it corresponds to in a separate file.

**`src/lib/circuits/bit-decomp.ts`:**
```typescript
export const bitDecompCircuit: Circuit = {
  id: 'bit-decomposition',
  code: `
template BitDecomp(k) {
  signal input n;         // injected at step 1
  signal output bits[k];  // populated at steps 2–9

  for (var i = 0; i < k; i++) {
    bits[i] <-- (n >> i) & 1;           // step 2 + i
    bits[i] * (1 - bits[i]) === 0;      // step 2 + i + 1 (constraint i)
  }

  var sum = 0;
  for (var i = 0; i < k; i++) {
    sum += bits[i] * (2 ** i);
  }
  sum === n;  // final constraint, step 2 + 2k
}
`.trim(),
  // ...
};
```

**Maintaining sync when code changes:** Always update `generateSteps()` and `Circuit.code` in the same commit. The `codeLine` references in step objects should be updated whenever line numbers change. Automated tests should verify that every non-null `codeLine` in the step array is a valid line number (≤ the total line count of `Circuit.code`). See [testing-correctness.md](./testing-correctness.md) for the full test strategy.

---

## 11. Constraint Index Convention

Constraints are indexed **0-based** in the order they appear in the circuit's R1CS: **topological order of multiplication gates** (top-to-bottom, left-to-right in the DAG).

```
Circuit: a*b → (a*b)*c → output

Multiplication gate order (topological):
  Gate 0: a × b      → constraint index 0
  Gate 1: (a·b) × c  → constraint index 1

In generateSteps():
  activeConstraints: [0]       // checking gate 0
  satisfiedConstraints: [0]    // gate 0 confirmed satisfied
  activeConstraints: [1]       // checking gate 1
  satisfiedConstraints: [0, 1] // both satisfied
```

**`activeConstraints`** — constraint is currently being evaluated. Show the gate as `'active'`.

**`satisfiedConstraints`** — constraint is confirmed satisfied. The list accumulates across steps (past satisfied constraints remain in the list). Show the gate as `'satisfied'`.

**`violatedConstraints`** — constraint is confirmed violated. Triggers red error state. Use only for "ZK Bug" visualizations. The proof generation fails for any violated constraint.

Multiple constraints can be active simultaneously for parallel sub-circuits, but in most sequential visualizations only one constraint is active at a time.

---

## 12. Step Count Guidelines and Common Patterns

### Recommended Step Counts by Type

| Visualization type | Minimum steps | Recommended steps | Max useful steps |
|---|---|---|---|
| Simple gate circuit (≤ 5 gates) | 5 | 8–12 | 20 |
| Boolean gadget (with violated trace) | 8 | 12–16 | 25 |
| CostComparison (bar chart) | 4 | 8–15 | 25 |
| Pipeline (6 stages) | 6 | 6–8 | 12 |
| Merkle path (20 levels) | 10 | 20–25 | 40 |
| SplitView (two circuits) | 10 | 15–20 | 35 |

### Common Step Patterns (Quick Reference)

| Pattern name | Fields to set | State changes |
|---|---|---|
| **Initial state** | `graph` (all inactive), `totalConstraints: 0` | — |
| **Input injection** | `graph` (inputs active), `signals`, `codeLine` | Input nodes: inactive → active |
| **Wire propagation** | `graph` (edges carrying), `signals` | Edges: inactive → carrying |
| **Gate activation** | `graph`, `activeConstraints`, `codeLine` | Gate node: inactive → active |
| **Constraint satisfied** | `graph`, `satisfiedConstraints`, `totalConstraints++` | Gate node: active → satisfied |
| **Constraint violated** | `graph`, `violatedConstraints`, `insight` | Gate node: active → violated |
| **Key insight callout** | Any renderer, `insight` | No state change — pause for emphasis |
| **Final output** | `graph` (output active), `signals` (output value) | Output node: inactive → active |
| **Reset** | `graph` (all inactive), `totalConstraints: 0` | All nodes → inactive |
