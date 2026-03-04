import type {
  Circuit,
  CircuitStep,
  CircuitGraph,
  CircuitNode,
  CircuitEdge,
  PipelineStage,
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
  fieldAdd,
  SMALL_PRIME,
} from './shared';

// ── 1.1  What is a ZK Proof? (Pipeline) ────────────────────────────

const ZK_PROOF_CODE = `// Conceptual pipeline — no circuit code yet.
//
// 1. Statement:  "I know x such that hash(x) = H"
// 2. Witness:    The secret value x
// 3. Circuit:    Encodes the hash computation as gates
// 4. Prover:     Evaluates circuit + generates proof
// 5. Proof:      A short string (~200 bytes)
// 6. Verifier:   Checks proof against public inputs
//
// The verifier learns NOTHING about x.`;

function makePipelineStages(
  activeIndex: number,
): PipelineStage[] {
  const ids = ['statement', 'witness', 'circuit', 'prover', 'proof', 'verifier'];
  const labels = ['Statement', 'Witness', 'Circuit', 'Prover', 'Proof', 'Verifier'];
  return ids.map((id, i) => ({
    id,
    label: labels[i],
    state:
      i < activeIndex ? 'complete' as const
        : i === activeIndex ? 'active' as const
          : 'pending' as const,
  }));
}

function generateWhatIsZKSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  // Step 0: Overview — all stages pending
  steps.push({
    pipeline: { stages: makePipelineStages(-1) },
    totalConstraints: 0,
    description:
      'A zero-knowledge proof lets you prove you know something without revealing it. Walk through the six stages of the ZK pipeline.',
    insight:
      'No math required here — just the mental model of prover and verifier.',
    label: 'Overview',
    codeLine: 1,
  });

  // Step 1: Statement
  steps.push({
    pipeline: { stages: makePipelineStages(0) },
    totalConstraints: 0,
    description:
      'Stage 1 — Statement. The prover claims: "I know a secret x such that hash(x) = H." The verifier knows H but not x.',
    codeLine: 3,
    label: 'Statement',
  });

  // Step 2: Witness
  steps.push({
    pipeline: { stages: makePipelineStages(1) },
    totalConstraints: 0,
    description:
      'Stage 2 — Witness. The prover holds the secret value x (the "witness"). This is the private input that must never be revealed.',
    insight:
      'The witness is everything the prover knows that the verifier does not.',
    codeLine: 4,
    label: 'Witness',
  });

  // Step 3: Circuit
  steps.push({
    pipeline: { stages: makePipelineStages(2) },
    totalConstraints: 0,
    description:
      'Stage 3 — Circuit. The computation hash(x) = H is compiled into an arithmetic circuit — a DAG of addition and multiplication gates over a finite field.',
    codeLine: 5,
    label: 'Circuit',
  });

  // Step 4: Prover
  steps.push({
    pipeline: { stages: makePipelineStages(3) },
    totalConstraints: 0,
    description:
      'Stage 4 — Prover. The prover evaluates the circuit with the witness, satisfies every constraint, and runs the proving algorithm to produce a cryptographic proof.',
    codeLine: 6,
    label: 'Prover',
  });

  // Step 5: Proof
  steps.push({
    pipeline: { stages: makePipelineStages(4) },
    totalConstraints: 0,
    description:
      'Stage 5 — Proof. The output is a short proof string (as small as ~200 bytes for Groth16). It encodes the fact that all constraints were satisfied — without revealing x.',
    insight:
      'Proof size is constant regardless of circuit complexity. That is the magic of succinct proofs.',
    codeLine: 7,
    label: 'Proof',
  });

  // Step 6: Verifier
  steps.push({
    pipeline: { stages: makePipelineStages(5) },
    totalConstraints: 0,
    description:
      'Stage 6 — Verifier. The verifier checks the proof against the public statement H. If the proof passes, the verifier is convinced — without ever learning x.',
    insight:
      'The verifier learns that the statement is true but gains zero knowledge about the private input.',
    codeLine: 8,
    label: 'Verifier',
  });

  // Step 7: All complete
  steps.push({
    pipeline: {
      stages: makePipelineStages(6), // all complete (activeIndex beyond last)
    },
    totalConstraints: 0,
    description:
      'The ZK pipeline is complete. The prover proved knowledge of x without revealing it. The verifier is convinced with overwhelming probability.',
    insight:
      'This pipeline is the foundation of every ZK application: identity, voting, DeFi compliance, rollups.',
    codeLine: 10,
    label: 'Complete',
  });

  return steps;
}

export const whatIsZKCircuit: Circuit = {
  id: '1.1',
  title: 'What is a ZK Proof?',
  category: '1',
  difficulty: 1,
  code: ZK_PROOF_CODE,
  language: 'circom',
  generateSteps: generateWhatIsZKSteps,
};

// ── 1.2  Arithmetic Circuits (DAG) ─────────────────────────────────

const ARITHMETIC_CIRCUIT_CODE = `template ArithExample() {
    signal input a;
    signal input b;
    signal input c;
    signal output out;

    // out = a*a + b*c  (mod p)
    signal a_sq <== a * a;   // constraint 0
    signal bc  <== b * c;    // constraint 1
    out <== a_sq + bc;       // addition is free
}`;

function generateArithmeticCircuitSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const p = SMALL_PRIME;

  // Witness values: a=2, b=3, c=4 => a^2=4, b*c=12, out=16 (mod 17)
  const a = 2n;
  const b = 3n;
  const c = 4n;
  const aSq = fieldMul(a, a, p);    // 4
  const bc = fieldMul(b, c, p);     // 12
  const out = fieldAdd(aSq, bc, p); // 16

  // Build the circuit graph
  const nodes: CircuitNode[] = [
    createNode('a', 'input', 'a'),
    createNode('b', 'input', 'b'),
    createNode('c', 'input', 'c'),
    createNode('mul_aa', 'gate_mul', 'a*a'),
    createNode('mul_bc', 'gate_mul', 'b*c'),
    createNode('add', 'gate_add', '+'),
    createNode('out', 'output', 'out'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_a_mul1a', 'a', 'mul_aa'),
    createEdge('e_b_mul2', 'b', 'mul_bc'),
    createEdge('e_c_mul2', 'c', 'mul_bc'),
    createEdge('e_mul1_add', 'mul_aa', 'add'),
    createEdge('e_mul2_add', 'mul_bc', 'add'),
    createEdge('e_add_out', 'add', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  // Step 0: Introduce
  steps.push({
    totalConstraints: 2,
    description:
      'Arithmetic circuit: out = a^2 + b*c. Every computation in ZK starts by expressing it as addition and multiplication gates over a finite field.',
    insight:
      'Arithmetic circuits are directed acyclic graphs (DAGs) where each node is a field operation.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Step 1: Show inputs
  let g = withNodeStates(baseGraph, { a: 'active', b: 'active', c: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Assign inputs: a = ${a}, b = ${b}, c = ${c}. All arithmetic is mod ${p} (a small prime for pedagogy).`,
    signals: { a, b, c },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Step 2: Compute a * a
  g = withNodeStates(g, { mul_aa: 'active' });
  g = withEdgeValue(g, 'e_a_mul1a', a);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Gate: a * a = ${a} * ${a} = ${aSq} (mod ${p}). This multiplication creates constraint 0.`,
    signals: { a, b, c, a_sq: aSq },
    codeLine: 8,
    satisfiedConstraints: [],
    activeConstraints: [0],
  });

  // Step 3: Constraint 0 satisfied
  g = withNodeStates(g, { mul_aa: 'satisfied' });
  g = withEdgeValue(g, 'e_mul1_add', aSq);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Constraint 0 satisfied: a * a = ${aSq}. The value flows to the addition gate.`,
    signals: { a, b, c, a_sq: aSq },
    codeLine: 8,
    satisfiedConstraints: [0],
  });

  // Step 4: Compute b * c
  g = withNodeStates(g, { mul_bc: 'active' });
  g = withEdgeValue(g, 'e_b_mul2', b);
  g = withEdgeValue(g, 'e_c_mul2', c);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Gate: b * c = ${b} * ${c} = ${bc} (mod ${p}). This multiplication creates constraint 1.`,
    signals: { a, b, c, a_sq: aSq, bc },
    codeLine: 9,
    satisfiedConstraints: [0],
    activeConstraints: [1],
  });

  // Step 5: Constraint 1 satisfied
  g = withNodeStates(g, { mul_bc: 'satisfied' });
  g = withEdgeValue(g, 'e_mul2_add', bc);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Constraint 1 satisfied: b * c = ${bc}. Both multiplication results are ready.`,
    signals: { a, b, c, a_sq: aSq, bc },
    codeLine: 9,
    satisfiedConstraints: [0, 1],
  });

  // Step 6: Addition (free)
  g = withNodeStates(g, { add: 'satisfied' });
  g = withEdgeValue(g, 'e_add_out', out);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Addition: ${aSq} + ${bc} = ${out} (mod ${p}). Addition is a linear operation — no constraint needed!`,
    insight: 'In R1CS, only multiplications create constraints. Additions are free.',
    signals: { a, b, c, a_sq: aSq, bc, out },
    codeLine: 10,
    satisfiedConstraints: [0, 1],
  });

  // Step 7: Output
  g = withNodeStates(g, { out: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Output: out = ${out}. Circuit fully evaluated with just 2 multiplication constraints.`,
    insight:
      'Any polynomial computation can be decomposed into these simple gates. This is the foundation of all ZK systems.',
    signals: { a, b, c, a_sq: aSq, bc, out },
    codeLine: 11,
    satisfiedConstraints: [0, 1],
  });

  return steps;
}

export const arithmeticCircuitCircuit: Circuit = {
  id: '1.2',
  title: 'Arithmetic Circuits',
  category: '1',
  difficulty: 1,
  code: ARITHMETIC_CIRCUIT_CODE,
  language: 'circom',
  generateSteps: generateArithmeticCircuitSteps,
};

// ── 1.3  Signals and Constraints (R1CS) ────────────────────────────

const SIGNALS_CONSTRAINTS_CODE = `template ArithR1CS() {
    signal input a;
    signal input b;
    signal input c;
    signal output out;

    // out = a*a + b*c
    signal a_sq <== a * a;   // R1CS row 0: [a] * [a] = [a_sq]
    signal bc  <== b * c;    // R1CS row 1: [b] * [c] = [bc]
    out <== a_sq + bc;       // linear — no R1CS row

    // Witness vector w = [1, a, b, c, a_sq, bc, out]
    // Constraint 0:  A=[0,1,0,0,0,0,0] B=[0,1,0,0,0,0,0] C=[0,0,0,0,1,0,0]
    // Constraint 1:  A=[0,0,1,0,0,0,0] B=[0,0,0,1,0,0,0] C=[0,0,0,0,0,1,0]
}`;

function generateSignalsConstraintsSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const p = SMALL_PRIME;

  // Same circuit as 1.2: out = a^2 + b*c with a=2, b=3, c=4
  const a = 2n;
  const b = 3n;
  const c = 4n;
  const aSq = fieldMul(a, a, p);    // 4
  const bc = fieldMul(b, c, p);     // 12
  const out = fieldAdd(aSq, bc, p); // 16

  const nodes: CircuitNode[] = [
    createNode('a', 'input', 'a'),
    createNode('b', 'input', 'b'),
    createNode('c', 'input', 'c'),
    createNode('mul_aa', 'gate_mul', 'a*a'),
    createNode('mul_bc', 'gate_mul', 'b*c'),
    createNode('add', 'gate_add', '+'),
    createNode('out', 'output', 'out'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_a_mul1', 'a', 'mul_aa'),
    createEdge('e_b_mul2', 'b', 'mul_bc'),
    createEdge('e_c_mul2', 'c', 'mul_bc'),
    createEdge('e_mul1_add', 'mul_aa', 'add'),
    createEdge('e_mul2_add', 'mul_bc', 'add'),
    createEdge('e_add_out', 'add', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  // Step 0: Introduce R1CS concept
  steps.push({
    totalConstraints: 2,
    description:
      'Every multiplication gate becomes one R1CS constraint: (A*z) x (B*z) = (C*z). This circuit has 2 multiplication gates, so 2 constraints.',
    insight:
      'R1CS = Rank-1 Constraint System. It is the standard intermediate representation for ZK circuits.',
    codeLine: 1,
    satisfiedConstraints: [],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 0, maxValue: 2, color: 'neutral' },
      ],
    },
  });

  // Step 1: Show the witness vector
  let g = withNodeStates(baseGraph, { a: 'active', b: 'active', c: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Witness vector w = [1, a, b, c, a_sq, bc, out] = [1, ${a}, ${b}, ${c}, ?, ?, ?]. Inputs assigned; intermediates unknown.`,
    signals: { a, b, c },
    codeLine: 12,
    satisfiedConstraints: [],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 0, maxValue: 2, color: 'neutral' },
      ],
    },
  });

  // Step 2: Show constraint 0 structure
  g = withNodeStates(g, { mul_aa: 'active' });
  g = withEdgeValue(g, 'e_a_mul1', a);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      'Constraint 0: (A*w) x (B*w) = (C*w). A selects signal a, B selects signal a, C selects signal a_sq. This encodes a * a = a_sq.',
    signals: { a, b, c },
    codeLine: 13,
    satisfiedConstraints: [],
    activeConstraints: [0],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 0, maxValue: 2, color: 'neutral' },
      ],
    },
  });

  // Step 3: Evaluate constraint 0
  g = withNodeStates(g, { mul_aa: 'satisfied' });
  g = withEdgeValue(g, 'e_mul1_add', aSq);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Check: (A*w) x (B*w) = ${a} x ${a} = ${aSq}. (C*w) = a_sq = ${aSq}. Equal! Constraint 0 satisfied.`,
    signals: { a, b, c, a_sq: aSq },
    codeLine: 8,
    satisfiedConstraints: [0],
    activeConstraints: [0],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 1, maxValue: 2, color: 'neutral' },
      ],
    },
  });

  // Step 4: Show constraint 1 structure
  g = withNodeStates(g, { mul_bc: 'active' });
  g = withEdgeValue(g, 'e_b_mul2', b);
  g = withEdgeValue(g, 'e_c_mul2', c);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      'Constraint 1: A selects signal b, B selects signal c, C selects signal bc. This encodes b * c = bc.',
    signals: { a, b, c, a_sq: aSq },
    codeLine: 14,
    satisfiedConstraints: [0],
    activeConstraints: [1],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 1, maxValue: 2, color: 'neutral' },
      ],
    },
  });

  // Step 5: Evaluate constraint 1
  g = withNodeStates(g, { mul_bc: 'satisfied' });
  g = withEdgeValue(g, 'e_mul2_add', bc);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Check: (A*w) x (B*w) = ${b} x ${c} = ${bc}. (C*w) = bc = ${bc}. Equal! Constraint 1 satisfied.`,
    signals: { a, b, c, a_sq: aSq, bc },
    codeLine: 9,
    satisfiedConstraints: [0, 1],
    activeConstraints: [1],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 2, maxValue: 2, color: 'efficient' },
      ],
    },
  });

  // Step 6: Linear combination (free) + output
  g = withNodeStates(g, { add: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_add_out', out);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `out = a_sq + bc = ${aSq} + ${bc} = ${out} (mod ${p}). Addition is linear — encoded directly in the A/B/C vectors, no extra constraint.`,
    insight:
      'Every multiplication gate = 1 constraint. Addition and constant multiplication are free. Minimizing multiplications is the core optimization in ZK circuit design.',
    signals: { a, b, c, a_sq: aSq, bc, out },
    codeLine: 10,
    satisfiedConstraints: [0, 1],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 2, maxValue: 2, color: 'efficient' },
      ],
    },
  });

  // Step 7: Complete witness vector
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Complete witness: w = [1, ${a}, ${b}, ${c}, ${aSq}, ${bc}, ${out}]. All 2 constraints satisfied. This witness proves the computation is correct.`,
    insight:
      'The witness vector is the full assignment of values to every signal. The proof is generated from this vector.',
    signals: { '1': 1n, a, b, c, a_sq: aSq, bc, out },
    codeLine: 12,
    satisfiedConstraints: [0, 1],
    comparison: {
      bars: [
        { label: 'Constraints satisfied', value: 2, maxValue: 2, color: 'efficient' },
      ],
    },
  });

  return steps;
}

export const signalsConstraintsCircuit: Circuit = {
  id: '1.3',
  title: 'Signals and Constraints',
  category: '1',
  difficulty: 2,
  code: SIGNALS_CONSTRAINTS_CODE,
  language: 'circom',
  generateSteps: generateSignalsConstraintsSteps,
};

// ── 1.4  Public vs Private Inputs ──────────────────────────────────

const PUBLIC_PRIVATE_CODE = `template PublicPrivate() {
    signal input x;        // public input
    signal input w;        // private input (witness)
    signal output out;

    // out = x*x + w
    signal x_sq <== x * x;  // constraint 0
    out <== x_sq + w;       // linear, free

    // Public:  x, out  (visible to verifier)
    // Private: w       (hidden from verifier)
}`;

function generatePublicPrivateSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const p = SMALL_PRIME;

  // x = 3 (public), w = 5 (private)
  // x^2 = 9, out = 9 + 5 = 14 (mod 17)
  const x = 3n;
  const w = 5n;
  const xSq = fieldMul(x, x, p);    // 9
  const out = fieldAdd(xSq, w, p);   // 14

  const nodes: CircuitNode[] = [
    createNode('x', 'input', 'x (public)', true),
    createNode('w', 'input', 'w (private)', false),
    createNode('mul_xx', 'gate_mul', 'x*x'),
    createNode('add', 'gate_add', '+'),
    createNode('out', 'output', 'out (public)', true),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_x_mul', 'x', 'mul_xx'),
    createEdge('e_mul_add', 'mul_xx', 'add'),
    createEdge('e_w_add', 'w', 'add'),
    createEdge('e_add_out', 'add', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  // Step 0: Introduce
  steps.push({
    totalConstraints: 1,
    description:
      'ZK circuits distinguish public inputs (visible to the verifier) from private inputs (hidden). The verifier sees the statement but not the witness.',
    insight:
      'Public inputs define WHAT is being proved. Private inputs define HOW (the secret knowledge).',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Step 1: Show public input x
  let g = withNodeState(baseGraph, 'x', 'active');
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Public input x = ${x}. The verifier can see this value. It is part of the statement being proved.`,
    signals: { x },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Step 2: Show private input w (masked)
  g = withNodeStates(g, { w: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      'Private input w = [hidden]. The verifier cannot see this value. The prover knows w but keeps it secret.',
    insight:
      'In the proof, private inputs appear as encrypted commitments. The verifier never learns the actual values.',
    signals: { x },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  // Step 3: Prover knows w — reveal to learner
  g = withEdgeValue(g, 'e_x_mul', x);
  g = withEdgeValue(g, 'e_w_add', w);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `The prover knows w = ${w}. From the prover's perspective, all values are visible. The prover uses them to compute the proof.`,
    signals: { x, w },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  // Step 4: Compute x^2 (constraint 0)
  g = withNodeStates(g, { mul_xx: 'satisfied' });
  g = withEdgeValue(g, 'e_mul_add', xSq);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Constraint 0: x * x = ${x} * ${x} = ${xSq} (mod ${p}). Multiplication gate satisfied.`,
    signals: { x, w, x_sq: xSq },
    codeLine: 7,
    satisfiedConstraints: [0],
    activeConstraints: [0],
  });

  // Step 5: Addition (free) + output
  g = withNodeStates(g, { add: 'satisfied', out: 'satisfied' });
  g = withEdgeValue(g, 'e_add_out', out);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `out = x_sq + w = ${xSq} + ${w} = ${out} (mod ${p}). The output is public — the verifier sees out = ${out}.`,
    signals: { x, w, x_sq: xSq, out },
    codeLine: 8,
    satisfiedConstraints: [0],
  });

  // Step 6: Knowledge barrier summary
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `The verifier sees: x = ${x}, out = ${out}. The verifier does NOT see: w = ${w}, x_sq = ${xSq}. Yet the verifier is convinced that the prover knows some w satisfying the circuit.`,
    insight:
      'The "knowledge barrier" is the core of ZK: public values cross to the verifier, private values stay with the prover. The proof bridges the gap.',
    signals: { x, out },
    codeLine: 10,
    satisfiedConstraints: [0],
  });

  return steps;
}

export const publicPrivateCircuit: Circuit = {
  id: '1.4',
  title: 'Public vs Private Inputs',
  category: '1',
  difficulty: 1,
  code: PUBLIC_PRIVATE_CODE,
  language: 'circom',
  generateSteps: generatePublicPrivateSteps,
};

// ── 1.5  Witness Generation ────────────────────────────────────────

const WITNESS_GEN_CODE = `template WitnessDemo() {
    signal input a;
    signal input b;
    signal input c;
    signal output out;

    // out = (a + b) * c
    signal sum <== a + b;      // linear, free
    signal prod <== sum * c;   // constraint 0
    out <== prod;              // alias, free

    // Witness generation order:
    // 1. Read inputs: a, b, c
    // 2. Compute sum = a + b
    // 3. Compute prod = sum * c
    // 4. Assign out = prod
}`;

function generateWitnessGenSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];
  const p = SMALL_PRIME;

  // a=3, b=5, c=2 => sum=8, prod=16, out=16 (mod 17)
  const a = 3n;
  const b = 5n;
  const c = 2n;
  const sum = fieldAdd(a, b, p);     // 8
  const prod = fieldMul(sum, c, p);  // 16

  const nodes: CircuitNode[] = [
    createNode('a', 'input', 'a'),
    createNode('b', 'input', 'b'),
    createNode('c', 'input', 'c'),
    createNode('sum', 'gate_add', 'a+b'),
    createNode('mul', 'gate_mul', '*'),
    createNode('out', 'output', 'out'),
  ];

  const edges: CircuitEdge[] = [
    createEdge('e_a_sum', 'a', 'sum'),
    createEdge('e_b_sum', 'b', 'sum'),
    createEdge('e_sum_mul', 'sum', 'mul'),
    createEdge('e_c_mul', 'c', 'mul'),
    createEdge('e_mul_out', 'mul', 'out'),
  ];

  const baseGraph = buildGraph(nodes, edges);

  // Step 0: Introduce witness generation
  steps.push({
    totalConstraints: 1,
    description:
      'Witness generation is evaluating the circuit with concrete inputs to compute every intermediate signal. The result is the full witness vector.',
    insight:
      'The witness is the assignment of values to ALL signals — inputs, intermediates, and outputs. The proof is built from this vector.',
    codeLine: 1,
    satisfiedConstraints: [],
  });

  // Step 1: Assign input a
  let g = withNodeState(baseGraph, 'a', 'active');
  g = withEdgeValue(g, 'e_a_sum', a);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Read input a = ${a}. The value propagates along the edge toward the addition gate.`,
    signals: { a },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Step 2: Assign input b
  g = withNodeStates(g, { b: 'active' });
  g = withEdgeValue(g, 'e_b_sum', b);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Read input b = ${b}. Both inputs to the addition gate are now available.`,
    signals: { a, b },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  // Step 3: Assign input c
  g = withNodeStates(g, { c: 'active' });
  g = withEdgeValue(g, 'e_c_mul', c);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Read input c = ${c}. All inputs are assigned. Now compute intermediates top-down.`,
    signals: { a, b, c },
    codeLine: 4,
    satisfiedConstraints: [],
  });

  // Step 4: Compute sum = a + b (free)
  g = withNodeStates(g, { sum: 'active' });
  g = withEdgeValue(g, 'e_sum_mul', sum);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Compute sum = a + b = ${a} + ${b} = ${sum} (mod ${p}). Addition is linear — no constraint generated.`,
    insight:
      'Linear operations (addition, constant multiplication) do not create R1CS constraints. They are "free" in circuit cost.',
    signals: { a, b, c, sum },
    codeLine: 8,
    satisfiedConstraints: [],
  });

  // Step 5: Compute prod = sum * c (constraint 0)
  g = withNodeStates(g, { mul: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Compute prod = sum * c = ${sum} * ${c} = ${prod} (mod ${p}). This multiplication creates constraint 0.`,
    signals: { a, b, c, sum, prod },
    codeLine: 9,
    satisfiedConstraints: [],
    activeConstraints: [0],
  });

  // Step 6: Constraint 0 satisfied
  g = withNodeStates(g, { mul: 'satisfied' });
  g = withEdgeValue(g, 'e_mul_out', prod);
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Constraint 0: sum * c = ${sum} * ${c} = ${prod}. Satisfied! The multiplication gate output matches.`,
    signals: { a, b, c, sum, prod },
    codeLine: 9,
    satisfiedConstraints: [0],
    activeConstraints: [0],
  });

  // Step 7: Assign output
  g = withNodeStates(g, { out: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Output: out = prod = ${prod}. The witness is complete: w = [1, ${a}, ${b}, ${c}, ${sum}, ${prod}, ${prod}].`,
    signals: { a, b, c, sum, prod, out: prod },
    codeLine: 10,
    satisfiedConstraints: [0],
  });

  // Step 8: Summary
  steps.push({
    graph: g,
    totalConstraints: 1,
    description:
      `Witness generation complete. Every signal has a value. The 1 constraint is satisfied. This witness vector is the input to the proving algorithm.`,
    insight:
      'Witness generation is deterministic: given the same inputs, you always get the same witness. The proof hides the witness while proving it satisfies all constraints.',
    signals: { a, b, c, sum, prod, out: prod },
    codeLine: 12,
    satisfiedConstraints: [0],
  });

  return steps;
}

export const witnessGenCircuit: Circuit = {
  id: '1.5',
  title: 'Witness Generation',
  category: '1',
  difficulty: 2,
  code: WITNESS_GEN_CODE,
  language: 'circom',
  generateSteps: generateWitnessGenSteps,
};
