import type {
  Circuit,
  CircuitStep,
  ComparisonBar,
} from '../types';

// ── 3.1  Why Hash Functions Are Expensive (CostComparison) ──────────

const HASH_COMPARISON_CODE = `template Poseidon(nInputs) {
    signal input inputs[nInputs];
    signal output out;

    // Poseidon: ~240 constraints
    // Uses field-native operations (additions + cube/quint powers)
    // No bit manipulation needed — operates directly on field elements

    // Compare to SHA-256: ~27,000 constraints
    // SHA-256 operates on 32-bit words with XOR, AND, shifts
    // Each bit operation must be emulated with field arithmetic

    out <== PoseidonHash(inputs);
    // ~240 constraints for 2-input Poseidon
}`;

// ── Hash function constraint cost data ──────────────────────────────

interface HashInfo {
  name: string;
  constraints: number;
  color: 'costly' | 'efficient';
  description: string;
  insight: string;
}

const HASH_DATA: HashInfo[] = [
  {
    name: 'Keccak-256',
    constraints: 150_000,
    color: 'costly',
    description:
      'Keccak-256 (Ethereum\'s hash): ~150,000 constraints. Uses extensive bitwise operations (XOR, rotation, AND) that are extremely expensive in arithmetic circuits.',
    insight:
      'Keccak was designed for hardware speed, not ZK friendliness. Every bitwise op needs boolean decomposition + reconstruction.',
  },
  {
    name: 'SHA-256',
    constraints: 27_000,
    color: 'costly',
    description:
      'SHA-256: ~27,000 constraints. Operates on 32-bit words with shifts, rotations, and boolean functions — all costly in R1CS.',
    insight:
      'SHA-256 is 5x cheaper than Keccak in circuits, but still orders of magnitude more expensive than ZK-native hashes.',
  },
  {
    name: 'MiMC',
    constraints: 640,
    color: 'efficient',
    description:
      'MiMC: ~640 constraints. Uses repeated cubing (x^3) over the field — pure field arithmetic, no bit decomposition needed.',
    insight:
      'MiMC was one of the first "ZK-friendly" hashes. Simple design: just field multiplications in a Feistel structure.',
  },
  {
    name: 'Poseidon',
    constraints: 240,
    color: 'efficient',
    description:
      'Poseidon: ~240 constraints. Purpose-built for ZK circuits. Uses S-boxes (x^5) and MDS matrix multiplications — all native field ops.',
    insight:
      'Poseidon is the gold standard for ZK hashing. ~625x cheaper than Keccak. This is why Merkle trees in ZK use Poseidon, not SHA-256.',
  },
];

const MAX_CONSTRAINTS = 150_000;

// ── Step generator ──────────────────────────────────────────────────

function generateHashComparisonSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  // Step 0: Introduce the question
  steps.push({
    totalConstraints: 0,
    description:
      'Hash functions are fundamental to ZK proofs (Merkle trees, commitments, nullifiers). But not all hashes are equal in constraint cost.',
    insight:
      'A hash that is fast on CPUs can be catastrophically expensive inside a ZK circuit. The reason: bitwise operations.',
    label: 'Why It Matters',
  });

  // Steps 1-4: Reveal each hash one by one, accumulating bars
  const accumulatedBars: ComparisonBar[] = [];

  for (let i = 0; i < HASH_DATA.length; i++) {
    const hash = HASH_DATA[i];
    accumulatedBars.push({
      label: `${hash.name} (~${hash.constraints.toLocaleString()})`,
      value: hash.constraints,
      maxValue: MAX_CONSTRAINTS,
      color: hash.color,
    });

    steps.push({
      comparison: { bars: [...accumulatedBars] },
      totalConstraints: 0,
      description: hash.description,
      insight: hash.insight,
      label: hash.name,
      codeLine: i === HASH_DATA.length - 1 ? 12 : undefined,
    });
  }

  // Step 5: Final comparison — emphasize the ratio
  steps.push({
    comparison: {
      bars: [
        { label: 'Keccak-256 (~150,000)', value: 150_000, maxValue: MAX_CONSTRAINTS, color: 'costly' },
        { label: 'SHA-256 (~27,000)', value: 27_000, maxValue: MAX_CONSTRAINTS, color: 'costly' },
        { label: 'MiMC (~640)', value: 640, maxValue: MAX_CONSTRAINTS, color: 'efficient' },
        { label: 'Poseidon (~240)', value: 240, maxValue: MAX_CONSTRAINTS, color: 'efficient' },
      ],
    },
    totalConstraints: 0,
    description:
      'The full picture: Keccak costs 625x more than Poseidon. SHA-256 costs 112x more. ZK-friendly hashes operate directly on field elements — no bit decomposition, no boolean emulation.',
    insight:
      'Rule of thumb: if your ZK circuit needs a hash, use Poseidon (or MiMC). Never use SHA-256 or Keccak unless forced by external compatibility (e.g., Ethereum state roots).',
    label: 'The ZK Hash Gap',
    codeLine: 14,
  });

  // Step 6: Why the gap exists
  steps.push({
    comparison: {
      bars: [
        { label: 'Keccak-256 (~150,000)', value: 150_000, maxValue: MAX_CONSTRAINTS, color: 'costly' },
        { label: 'SHA-256 (~27,000)', value: 27_000, maxValue: MAX_CONSTRAINTS, color: 'costly' },
        { label: 'MiMC (~640)', value: 640, maxValue: MAX_CONSTRAINTS, color: 'efficient' },
        { label: 'Poseidon (~240)', value: 240, maxValue: MAX_CONSTRAINTS, color: 'efficient' },
      ],
    },
    totalConstraints: 0,
    description:
      'Traditional hashes use XOR, AND, bit shifts — operations that require decomposing field elements into individual bits, checking each is boolean, then reconstructing. ZK-friendly hashes use x^5 and matrix multiplication — native field operations that cost 1 constraint each.',
    insight:
      'This cost difference shapes the entire ZK ecosystem: Zcash uses Pedersen hashes, Tornado Cash uses MiMC, and modern rollups use Poseidon.',
    label: 'Root Cause',
  });

  return steps;
}

// ── Export ───────────────────────────────────────────────────────────

export const hashComparisonCircuit: Circuit = {
  id: '3.1',
  title: 'Why Hash Functions Are Expensive',
  category: '3',
  difficulty: 1,
  code: HASH_COMPARISON_CODE,
  language: 'circom',
  generateSteps: generateHashComparisonSteps,
};
