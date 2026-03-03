# Testing Visualization Correctness

> Implementation guide — the testing strategy for ZK visualizations, covering constraint
> count accuracy, R1CS satisfaction testing, visual snapshots, and domain expert review.

---

## Table of Contents

1. [Why ZK Visualization Testing Is Different](#1-why-zk-visualization-testing-is-different)
2. [Two Dimensions of Correctness](#2-two-dimensions-of-correctness)
3. [Constraint Count Tests](#3-constraint-count-tests)
4. [R1CS Constraint Satisfaction Tests](#4-r1cs-constraint-satisfaction-tests)
5. [The R1CS Row Format](#5-the-r1cs-row-format)
6. [Visual Snapshot Tests](#6-visual-snapshot-tests)
7. [Domain Expert Review Protocol](#7-domain-expert-review-protocol)
8. [Reference Implementations](#8-reference-implementations)
9. [The ZK Bug Mode Test](#9-the-zk-bug-mode-test)

---

## 1. Why ZK Visualization Testing Is Different

Standard UI tests verify **interaction**: button click → state change. A broken button that shows nothing is obviously broken — the user sees nothing and reports the bug.

ZK visualization tests must verify **mathematical truth**: does the animated circuit correctly represent what a ZK circuit actually does? A wrong claim that "this constraint is satisfied" — when it is not — is **not** obviously broken. The animation looks beautiful. The constraint counter advances. The gates turn green. And the user learns the wrong thing.

**The asymmetry of harm:**

| Failure mode | User impact |
|---|---|
| Animation does not render | User sees an error; reports the bug; no learning happens |
| Animation renders incorrectly | User learns a wrong mental model; no indication of error; harm persists |

A visualization that claims "8 constraints" when the correct count is 11 is teaching a specific, wrong fact. A developer who internalizes that wrong fact will miscalculate circuit costs in their own projects. The downstream harm is orders of magnitude worse than a rendering failure.

This testing strategy treats **correctness as a first-class concern**, equal in priority to performance and visual quality.

---

## 2. Two Dimensions of Correctness

### (A) Constraint Count Accuracy

Does `generateSteps()` produce the correct total constraint count?

The maximum value of `totalConstraints` across all steps must equal the known constraint count of the circuit from the ZK knowledge base.

### (B) Constraint Satisfaction Accuracy

For every step that has `satisfiedConstraints` or `violatedConstraints`, do the signals in that step actually satisfy or violate the corresponding R1CS rows?

A satisfied constraint that is mathematically violated is a silent correctness bug. A violated constraint that is mathematically satisfied is a different kind of wrong (it teaches that valid witnesses fail — also harmful).

---

## 3. Constraint Count Tests

For each `Circuit` object, verify that `generateSteps()` produces the correct total constraint count.

**The `maxConstraints` helper:**

```typescript
/**
 * Return the maximum value of totalConstraints across all steps.
 * This is the final constraint count after all constraints are verified.
 */
function maxConstraints(steps: CircuitStep[]): number {
  return Math.max(...steps.map(s => s.totalConstraints));
}
```

**Example tests using bun test:**

```typescript
import { describe, it, expect } from 'bun:test';
import { bitDecomp8Circuit } from '../src/lib/circuits/bit-decomp';
import { booleanCheckCircuit } from '../src/lib/circuits/boolean-check';
import { poseidonHash2Circuit } from '../src/lib/circuits/poseidon';
import { merklePathCircuit } from '../src/lib/circuits/merkle-path';
import { maxConstraints } from '../src/lib/test-utils';

describe('Constraint count accuracy', () => {
  it('bit decomposition (8-bit) has 8 constraints', () => {
    const steps = bitDecomp8Circuit.generateSteps();
    expect(maxConstraints(steps)).toBe(8);
  });

  it('boolean check has 1 constraint', () => {
    const steps = booleanCheckCircuit.generateSteps();
    expect(maxConstraints(steps)).toBe(1);
  });

  it('Poseidon hash (2-input) has 240 constraints', () => {
    const steps = poseidonHash2Circuit.generateSteps();
    expect(maxConstraints(steps)).toBe(240);
  });

  it('Merkle path (20-level Poseidon) has 4800 constraints', () => {
    const steps = merklePathCircuit.generateSteps();
    expect(maxConstraints(steps)).toBe(4800);
  });
});
```

**Known constraint counts (from ZK knowledge base):**

| Circuit | Expected count | Source |
|---|---|---|
| Boolean check `x*(1-x)=0` | 1 | [gadgets.md](../zk/gadgets.md) |
| Bit decomposition (k-bit) | k | [gadgets.md](../zk/gadgets.md) |
| Range check (8-bit, optimized) | 8 | [gadgets.md](../zk/gadgets.md) |
| Comparison (k-bit) | k+1 | [gadgets.md](../zk/gadgets.md) |
| MUX (1-bit selector) | 3 | [gadgets.md](../zk/gadgets.md) |
| Poseidon (2-input) | 240 | [hash-functions.md](../zk/hash-functions.md) |
| SHA-256 (one block) | 27,905 | [hash-functions.md](../zk/hash-functions.md) |
| Merkle path (depth d, Poseidon) | d × 240 | [gadgets.md](../zk/gadgets.md) |

---

## 4. R1CS Constraint Satisfaction Tests

For each step that has `satisfiedConstraints` or `violatedConstraints`, verify that the signal values in that step actually satisfy or violate the corresponding R1CS rows.

```typescript
import { describe, it, expect } from 'bun:test';
import { booleanCheckCircuit, booleanCheckR1CS } from '../src/lib/circuits/boolean-check';
import { checkR1CSRow } from '../src/lib/test-utils';

describe('R1CS satisfaction accuracy — boolean check', () => {
  const stepsValid   = booleanCheckCircuit.generateSteps({ x: 1n }, 17n);
  const stepsInvalid = booleanCheckCircuit.generateSteps({ x: 2n }, 17n);

  it('satisfied constraints are actually satisfied (x=1)', () => {
    for (const step of stepsValid) {
      if (!step.satisfiedConstraints || !step.signals) continue;
      for (const constraintIdx of step.satisfiedConstraints) {
        const row = booleanCheckR1CS[constraintIdx];
        const result = checkR1CSRow(row, step.signals, 17n);
        expect(result).toBe(true);
      }
    }
  });

  it('violated constraints are actually violated (x=2)', () => {
    for (const step of stepsInvalid) {
      if (!step.violatedConstraints || !step.signals) continue;
      for (const constraintIdx of step.violatedConstraints) {
        const row = booleanCheckR1CS[constraintIdx];
        const result = checkR1CSRow(row, step.signals, 17n);
        expect(result).toBe(false);
      }
    }
  });
});
```

**Where R1CS rows are stored:** Alongside the circuit definition in `src/lib/circuits/*.ts`. Each circuit file exports both the `Circuit` object and its R1CS rows array:

```typescript
// src/lib/circuits/boolean-check.ts

export const booleanCheckR1CS: R1CSRow[] = [
  // Constraint 0: x * one_minus_x = product
  {
    A: { x: 1n },
    B: { one_minus_x: 1n },
    C: { product: 1n },
  },
];

export const booleanCheckCircuit: Circuit = {
  id: 'boolean-check',
  // ...
};
```

---

## 5. The R1CS Row Format

R1CS rows encode the constraint `(A·z) × (B·z) = (C·z)` where `z` is the full witness vector.

**TypeScript encoding:**

```typescript
type R1CSRow = {
  A: Record<string, bigint>;  // Signal name → coefficient in the A vector
  B: Record<string, bigint>;  // Signal name → coefficient in the B vector
  C: Record<string, bigint>;  // Signal name → coefficient in the C vector
};
```

Each signal not present in a row's coefficient map is treated as having coefficient `0`.

**Examples:**

```typescript
// Constraint: a × b = c
const mulConstraint: R1CSRow = {
  A: { a: 1n },
  B: { b: 1n },
  C: { c: 1n },
};

// Constraint: (a + b) × 1 = c   (linear combination in A)
const addConstraint: R1CSRow = {
  A: { a: 1n, b: 1n },
  B: { '1': 1n },             // '1' represents the constant 1 in the witness
  C: { c: 1n },
};

// Constraint: x × (1 - x) = 0  (boolean check)
const boolConstraint: R1CSRow = {
  A: { x: 1n },
  B: { '1': 1n, x: -1n },    // 1 - x as a linear combination
  C: {},                       // C = 0 (empty = all zeros)
};
```

**The `checkR1CSRow` evaluator:**

```typescript
/**
 * Evaluate (A·z) × (B·z) = (C·z) mod p for the given signal assignment.
 * The signal '1' always evaluates to 1n (the constant witness entry).
 * Returns true if the constraint is satisfied, false if violated.
 */
export function checkR1CSRow(
  row: R1CSRow,
  signals: Record<string, bigint>,
  p: bigint
): boolean {
  const z: Record<string, bigint> = { '1': 1n, ...signals };

  function dot(coeffs: Record<string, bigint>): bigint {
    let sum = 0n;
    for (const [signal, coeff] of Object.entries(coeffs)) {
      const val = z[signal] ?? 0n;
      sum += coeff * val;
    }
    return ((sum % p) + p) % p;  // Reduce mod p, always positive
  }

  const a = dot(row.A);
  const b = dot(row.B);
  const c = dot(row.C);
  const lhs = (a * b) % p;
  return lhs === c;
}
```

---

## 6. Visual Snapshot Tests

Render `CircuitVisualizer` to static SVG and compare against saved snapshot files. This catches unintentional visual regressions — a node moving, an edge disappearing, a label changing.

```typescript
import { describe, it, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircuitVisualizer } from '../src/components/CircuitVisualizer';
import { bitDecomp8Circuit } from '../src/lib/circuits/bit-decomp';
import { layoutCircuit } from '../src/lib/dagre-layout';

describe('Visual snapshot — bit decomposition', () => {
  const steps  = bitDecomp8Circuit.generateSteps();
  const layout = layoutCircuit(steps[0].graph!);

  it('initial state matches snapshot', () => {
    const svg = renderToStaticMarkup(
      <CircuitVisualizer
        step={steps[0]}
        layout={layout}
        width={600}
        height={400}
      />
    );
    expect(svg).toMatchSnapshot();
  });

  it('fully satisfied state matches snapshot', () => {
    const finalStep = steps[steps.length - 1];
    const svg = renderToStaticMarkup(
      <CircuitVisualizer
        step={finalStep}
        layout={layout}
        width={600}
        height={400}
      />
    );
    expect(svg).toMatchSnapshot();
  });
});
```

**Snapshot files:** Located at `src/lib/circuits/__snapshots__/*.svg` and `*.snap` (bun's snapshot format).

**Updating snapshots:** When a visualization intentionally changes (new node layout, updated labels):

```sh
bun test --update-snapshots
```

Review the diff in the snapshot file before committing — the SVG diff reveals exactly which visual elements changed.

**CI integration:** Run snapshot tests in CI without `--update-snapshots`. Any unexpected SVG change fails the build and requires explicit review.

---

## 7. Domain Expert Review Protocol

Automated tests catch mathematical errors. Domain expert review catches **pedagogical errors**:
- Wrong framing ("this shows how the prover generates randomness" — false)
- Misleading abstraction ("these constraints are checked sequentially" — technically false; order is arbitrary)
- Incomplete explanation (showing the satisfying trace without explaining what happens when it fails)
- Accuracy drift (the circomlib implementation changed but the visualization was not updated)

**Phase 0 validation criteria:**

Before any P0 visualization ships, 5 ZK developers with circuit-writing experience review it and confirm it is technically correct and pedagogically sound.

**Reviewer checklist:**

```markdown
## ZK Visualization Review — [Circuit Name]

**Reviewer:** [Name / pseudonym]
**Date:** [Date]
**Circom version tested:** [Version]

### Constraint count
- [ ] Total constraints matches circomlib reference implementation
- [ ] Individual gate constraint counts are correct
- [ ] Addition vs multiplication gate distinction is accurate

### Signal values
- [ ] Witness values satisfy all claimed "satisfied" constraints (verify by hand or script)
- [ ] Witness values violate all claimed "violated" constraints
- [ ] The modular arithmetic is correct (especially for wrap-around cases)

### Code accuracy
- [ ] The Circom code matches the canonical circomlib implementation
- [ ] Signal names in the code match signal names in the step data
- [ ] `codeLine` references point to the correct lines

### Pedagogical accuracy
- [ ] The `insight` text in each step is factually correct
- [ ] The `description` text is accurate and non-misleading
- [ ] The visualization does not over-claim (e.g., implying that verification happens sequentially when it does not)
- [ ] The visualization accurately represents what is public vs. private

### Verdict
- [ ] **Approved** — no changes needed
- [ ] **Approved with minor fixes** — list issues below
- [ ] **Rejected** — major correctness issue; list blocking issues below

**Issues:**
[List any issues found]
```

---

## 8. Reference Implementations

For each catalog gadget, the **reference implementation** is the authoritative source for constraint counts and circuit structure:

| Priority | Source | Used for |
|---|---|---|
| 1 | `circomlib` (iden3/circomlib on GitHub) | All standard gadgets: boolean, comparison, MUX, hash, Merkle |
| 2 | 0xPARC workshop solutions | Advanced gadgets: ECDSA, non-native arithmetic |
| 3 | ZK Visual knowledge base | Cross-reference: [gadgets.md](../zk/gadgets.md), [hash-functions.md](../zk/hash-functions.md) |

**Any discrepancy between our constraint count and the reference is a test failure, not a design choice.**

If the circomlib implementation uses 8 constraints for 8-bit range check and our visualization claims 9, the visualization is wrong — even if our implementation is theoretically correct by a different derivation. The reference implementation is canonical.

**Checking constraint counts against circomlib:**

```sh
# Clone circomlib and compile a test circuit:
git clone https://github.com/iden3/circomlib.git

# Use circom to get the R1CS:
circom circomlib/circuits/bitify.circom --r1cs --output /tmp/
snarkjs r1cs info /tmp/bitify.r1cs
# → Shows: "# of constraints: 8" for Num2Bits(8)
```

Automate this check for each catalog circuit as part of the test suite.

---

## 9. The ZK Bug Mode Test

ZK Visual's "ZK Bug" visualizations (catalog items in the Bug Book section) demonstrate what happens when a constraint is **removed** from a circuit — a common class of ZK vulnerabilities. The animation shows:

1. A correctly constrained circuit (valid witness → proof accepted)
2. The constraint is removed (an under-constrained circuit)
3. An invalid witness is supplied — one that should fail but doesn't (the missing constraint would have caught it)
4. The proof is accepted despite the invalid witness

The test must verify that these "bug" animations are **pedagogically accurate**: the invalid witness actually would be accepted by the under-constrained circuit.

```typescript
describe('ZK Bug mode — missing boolean constraint', () => {
  // Full circuit: has the constraint x*(1-x)=0
  const fullR1CS: R1CSRow[] = [
    { A: { x: 1n }, B: { one_minus_x: 1n }, C: { product: 1n } }, // constraint 0
    // ... other constraints
  ];

  // Under-constrained circuit: constraint 0 is removed
  const underConstrainedR1CS: R1CSRow[] = [
    // constraint 0 is intentionally absent
    // ... other constraints
  ];

  const invalidWitness = { x: 5n, one_minus_x: 12n, product: 9n }; // x=5, not boolean

  it('invalid witness is REJECTED by full circuit', () => {
    // The full circuit should catch the invalid witness
    const result = fullR1CS.every(row =>
      checkR1CSRow(row, invalidWitness, 17n)
    );
    expect(result).toBe(false);  // Rejected — correct behavior
  });

  it('invalid witness is ACCEPTED by under-constrained circuit', () => {
    // The under-constrained circuit should miss the invalid witness
    const result = underConstrainedR1CS.every(row =>
      checkR1CSRow(row, invalidWitness, 17n)
    );
    expect(result).toBe(true);  // Accepted — this is the bug!
  });

  it('bug animation marks correct step as violated', () => {
    const bugSteps = missingBooleanConstraintCircuit.generateBugSteps();
    const violatedStep = bugSteps.find(s => s.violatedConstraints?.length);
    // In bug mode: the step showing "constraint removed" should NOT show violated —
    // the whole point is that the circuit FAILS to detect the violation
    expect(violatedStep).toBeUndefined();
  });
});
```

This test framework validates that the bug visualization is **pedagogically accurate**: it shows the correct failure mode (the invalid witness passes) and not an incorrect one (the circuit correctly rejects it, which would make it a normal visualization, not a bug demonstration).

**Cross-links:**
- Witness format: [witness-generation.md](./witness-generation.md)
- Step encoding: [step-encoding.md](./step-encoding.md)
- Reference gadgets: [gadgets.md](../zk/gadgets.md)
- 0xPARC bug book: [0xparc.md](../references/0xparc.md)
