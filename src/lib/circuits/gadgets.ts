import type {
  Circuit,
  SplitViewCircuit,
  CircuitStep,
  CircuitGraph,
  CircuitNode,
  CircuitEdge,
} from '../types';
import {
  createNode,
  createEdge,
  buildGraph,
  withNodeState,
  withNodeStates,
  withEdgeValue,
  withEdgeValues,
  fieldMul,
  fieldSub,
  fieldAdd,
  SMALL_PRIME,
} from './shared';

// ── 2.1  Bit Decomposition ──────────────────────────────────────────

const NAIVE_BITDECOMP_CODE = `template NaiveBitDecomp() {
    signal input n;
    signal output out;

    // Test every possible value 0..255
    // Constraint: n × (n - i) = 0 for each i
    var prod = 1;
    for (var i = 0; i < 256; i++) {
        prod *= (n - i);
    }
    out <== prod;
    // 256 multiplication constraints!
}`;

const OPTIMIZED_BITDECOMP_CODE = `template BitDecomp(N) {
    signal input n;
    signal output bits[N];

    var sum = 0;
    for (var i = 0; i < N; i++) {
        bits[i] <-- (n >> i) & 1;
        // Boolean check: bits[i] is 0 or 1
        bits[i] * (1 - bits[i]) === 0;
        sum += bits[i] * (1 << i);
    }
    // Reconstruction check (linear, free)
    sum === n;
}`;

function generateNaiveBitDecompSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const p = SMALL_PRIME;
  const n = 6n;

  // Step 0: Introduce the problem
  steps.push({
    totalConstraints: 256,
    description: 'Naive approach: test every possible value from 0 to 255. Each test costs 1 multiplication constraint.',
    insight: 'This brute-force method has O(2^n) constraints — impractical for real circuits.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Step 1: Show input
  const inputNode = createNode('n', 'input', 'n', false);
  const graph0 = buildGraph([{ ...inputNode, state: 'active' as const }], []);
  steps.push({
    graph: graph0,
    totalConstraints: 256,
    description: 'Input signal n = 6. We need to prove n is in range [0, 255].',
    signals: { n: 6n },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Steps 2-6: Show constraints accumulating rapidly
  const checkCounts = [1, 8, 32, 128, 256];
  for (let i = 0; i < checkCounts.length; i++) {
    const count = checkCounts[i];
    const satisfied = Array.from({ length: count }, (_, j) => j);
    steps.push({
      graph: graph0,
      totalConstraints: 256,
      description: `Checking n × (n - ${count - 1}) = 0... ${count} of 256 constraints evaluated.`,
      signals: { n: 6n },
      satisfiedConstraints: satisfied,
      codeLine: 8,
    });
  }

  // Step 7: Final state
  steps.push({
    graph: graph0,
    totalConstraints: 256,
    satisfiedConstraints: Array.from({ length: 256 }, (_, i) => i),
    description: 'All 256 constraints checked. The circuit works but costs 256 multiplication gates.',
    insight: 'For a 32-bit range, this would need 4 billion constraints!',
    codeLine: 11,
    signals: { n: 6n },
    comparison: {
      bars: [
        { label: 'Naive (test all)', value: 256, maxValue: 256, color: 'costly' },
      ],
    },
  });

  return steps;
}

function generateOptimizedBitDecompSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const n = 6n;

  // Build the circuit graph for optimized approach
  const nodes: CircuitNode[] = [
    createNode('n', 'input', 'n', false),
    createNode('b0', 'gate_const', 'b₀'),
    createNode('b1', 'gate_const', 'b₁'),
    createNode('b2', 'gate_const', 'b₂'),
    createNode('mul0', 'gate_mul', '×'),
    createNode('mul1', 'gate_mul', '×'),
    createNode('mul2', 'gate_mul', '×'),
    createNode('neg0', 'gate_const', '1-b₀'),
    createNode('neg1', 'gate_const', '1-b₁'),
    createNode('neg2', 'gate_const', '1-b₂'),
    createNode('sum', 'gate_add', '+'),
    createNode('out', 'output', 'n'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_b0_mul0', 'b0', 'mul0'),
    createEdge('e_neg0_mul0', 'neg0', 'mul0'),
    createEdge('e_b1_mul1', 'b1', 'mul1'),
    createEdge('e_neg1_mul1', 'neg1', 'mul1'),
    createEdge('e_b2_mul2', 'b2', 'mul2'),
    createEdge('e_neg2_mul2', 'neg2', 'mul2'),
    createEdge('e_b0_sum', 'b0', 'sum'),
    createEdge('e_b1_sum', 'b1', 'sum'),
    createEdge('e_b2_sum', 'b2', 'sum'),
    createEdge('e_sum_out', 'sum', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  // Step 0: Introduce approach
  steps.push({
    totalConstraints: 3,
    description: 'Optimized: decompose n into individual bits, check each is boolean.',
    insight: 'Bit decomposition uses only N constraints for an N-bit number!',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Step 1: Show input
  steps.push({
    graph: withNodeState(baseGraph, 'n', 'active'),
    totalConstraints: 3,
    description: 'Input n = 6. In binary: 110. We extract bits b₀=0, b₁=1, b₂=1.',
    signals: { n: 6n },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Step 2: Extract bits (witness assignment)
  let g = withNodeStates(baseGraph, { n: 'active', b0: 'active', b1: 'active', b2: 'active' });
  g = withEdgeValue(g, 'e_b0_sum', 0n);
  g = withEdgeValue(g, 'e_b1_sum', 1n);
  g = withEdgeValue(g, 'e_b2_sum', 1n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Extract bits: b₀ = 0, b₁ = 1, b₂ = 1. These are witness values (unchecked).',
    signals: { n: 6n, b0: 0n, b1: 1n, b2: 1n },
    codeLine: 8,
    satisfiedConstraints: [],
  });

  // Step 3: Compute 1-b_i
  g = withNodeStates(g, { neg0: 'active', neg1: 'active', neg2: 'active' });
  g = withEdgeValue(g, 'e_neg0_mul0', 1n);
  g = withEdgeValue(g, 'e_neg1_mul1', 0n);
  g = withEdgeValue(g, 'e_neg2_mul2', 0n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: '1 - b₀ = 1, 1 - b₁ = 0, 1 - b₂ = 0. Preparing boolean constraints.',
    signals: { n: 6n, b0: 0n, b1: 1n, b2: 1n, '1-b0': 1n, '1-b1': 0n, '1-b2': 0n },
    codeLine: 10,
    satisfiedConstraints: [],
  });

  // Step 4: Boolean check b0: 0 × 1 = 0 ✓
  g = withNodeStates(g, { mul0: 'satisfied' });
  g = withEdgeValue(g, 'e_b0_mul0', 0n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Constraint 0: b₀ × (1 - b₀) = 0 × 1 = 0 ✓  (b₀ is boolean)',
    signals: { n: 6n, b0: 0n, 'b0×(1-b0)': 0n },
    codeLine: 10,
    satisfiedConstraints: [0],
    activeConstraints: [0],
  });

  // Step 5: Boolean check b1: 1 × 0 = 0 ✓
  g = withNodeStates(g, { mul1: 'satisfied' });
  g = withEdgeValue(g, 'e_b1_mul1', 1n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Constraint 1: b₁ × (1 - b₁) = 1 × 0 = 0 ✓  (b₁ is boolean)',
    signals: { n: 6n, b1: 1n, 'b1×(1-b1)': 0n },
    codeLine: 10,
    satisfiedConstraints: [0, 1],
    activeConstraints: [1],
  });

  // Step 6: Boolean check b2: 1 × 0 = 0 ✓
  g = withNodeStates(g, { mul2: 'satisfied' });
  g = withEdgeValue(g, 'e_b2_mul2', 1n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Constraint 2: b₂ × (1 - b₂) = 1 × 0 = 0 ✓  (b₂ is boolean)',
    signals: { n: 6n, b2: 1n, 'b2×(1-b2)': 0n },
    codeLine: 10,
    satisfiedConstraints: [0, 1, 2],
    activeConstraints: [2],
  });

  // Step 7: Reconstruction (linear — free!)
  g = withNodeStates(g, { sum: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_sum_out', 6n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Reconstruction: 0·1 + 1·2 + 1·4 = 6 = n ✓  (Linear constraint — no multiplication gate!)',
    insight: 'Linear constraints are FREE in R1CS. Only multiplications cost constraints.',
    signals: { n: 6n, sum: 6n },
    codeLine: 14,
    satisfiedConstraints: [0, 1, 2],
  });

  // Step 8: Final comparison
  steps.push({
    graph: g,
    totalConstraints: 3,
    satisfiedConstraints: [0, 1, 2],
    description: 'Only 3 constraints for 3-bit number! For 8-bit: 8 constraints vs 256 naive.',
    comparison: {
      bars: [
        { label: 'Naive (test all)', value: 256, maxValue: 256, color: 'costly' },
        { label: 'Bit decomp (8-bit)', value: 8, maxValue: 256, color: 'efficient' },
      ],
    },
    codeLine: 14,
    signals: { n: 6n },
  });

  return steps;
}

export const bitDecompositionCircuit: SplitViewCircuit = {
  id: '2.1',
  title: 'Bit Decomposition',
  category: '2',
  difficulty: 2,
  code: OPTIMIZED_BITDECOMP_CODE,
  language: 'circom',
  generateSteps: generateOptimizedBitDecompSteps,
  naive: {
    code: NAIVE_BITDECOMP_CODE,
    generateSteps: generateNaiveBitDecompSteps,
    label: 'Naive (256 constraints)',
  },
  optimized: {
    code: OPTIMIZED_BITDECOMP_CODE,
    generateSteps: generateOptimizedBitDecompSteps,
    label: 'Optimized (8 constraints)',
  },
  syncStrategy: 'hold-last-frame',
};

// ── 2.2  Range Check ────────────────────────────────────────────────

const RANGE_CHECK_CODE = `template RangeCheck(N) {
    signal input x;
    signal bits[N];

    var sum = 0;
    for (var i = 0; i < N; i++) {
        bits[i] <-- (x >> i) & 1;
        bits[i] * (1 - bits[i]) === 0;
        sum += bits[i] * (1 << i);
    }
    sum === x;
    // If x can be decomposed into N bits,
    // then x is in [0, 2^N - 1]
}`;

function generateRangeCheckSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const x = 5n; // 101 in binary

  const nodes: CircuitNode[] = [
    createNode('x', 'input', 'x', false),
    createNode('b0', 'gate_const', 'b₀'),
    createNode('b1', 'gate_const', 'b₁'),
    createNode('b2', 'gate_const', 'b₂'),
    createNode('mul0', 'gate_mul', '×'),
    createNode('mul1', 'gate_mul', '×'),
    createNode('mul2', 'gate_mul', '×'),
    createNode('sum', 'gate_add', '+'),
    createNode('out', 'output', 'x'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_b0_mul0', 'b0', 'mul0'),
    createEdge('e_b1_mul1', 'b1', 'mul1'),
    createEdge('e_b2_mul2', 'b2', 'mul2'),
    createEdge('e_b0_sum', 'b0', 'sum'),
    createEdge('e_b1_sum', 'b1', 'sum'),
    createEdge('e_b2_sum', 'b2', 'sum'),
    createEdge('e_sum_out', 'sum', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  steps.push({
    totalConstraints: 3,
    description: 'Range check: prove x is in [0, 7] by decomposing into 3 bits.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  steps.push({
    graph: withNodeState(baseGraph, 'x', 'active'),
    totalConstraints: 3,
    description: 'Input x = 5. Binary: 101. Extract bits b₀=1, b₁=0, b₂=1.',
    signals: { x: 5n },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  let g = withNodeStates(baseGraph, { x: 'active', b0: 'active', b1: 'active', b2: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Witness: b₀=1, b₁=0, b₂=1. Now check each bit is boolean.',
    signals: { x: 5n, b0: 1n, b1: 0n, b2: 1n },
    codeLine: 7,
    satisfiedConstraints: [],
  });

  g = withNodeStates(g, { mul0: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'b₀ × (1 - b₀) = 1 × 0 = 0 ✓',
    satisfiedConstraints: [0],
    codeLine: 8,
    signals: { x: 5n, b0: 1n },
  });

  g = withNodeStates(g, { mul1: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'b₁ × (1 - b₁) = 0 × 1 = 0 ✓',
    satisfiedConstraints: [0, 1],
    codeLine: 8,
    signals: { x: 5n, b1: 0n },
  });

  g = withNodeStates(g, { mul2: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'b₂ × (1 - b₂) = 1 × 0 = 0 ✓',
    satisfiedConstraints: [0, 1, 2],
    codeLine: 8,
    signals: { x: 5n, b2: 1n },
  });

  g = withNodeStates(g, { sum: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_sum_out', 5n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    satisfiedConstraints: [0, 1, 2],
    description: 'Reconstruction: 1·1 + 0·2 + 1·4 = 5 = x ✓. Range proven: x ∈ [0, 7].',
    insight: 'If any bit were not 0 or 1, the boolean constraint would fail. If x > 7, the 3-bit decomposition would fail.',
    codeLine: 11,
    signals: { x: 5n, sum: 5n },
  });

  return steps;
}

export const rangeCheckCircuit: Circuit = {
  id: '2.2',
  title: 'Range Check',
  category: '2',
  difficulty: 1,
  code: RANGE_CHECK_CODE,
  language: 'circom',
  generateSteps: generateRangeCheckSteps,
};

// ── 2.3  Boolean Constraint ─────────────────────────────────────────

const BOOLEAN_CODE = `template BooleanCheck() {
    signal input x;
    // x must be 0 or 1
    x * (1 - x) === 0;

    // If x = 0: 0 × 1 = 0 ✓
    // If x = 1: 1 × 0 = 0 ✓
    // If x = 2: 2 × -1 = -2 ✗
}`;

function generateBooleanSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  const nodes: CircuitNode[] = [
    createNode('x', 'input', 'x', false),
    createNode('one_minus_x', 'gate_add', '1-x'),
    createNode('mul', 'gate_mul', '×'),
    createNode('out', 'output', '0?'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_x_mul', 'x', 'mul'),
    createEdge('e_x_sub', 'x', 'one_minus_x'),
    createEdge('e_sub_mul', 'one_minus_x', 'mul'),
    createEdge('e_mul_out', 'mul', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  steps.push({
    totalConstraints: 1,
    description: 'Boolean constraint: x × (1 - x) = 0. Only passes if x is 0 or 1.',
    insight: 'This single constraint is the building block of all bit-level ZK operations.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Test x = 0
  let g = withNodeStates(baseGraph, { x: 'active' });
  g = withEdgeValue(g, 'e_x_mul', 0n);
  g = withEdgeValue(g, 'e_x_sub', 0n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'Try x = 0. Computing 1 - x = 1.',
    signals: { x: 0n },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  g = withNodeStates(g, { one_minus_x: 'active', mul: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_sub_mul', 1n);
  g = withEdgeValue(g, 'e_mul_out', 0n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'x = 0: 0 × 1 = 0 ✓  Constraint satisfied!',
    signals: { x: 0n, '1-x': 1n, 'x(1-x)': 0n },
    codeLine: 5,
    satisfiedConstraints: [0],
  });

  // Test x = 1
  g = withNodeStates(baseGraph, { x: 'active' });
  g = withEdgeValue(g, 'e_x_mul', 1n);
  g = withEdgeValue(g, 'e_x_sub', 1n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'Now try x = 1. Computing 1 - x = 0.',
    signals: { x: 1n },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  g = withNodeStates(g, { one_minus_x: 'active', mul: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_sub_mul', 0n);
  g = withEdgeValue(g, 'e_mul_out', 0n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'x = 1: 1 × 0 = 0 ✓  Constraint satisfied!',
    signals: { x: 1n, '1-x': 0n, 'x(1-x)': 0n },
    codeLine: 6,
    satisfiedConstraints: [0],
  });

  // Test x = 2 (should fail)
  g = withNodeStates(baseGraph, { x: 'active' });
  g = withEdgeValue(g, 'e_x_mul', 2n);
  g = withEdgeValue(g, 'e_x_sub', 2n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'Now try x = 2. Computing 1 - x = -1 (= 16 mod 17).',
    signals: { x: 2n },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  g = withNodeStates(g, { one_minus_x: 'active', mul: 'violated', out: 'violated' });
  g = withEdgeValue(g, 'e_sub_mul', 16n);
  g = withEdgeValue(g, 'e_mul_out', 15n);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description: 'x = 2: 2 × 16 = 32 = 15 (mod 17) ≠ 0 ✗  Constraint VIOLATED!',
    insight: 'Any value other than 0 or 1 will produce a non-zero result, failing the constraint.',
    signals: { x: 2n, '1-x': 16n, 'x(1-x)': 15n },
    codeLine: 7,
    violatedConstraints: [0],
    satisfiedConstraints: [],
  });

  return steps;
}

export const booleanCircuit: Circuit = {
  id: '2.3',
  title: 'Boolean Constraints',
  category: '2',
  difficulty: 1,
  code: BOOLEAN_CODE,
  language: 'circom',
  generateSteps: generateBooleanSteps,
};

// ── 2.4  Conditional Selection (MUX) ────────────────────────────────

const MUX_CODE = `template Mux() {
    signal input s;    // selector (0 or 1)
    signal input a;    // value if s=1
    signal input b;    // value if s=0
    signal output out;

    // Constraint 1: s is boolean
    s * (1 - s) === 0;

    // Constraint 2: out = s·a + (1-s)·b
    signal diff <== a - b;
    signal sel  <== s * diff;
    out <== sel + b;
    // Total: 3 constraints (1 boolean + 2 multiplications)
}`;

function generateMuxSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const s = 1n;
  const a = 7n;
  const b = 3n;

  const nodes: CircuitNode[] = [
    createNode('s', 'input', 's', false),
    createNode('a', 'input', 'a', false),
    createNode('b', 'input', 'b', false),
    createNode('bool_check', 'gate_mul', '×'),
    createNode('diff', 'gate_add', 'a-b'),
    createNode('sel', 'gate_mul', 's·diff'),
    createNode('add', 'gate_add', '+b'),
    createNode('out', 'output', 'out'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_s_bool', 's', 'bool_check'),
    createEdge('e_a_diff', 'a', 'diff'),
    createEdge('e_b_diff', 'b', 'diff'),
    createEdge('e_s_sel', 's', 'sel'),
    createEdge('e_diff_sel', 'diff', 'sel'),
    createEdge('e_sel_add', 'sel', 'add'),
    createEdge('e_b_add', 'b', 'add'),
    createEdge('e_add_out', 'add', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  steps.push({
    totalConstraints: 3,
    description: 'MUX gadget: out = s ? a : b. Selector s chooses between two values.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Assign inputs
  let g = withNodeStates(baseGraph, { s: 'active', a: 'active', b: 'active' });
  g = withEdgeValue(g, 'e_s_bool', 1n);
  g = withEdgeValue(g, 'e_s_sel', 1n);
  g = withEdgeValue(g, 'e_a_diff', 7n);
  g = withEdgeValue(g, 'e_b_diff', 3n);
  g = withEdgeValue(g, 'e_b_add', 3n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Inputs: s = 1, a = 7, b = 3. Since s = 1, output should be a = 7.',
    signals: { s: 1n, a: 7n, b: 3n },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Boolean check on s
  g = withNodeStates(g, { bool_check: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Constraint 0: s × (1 - s) = 1 × 0 = 0 ✓  (s is boolean)',
    signals: { s: 1n, 's(1-s)': 0n },
    codeLine: 8,
    satisfiedConstraints: [0],
    activeConstraints: [0],
  });

  // Compute diff
  g = withNodeStates(g, { diff: 'active' });
  g = withEdgeValue(g, 'e_diff_sel', 4n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Compute diff = a - b = 7 - 3 = 4. (Linear — no constraint.)',
    signals: { s: 1n, a: 7n, b: 3n, diff: 4n },
    codeLine: 11,
    satisfiedConstraints: [0],
  });

  // s × diff
  g = withNodeStates(g, { sel: 'satisfied' });
  g = withEdgeValue(g, 'e_sel_add', 4n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'Constraint 1: sel = s × diff = 1 × 4 = 4 ✓',
    signals: { s: 1n, diff: 4n, sel: 4n },
    codeLine: 12,
    satisfiedConstraints: [0, 1],
    activeConstraints: [1],
  });

  // Add b
  g = withNodeStates(g, { add: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_add_out', 7n);
  steps.push({
    graph: g,
    totalConstraints: 3,
    description: 'out = sel + b = 4 + 3 = 7 ✓  (Linear addition — free.)',
    insight: 'MUX is the "if-else" of ZK circuits. Just 3 constraints to conditionally select a value!',
    signals: { s: 1n, sel: 4n, b: 3n, out: 7n },
    codeLine: 13,
    satisfiedConstraints: [0, 1, 2],
  });

  return steps;
}

export const muxCircuit: Circuit = {
  id: '2.4',
  title: 'Conditional Selection (MUX)',
  category: '2',
  difficulty: 1,
  code: MUX_CODE,
  language: 'circom',
  generateSteps: generateMuxSteps,
};
