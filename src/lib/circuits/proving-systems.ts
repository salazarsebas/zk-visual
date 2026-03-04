import type {
  Circuit,
  CircuitStep,
  ProvingSystemData,
} from '../types';

// ── 5.1  Proving System Comparison ──────────────────────────────────

const PROVING_SYSTEMS_CODE = '';

// ── Radar chart data ────────────────────────────────────────────────
//
// Axes (all 1-10 scale):
//   Proof Size    — lower score = larger proof (10 = smallest)
//   Prover Speed  — higher = faster prover
//   Verifier Speed — higher = faster verifier
//   Setup Trust   — 10 = transparent (no trusted setup), 1 = strong trust assumptions
//   Recursion     — 10 = excellent recursion support, 1 = none
//   Post-Quantum  — 10 = fully post-quantum, 1 = broken by quantum computers
//

export const PROVING_SYSTEM_DATA: ProvingSystemData[] = [
  {
    name: 'Groth16',
    color: '#3b82f6', // blue
    values: {
      'Proof Size': 10,
      'Prover Speed': 6,
      'Verifier Speed': 10,
      'Setup Trust': 2,
      'Recursion': 3,
      'Post-Quantum': 1,
    },
  },
  {
    name: 'PLONK',
    color: '#8b5cf6', // violet
    values: {
      'Proof Size': 8,
      'Prover Speed': 5,
      'Verifier Speed': 8,
      'Setup Trust': 7,
      'Recursion': 7,
      'Post-Quantum': 1,
    },
  },
  {
    name: 'Halo2',
    color: '#10b981', // emerald
    values: {
      'Proof Size': 7,
      'Prover Speed': 5,
      'Verifier Speed': 7,
      'Setup Trust': 10,
      'Recursion': 10,
      'Post-Quantum': 1,
    },
  },
  {
    name: 'STARKs',
    color: '#f59e0b', // amber
    values: {
      'Proof Size': 3,
      'Prover Speed': 8,
      'Verifier Speed': 6,
      'Setup Trust': 10,
      'Recursion': 8,
      'Post-Quantum': 10,
    },
  },
];

// ── Step generator ──────────────────────────────────────────────────

function generateProvingSystemsSteps(): CircuitStep[] {
  const steps: CircuitStep[] = [];

  // Step 0: Overview
  steps.push({
    totalConstraints: 0,
    description:
      'Proving systems are the cryptographic engines that turn satisfied circuits into verifiable proofs. Each system makes different trade-offs between proof size, speed, trust assumptions, and quantum resistance.',
    insight:
      'There is no "best" proving system — only the best fit for a given application. Understanding the trade-offs is essential.',
    label: 'Overview',
  });

  // Step 1: Groth16
  steps.push({
    totalConstraints: 0,
    description:
      'Groth16 (2016): The smallest proofs in production — just 3 group elements (~200 bytes). Verification is a single pairing check, making it the fastest to verify. Used by Zcash and many early ZK applications.',
    insight:
      'The catch: Groth16 requires a per-circuit trusted setup ceremony. If the setup is compromised, fake proofs can be generated. Every circuit change needs a new ceremony.',
    label: 'Groth16',
  });

  // Step 2: PLONK
  steps.push({
    totalConstraints: 0,
    description:
      'PLONK (2019): A universal proving system — one trusted setup works for ALL circuits up to a maximum size. Proofs are slightly larger than Groth16 (~500 bytes) but the universal setup is a major practical advantage.',
    insight:
      'PLONK introduced "universal and updatable" SRS: the setup can be extended by anyone, and a single honest participant guarantees security. This largely solves the trusted setup problem.',
    label: 'PLONK',
  });

  // Step 3: Halo2
  steps.push({
    totalConstraints: 0,
    description:
      'Halo2 (2020): Eliminates trusted setup entirely using IPA (Inner Product Arguments). Supports efficient recursive proof composition — a proof can verify another proof inside it. Used by Zcash Orchard and Scroll.',
    insight:
      'Recursion is the key innovation: proofs verifying proofs enables IVC (Incrementally Verifiable Computation) and proof aggregation. This is how rollups batch thousands of transactions into one proof.',
    label: 'Halo2',
  });

  // Step 4: STARKs
  steps.push({
    totalConstraints: 0,
    description:
      'STARKs (2018): Transparent setup (no trusted ceremony at all). Based on hash functions, not elliptic curves, making them post-quantum secure. Proofs are larger (~50-200 KB) but prover is fast.',
    insight:
      'STARKs are the only widely-deployed system that would survive a quantum computer. StarkNet and zkSync Era use STARKs. The trade-off is proof size — mitigated by STARK-to-SNARK wrapping.',
    label: 'STARKs',
  });

  // Step 5: Trade-off comparison
  steps.push({
    totalConstraints: 0,
    description:
      'Summary of trade-offs: Groth16 wins on proof size and verification speed. PLONK wins on universal setup. Halo2 wins on trustlessness and recursion. STARKs win on quantum resistance and prover speed.',
    insight:
      'Modern systems often combine approaches: use STARKs for fast proving, then wrap the STARK proof inside a SNARK for compact on-chain verification. This gets the best of both worlds.',
    label: 'Trade-offs',
    comparison: {
      bars: [
        { label: 'Groth16 proof (~200 B)', value: 200, maxValue: 200_000, color: 'efficient' },
        { label: 'PLONK proof (~500 B)', value: 500, maxValue: 200_000, color: 'efficient' },
        { label: 'Halo2 proof (~5 KB)', value: 5_000, maxValue: 200_000, color: 'neutral' },
        { label: 'STARK proof (~100 KB)', value: 100_000, maxValue: 200_000, color: 'costly' },
      ],
    },
  });

  // Step 6: When to use what
  steps.push({
    totalConstraints: 0,
    description:
      'Choosing a system: Use Groth16 when proof size is critical (on-chain verification, mobile). Use PLONK for flexible circuit development. Use Halo2 for recursive applications. Use STARKs when quantum resistance or fast proving matters.',
    insight:
      'The ZK ecosystem is converging on hybrid architectures: STARK-prove, SNARK-verify. The "best" system depends on your constraints — pun intended.',
    label: 'Decision Guide',
  });

  return steps;
}

// ── Export ───────────────────────────────────────────────────────────

export const provingSystemsCircuit: Circuit = {
  id: '5.1',
  title: 'Proving System Comparison',
  category: '5',
  difficulty: 2,
  code: PROVING_SYSTEMS_CODE,
  language: 'circom',
  generateSteps: generateProvingSystemsSteps,
};
