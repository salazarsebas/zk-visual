import type {
  Circuit,
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
  fieldMul,
  SMALL_PRIME,
} from './shared';

// ── 4.1  Merkle Proof in a Circuit (DAG) ────────────────────────────

const MERKLE_PROOF_CODE = `template MerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal output root;

    // For each level, hash the node with its sibling
    signal hashes[depth + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        // Simplified: hash(a, b) = a * b  (mod p)
        // Real circuits use Poseidon here (~240 constraints per hash)
        hashes[i + 1] <== hashes[i] * pathElements[i];
    }

    root <== hashes[depth];
    // Total: depth multiplication constraints
    // (one per hash operation)
}`;

// ── Witness values (mod 17) ─────────────────────────────────────────
//
//  Tree structure (depth 2, 4 leaves):
//
//            root = 3
//           /        \
//     hash0 = 15    [sibling subtree]
//        /    \
//   leaf=3  sib0=5
//
//  Proof path:  leaf=3 → hash(3,5)=15 → hash(15,7)=105≡3 mod 17 → root=3
//

const p = SMALL_PRIME; // 17n
const leaf = 3n;
const sib0 = 5n;
const sib1 = 7n;
const hash0 = fieldMul(leaf, sib0, p); // 3 * 5 = 15 mod 17 = 15
const hash1 = fieldMul(hash0, sib1, p); // 15 * 7 = 105 mod 17 = 3
const root = hash1; // 3

// ── Graph construction ──────────────────────────────────────────────

const nodes: CircuitNode[] = [
  createNode('leaf', 'input', 'leaf', false),
  createNode('sib0', 'input', 'sib₀', false),
  createNode('hash0', 'gate_mul', 'hash₀'),
  createNode('sib1', 'input', 'sib₁', false),
  createNode('hash1', 'gate_mul', 'hash₁'),
  createNode('root', 'output', 'root', true),
];

const edges: CircuitEdge[] = [
  createEdge('e_leaf_hash0', 'leaf', 'hash0'),
  createEdge('e_sib0_hash0', 'sib0', 'hash0'),
  createEdge('e_hash0_hash1', 'hash0', 'hash1'),
  createEdge('e_sib1_hash1', 'sib1', 'hash1'),
  createEdge('e_hash1_root', 'hash1', 'root'),
];

const baseGraph: CircuitGraph = buildGraph(nodes, edges);

// ── Step generator ──────────────────────────────────────────────────

function generateMerkleProofSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  // Step 0: Introduce Merkle proof concept
  steps.push({
    totalConstraints: 2,
    description:
      'Merkle proof: prove a leaf belongs to a tree without revealing the entire tree. The verifier only needs the root, the leaf, and the sibling hashes along the path.',
    insight:
      'Merkle proofs are logarithmic: a tree with 1 million leaves needs only ~20 hashes to verify membership.',
    label: 'Merkle Proof',
  });

  // Step 1: Show the leaf input
  let g = withNodeState(baseGraph, 'leaf', 'active');
  g = withEdgeValue(g, 'e_leaf_hash0', leaf);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Leaf = ${leaf}. This is the value we want to prove is in the Merkle tree. It enters the circuit as a private input.`,
    signals: { leaf },
    codeLine: 2,
    satisfiedConstraints: [],
  });

  // Step 2: Reveal first sibling
  g = withNodeStates(g, { sib0: 'active' });
  g = withEdgeValue(g, 'e_sib0_hash0', sib0);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Sibling at depth 0: sib₀ = ${sib0}. This is the hash of the leaf\'s neighbor in the tree. Provided as part of the proof path.`,
    signals: { leaf, sib0 },
    codeLine: 3,
    satisfiedConstraints: [],
  });

  // Step 3: Compute hash at level 0
  g = withNodeStates(g, { hash0: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Computing hash₀ = hash(leaf, sib₀) = ${leaf} * ${sib0} = ${hash0} (mod ${p}). This is constraint 0 (multiplication gate).`,
    insight:
      'In a real circuit, this would be a Poseidon hash (~240 constraints). We use multiplication as a simplified stand-in for visualization.',
    signals: { leaf, sib0, hash0 },
    codeLine: 13,
    satisfiedConstraints: [],
    activeConstraints: [0],
  });

  // Step 4: Constraint 0 satisfied — hash0 computed
  g = withNodeStates(g, { hash0: 'satisfied' });
  g = withEdgeValue(g, 'e_hash0_hash1', hash0);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Constraint 0 satisfied: hash₀ = ${hash0}. The intermediate hash flows up to the next level.`,
    signals: { leaf, sib0, hash0 },
    codeLine: 13,
    satisfiedConstraints: [0],
  });

  // Step 5: Reveal second sibling
  g = withNodeStates(g, { sib1: 'active' });
  g = withEdgeValue(g, 'e_sib1_hash1', sib1);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Sibling at depth 1: sib₁ = ${sib1}. This is the hash of the neighboring subtree. One more hash to reach the root.`,
    signals: { leaf, sib0, hash0, sib1 },
    codeLine: 3,
    satisfiedConstraints: [0],
  });

  // Step 6: Compute hash at level 1
  g = withNodeStates(g, { hash1: 'active' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Computing hash₁ = hash(hash₀, sib₁) = ${hash0} * ${sib1} = ${hash0 * sib1} = ${hash1} (mod ${p}). This is constraint 1.`,
    signals: { leaf, sib0, hash0, sib1, hash1 },
    codeLine: 13,
    satisfiedConstraints: [0],
    activeConstraints: [1],
  });

  // Step 7: Constraint 1 satisfied — hash1 = root
  g = withNodeStates(g, { hash1: 'satisfied' });
  g = withEdgeValue(g, 'e_hash1_root', hash1);
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Constraint 1 satisfied: hash₁ = ${hash1}. This value should match the known Merkle root.`,
    signals: { leaf, sib0, hash0, sib1, hash1 },
    codeLine: 13,
    satisfiedConstraints: [0, 1],
  });

  // Step 8: Root matches — proof complete
  g = withNodeStates(g, { root: 'satisfied' });
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      `Root = ${root} ✓. The computed root matches the public Merkle root. The leaf is proven to be in the tree!`,
    insight:
      `The verifier sees only the root (${root}) and is convinced the leaf exists in the tree — without learning the leaf value, the siblings, or the tree structure.`,
    signals: { leaf, sib0, hash0, sib1, hash1, root },
    codeLine: 16,
    satisfiedConstraints: [0, 1],
  });

  // Step 9: Cost summary
  steps.push({
    graph: g,
    totalConstraints: 2,
    description:
      'Depth-2 tree: 2 hash operations = 2 constraints. A depth-20 tree (1M leaves) needs only 20 hashes. With Poseidon: 20 * 240 = 4,800 constraints — tiny compared to revealing the whole tree.',
    insight:
      'Merkle proofs + ZK-friendly hashes = scalable privacy. This pattern powers Zcash (shielded transactions), Tornado Cash (private transfers), and rollup state verification.',
    signals: { leaf, sib0, hash0, sib1, hash1, root },
    codeLine: 18,
    satisfiedConstraints: [0, 1],
    comparison: {
      bars: [
        { label: 'Depth-2 (with Poseidon)', value: 480, maxValue: 5000, color: 'efficient' },
        { label: 'Depth-10 (with Poseidon)', value: 2400, maxValue: 5000, color: 'efficient' },
        { label: 'Depth-20 (with Poseidon)', value: 4800, maxValue: 5000, color: 'neutral' },
      ],
    },
  });

  return steps;
}

// ── Export ───────────────────────────────────────────────────────────

export const merkleProofCircuit: Circuit = {
  id: '4.1',
  title: 'Merkle Proof in a Circuit',
  category: '4',
  difficulty: 2,
  code: MERKLE_PROOF_CODE,
  language: 'circom',
  generateSteps: generateMerkleProofSteps,
};
