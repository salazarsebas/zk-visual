# Witness Generation Strategy

> Implementation guide — the strategy for generating concrete signal values used in
> step animations: hardcoded small-field values for P0–P1, and the path to live witness
> generation in Phase 4.

---

## Table of Contents

1. [The Core Decision](#1-the-core-decision)
2. [The Small-Field Convention](#2-the-small-field-convention)
3. [The `signals` Object Format](#3-the-signals-object-format)
4. [When Signals Are Hidden](#4-when-signals-are-hidden)
5. [Constraint Satisfaction Verification](#5-constraint-satisfaction-verification)
6. [Witness Data Organization](#6-witness-data-organization)
7. [Field Arithmetic Utilities](#7-field-arithmetic-utilities)
8. [Phase 4: Live Witness Generation (Forward Reference)](#8-phase-4-live-witness-generation-forward-reference)

---

## 1. The Core Decision

ZK Visual uses **hardcoded small-field values** for all P0 and P1 visualizations.

This is a deliberate design choice, not a shortcut:

| Consideration | Rationale |
|---|---|
| **Pedagogical clarity** | Showing `a = 3` is more understandable than `a = 0x30644e...` (a 254-bit field element) |
| **No WASM/toolchain dependency** | No Circom compiler or SnarkJS WASM needed in Phase 0–1 |
| **Deterministic and reviewable** | Witness values can be checked by hand and reviewed by domain experts |
| **Immune to toolchain bugs** | Hardcoded values cannot break when the Circom compiler changes |
| **Fast to iterate** | Adding a new visualization requires writing witness data, not running a circuit compiler |

Live witness generation via SnarkJS (`snarkjs.wtns.compute`) is deferred to Phase 4's "build your own" mode. See §8 for that forward reference.

---

## 2. The Small-Field Convention

All displayed values use a **small prime as the field modulus**:

| Use case | Modulus | When to use |
|---|---|---|
| Simplest examples | `p = 17` | Single-gate demonstrations, boolean checks, basic arithmetic |
| Slightly larger range | `p = 97` | When values need to be > 16 for the example to make sense |
| Medium examples | `p = 997` | When multiple signal values need to be non-trivially different |

Every visualization that uses small-field values must include this note in its description steps:

```
"Values shown mod 17 for clarity. Production circuits use a 254-bit prime field."
```

This note is a string in a step's `description` field — never hardcoded in a renderer. Renderers are modulus-agnostic.

**Why p = 17 for the default:** It is the smallest prime large enough to show non-trivial modular arithmetic (e.g., `11 + 9 = 3 mod 17` is clearly non-obvious). With `p = 17`, the field has 17 elements [0..16] — small enough to enumerate in a diagram.

---

## 3. The `signals` Object Format

```typescript
// In CircuitStep:
signals?: Record<string, bigint>;
```

- **Key:** the Circom/Noir signal name **exactly as written** in `Circuit.code` — case-sensitive, must match character for character.
- **Value:** `BigInt` — always use the `n` suffix, even for small values.

**Example: 3-bit decomposition of n=6**

```typescript
signals: {
  n: 6n,          // input signal 'n'
  bits_0: 0n,     // bit 0 of 6 (6 = 110 in binary)
  bits_1: 1n,     // bit 1 of 6
  bits_2: 1n,     // bit 2 of 6
}
```

The Circom code must match exactly:
```circom
signal input n;       // key: 'n'
signal output bits[k]; // keys: 'bits_0', 'bits_1', 'bits_2' (flattened array syntax)
```

**How signals appear in the UI:**
- Named wires in the `CircuitVisualizer` show their value as an edge label when the `signals` object contains their name.
- The wire label replaces the edge's default appearance (thin line → thicker line with value badge).
- Signals absent from the `signals` object render as unlabeled wires.

---

## 4. When Signals Are Hidden

**Private input signals** — those marked `signal input` (private in Circom) or any signal that is part of the witness but not a public output — are initially hidden.

In the circuit DAG, private input nodes render with a lock icon or dashed border. Their value is rendered as `●●●` (three bullet dots) until the "witness revealed" step.

**The knowledge barrier animation:**

1. Initial steps: private input nodes show `●●●`; no signal value in `signals` for those nodes
2. **Witness revealed step:** The step immediately after "prover generates witness" in the animation arc. Private input values appear in `signals` for the first time.
3. After revelation: the value renders as normal (the lock icon remains, but the value is shown)

**Implementing the reveal:**

```typescript
// Step N: prover-knows-only (private inputs hidden)
steps.push({
  graph: g,
  totalConstraints: 0,
  signals: { /* no private signals here */ },
  description: 'The prover knows the private inputs, but we (the verifier) cannot see them.',
  insight: 'Zero-knowledge: the proof reveals nothing about the witness.',
});

// Step N+1: witness revealed (for visualization purposes only)
steps.push({
  graph: g,
  totalConstraints: 0,
  signals: { a: 3n, b: 7n, c: 4n },  // now revealed
  description: 'For this visualization, we reveal the witness to show what the prover computed.',
  label: 'Witness Revealed',
});
```

Note: in a real ZK proof, the verifier never sees the witness. The "reveal" is a pedagogical device to show what the prover is working with. The `insight` field on the preceding step makes this clear.

---

## 5. Constraint Satisfaction Verification

For development: write a `verifySignals` function that checks whether a given signal assignment satisfies all provided R1CS constraints. This runs in tests, not at runtime.

```typescript
type R1CSRow = {
  A: Record<string, bigint>;  // Signal name → coefficient
  B: Record<string, bigint>;
  C: Record<string, bigint>;
};

/**
 * Verify that (A·z) × (B·z) = (C·z) mod p for the given signal assignment.
 * Returns true if the constraint is satisfied, false if violated.
 */
function checkR1CSRow(
  row: R1CSRow,
  signals: Record<string, bigint>,
  p: bigint
): boolean {
  function dotProduct(coeffs: Record<string, bigint>): bigint {
    let sum = 0n;
    for (const [signal, coeff] of Object.entries(coeffs)) {
      const val = signals[signal] ?? 0n;
      sum = fieldMod(sum + coeff * val, p);
    }
    return sum;
  }

  const a = dotProduct(row.A);
  const b = dotProduct(row.B);
  const c = dotProduct(row.C);
  return fieldMod(a * b, p) === c;
}
```

**Usage in tests:**

```typescript
// For the boolean constraint x*(1-x) = 0:
// In R1CS: A = {x: 1}, B = {one_minus_x: 1}, C = {product: 1}
// (where product should equal 0)

const boolConstraint: R1CSRow = {
  A: { x: 1n },
  B: { one_minus_x: 1n },
  C: { product: 1n },
};

// Valid witness: x=1, one_minus_x=0, product=0
expect(checkR1CSRow(boolConstraint, { x: 1n, one_minus_x: 0n, product: 0n }, 17n)).toBe(true);

// Invalid witness: x=2, one_minus_x=16 (= -1 mod 17), product=15 (= 2×16 mod 17 ≠ 0)
expect(checkR1CSRow(boolConstraint, { x: 2n, one_minus_x: 16n, product: 15n }, 17n)).toBe(false);
```

See [testing-correctness.md](./testing-correctness.md) for the full test strategy including snapshot tests and constraint count verification.

---

## 6. Witness Data Organization

### Inline (simple circuits, ≤ 5 signals)

For circuits with few signals, define witness data inline in `generateSteps()`:

```typescript
export function generateSteps(): CircuitStep[] {
  // Witness: a=3, b=2, c=4; results: a_sq=9, bc=8, out=17
  const steps: CircuitStep[] = [];

  steps.push({
    graph: initial,
    signals: { a: 3n, b: 2n, c: 4n },
    // ...
  });
  // ...
}
```

### Named block (complex circuits, ≥ 6 signals)

For circuits with many signals or multiple signal configurations, define a named witness block at the top of the file:

```typescript
// In src/lib/circuits/bit-decomp.ts

const WITNESS = {
  // Input
  n: 6n,
  // Bit decomposition (6 = 0b110)
  bits_0: 0n,
  bits_1: 1n,
  bits_2: 1n,
  // Intermediate products (for boolean constraints)
  neg_bits_0: 1n,  // 1 - bits_0 = 1 - 0 = 1
  neg_bits_1: 0n,  // 1 - bits_1 = 1 - 1 = 0
  neg_bits_2: 0n,  // 1 - bits_2 = 1 - 1 = 0
  // Products (should all be 0 for valid boolean bits)
  prod_0: 0n,  // bits_0 * (1 - bits_0) = 0 * 1 = 0
  prod_1: 0n,  // bits_1 * (1 - bits_1) = 1 * 0 = 0
  prod_2: 0n,  // bits_2 * (1 - bits_2) = 1 * 0 = 0
  // Sum check: 0*1 + 1*2 + 1*4 = 6
  sum: 6n,
} as const;

export function generateSteps(): CircuitStep[] {
  // Use WITNESS.n, WITNESS.bits_0, etc.
}
```

**Do not store witness data in separate JSON files.** JSON does not support `BigInt` literals. Storing witness data as JSON strings and converting them back requires error-prone `BigInt(str)` calls throughout the codebase. TypeScript `const` objects with `n` literals are the correct format.

---

## 7. Field Arithmetic Utilities

Helper functions for computing intermediate signal values in `generateSteps()`:

```typescript
/** Reduce a BigInt to the range [0, p) */
function fieldMod(a: bigint, p: bigint): bigint {
  return ((a % p) + p) % p;
}

/** Addition mod p */
function fieldAdd(a: bigint, b: bigint, p: bigint): bigint {
  return fieldMod(a + b, p);
}

/** Subtraction mod p */
function fieldSub(a: bigint, b: bigint, p: bigint): bigint {
  return fieldMod(a - b, p);
}

/** Multiplication mod p */
function fieldMul(a: bigint, b: bigint, p: bigint): bigint {
  return fieldMod(a * b, p);
}

/** Modular inverse mod p (extended Euclidean algorithm) */
function fieldInv(a: bigint, p: bigint): bigint {
  let [old_r, r] = [a, p];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  if (old_r !== 1n) throw new Error(`${a} has no inverse mod ${p}`);
  return fieldMod(old_s, p);
}
```

**Standard modulus for pedagogical examples:**

```typescript
const P17 = 17n;   // Default for simplest examples
const P97 = 97n;   // For slightly larger value ranges
const P997 = 997n; // For medium-scale examples
```

**Usage in generateSteps():**

```typescript
// Computing witness values for the circuit a² + b·c (mod 17):
const p = P17;
const a = 3n, b = 2n, c = 4n;
const a_sq = fieldMul(a, a, p); // = 9n
const bc = fieldMul(b, c, p);   // = 8n
const out = fieldAdd(a_sq, bc, p); // = 0n (17 mod 17 = 0)
// → Display note: "17 ≡ 0 (mod 17) — wraps around!"
```

---

## 8. Phase 4: Live Witness Generation (Forward Reference)

> **Scope boundary:** Do not implement any of the following in Phase 0–2. This section documents the future path only.

When implementing Phase 4's "build your own circuit" mode, live witness generation enables:
- Users write a Circom template in the Monaco editor
- They provide input values
- The browser computes a real witness and animates the actual circuit execution

**The SnarkJS workflow (Phase 4):**

```typescript
// 1. Compile Circom → WASM (done server-side at build time; served as static files)
//    circom MyCircuit.circom --wasm --output ./public/circuits/

// 2. In the browser: compute witness using the compiled WASM
import * as snarkjs from 'snarkjs';

async function computeWitness(
  wasmBuffer: ArrayBuffer,
  inputs: Record<string, string | bigint>
): Promise<Record<string, bigint>> {
  const wtns = await snarkjs.wtns.compute(inputs, wasmBuffer);
  return wtns;
}
```

**The Circom compile-to-WASM pipeline (Phase 4):**

```sh
# Server-side (CI/CD or local build):
circom src/circuits/MyCircuit.circom \
  --wasm \
  --output public/circuits/MyCircuit/

# Output files:
#   public/circuits/MyCircuit/MyCircuit.wasm
#   public/circuits/MyCircuit/MyCircuit_js/witness_calculator.js
```

**Serving from Astro (Phase 4):**
- Place WASM files in `public/circuits/` — Astro serves these as static files
- The browser fetches them with `fetch('/circuits/MyCircuit/MyCircuit.wasm')`
- SnarkJS handles the WASM instantiation

**Phase 4 scope:** Live witness generation applies only to circuits in the "build your own" sandbox (catalog item 99.x in roadmap). All P0–P2 catalog items continue using hardcoded witness data.
