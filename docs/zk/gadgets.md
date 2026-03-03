# Gadgets

> ZK knowledge base — Block 3.
> Canonical implementations of every gadget in the content catalog, with precise constraint counts and the rationale for naive vs optimized versions.

---

## Table of Contents

1. [What is a Gadget](#1-what-is-a-gadget)
2. [Bit Decomposition](#2-bit-decomposition)
3. [Range Check](#3-range-check)
4. [Boolean Constraint](#4-boolean-constraint)
5. [Conditional Selection (MUX)](#5-conditional-selection-mux)
6. [Equality Check](#6-equality-check)
7. [Comparison (Less Than)](#7-comparison-less-than)
8. [Constraint Cost Summary](#8-constraint-cost-summary)
9. [Dependency on Proving System](#9-dependency-on-proving-system)
10. [Implications for ZK Visual](#10-implications-for-zk-visual)

---

## 1. What is a Gadget

A **gadget** is a reusable sub-circuit — a Circom template or equivalent construct — that implements a specific operation. Gadgets are to ZK circuits what functions are to programming: they encapsulate logic behind a named interface and compose into larger systems.

The gadget is the correct unit of abstraction for ZK Visual because:

1. **Reuse**: gadgets appear across many circuits (bit decomposition is used in range checks, comparisons, and hash functions)
2. **Teachability**: a gadget has a clear "before optimization" and "after optimization" state — the naive/optimized split is always the visual story
3. **Constraint counting**: gadgets have well-defined, circuit-backend-independent constraint counts (in R1CS)

---

## 2. Bit Decomposition

### What It Does

Decompose an integer `n` into its binary representation `[b₀, b₁, ..., bₖ₋₁]` where each `bᵢ ∈ {0, 1}` and `b₀` is the least significant bit.

### Why No "Naive" Version

Bit decomposition is already the primitive operation — it cannot be further decomposed. The "naive vs optimized" story applies to gadgets *built on top of* bit decomposition (range check, comparison).

### Constraint Structure

1. **Boolean checks** — for each bit `bᵢ`, verify it is 0 or 1:
   ```
   bᵢ × (1 - bᵢ) = 0
   ```
   Cost: `k` constraints (one per bit)

2. **Reconstruction check** — verify the bits reassemble to `n`:
   ```
   b₀·2⁰ + b₁·2¹ + ... + bₖ₋₁·2ᵏ⁻¹ = n
   ```
   Cost: 1 constraint (linear combination — free in R1CS since it is a sum, not a product)

**Total: `k + 1` constraints for a `k`-bit decomposition.**

Wait — the reconstruction check is linear (no multiplication), so it costs 0 additional multiplication constraints. Counting only multiplication constraints: **`k` constraints**.

### Circom Implementation

```circom
template Bits(k) {
    signal input n;
    signal output bits[k];

    var sum = 0;
    for (var i = 0; i < k; i++) {
        bits[i] <-- (n >> i) & 1;
        bits[i] * (1 - bits[i]) === 0;  // boolean check: 1 constraint each
        sum += bits[i] * (2 ** i);
    }
    n === sum;  // reconstruction check: linear, 0 multiplication constraints
}
```

### Why It Matters

Bit decomposition is the foundation of:
- Range checks (is `n < 2^k`?)
- Comparisons (is `a < b`?)
- Conditional selection (mux with bit selector)
- Hash functions (SHA-256 uses bit-level operations)
- Any gadget that must enforce numeric bounds

---

## 3. Range Check

### What It Does

Verify that an integer `n` satisfies `0 ≤ n < 2^k`.

### Naive Version

Check `n ≠ 0`, `n ≠ 1`, ..., `n ≠ 2^k - 1` — all values that are **not** in range are enumerated and excluded. This is wrong — the constraint should enforce that `n` **is in range**, not that it is not one specific out-of-range value.

The naive approach that actually works: for each possible value `v ∈ [0, 2^k)`, compute `(n - v)` and build a product that is zero iff `n` is one of those values. This requires `O(2^k)` constraints — exponential in `k`.

**Naive cost: 2^k constraints.**

For `k = 8`: 256 constraints. For `k = 32`: over 4 billion constraints. Completely impractical.

### Optimized Version: Bit Decomposition

A `k`-bit number `n` satisfies `0 ≤ n < 2^k` if and only if it has a valid `k`-bit binary representation. So: decompose `n` into `k` bits and verify each bit is boolean.

**Optimized cost: `k` multiplication constraints** (one boolean check per bit, plus one linear reconstruction check at cost 0).

### Concrete Example (8-bit range check)

| Version | Constraint count | Feasibility |
|---|---|---|
| Naive (product over values) | 256 | Impractical for k > 8 |
| Bit decomposition | 8 | Practical for k up to 254 |

This is the **Phase 0 validation experiment** — the first visualization in the ZK Visual catalog. It demonstrates the most important optimization insight in ZK gadget design.

### Circom Implementation

```circom
template RangeCheck(k) {
    signal input n;

    component bits = Bits(k);
    bits.n <== n;
    // Bits template enforces: each bit is boolean AND bits reconstruct n
    // Together these prove: 0 <= n < 2^k
}
```

---

## 4. Boolean Constraint

### What It Does

Enforce that a signal `n` is either 0 or 1 (not any other field element).

### Constraint

```
n × (1 - n) = 0
```

This is satisfied if and only if `n = 0` or `n = 1`. Over a field Fp, `n × (1 - n) = 0` means either `n = 0` or `n = 1` (since Fp has no zero divisors).

**Cost: 1 multiplication constraint.**

### Circom Implementation

```circom
template BooleanCheck() {
    signal input n;
    n * (1 - n) === 0;
}
```

### Role

The boolean constraint is the atomic building block of bit decomposition. It appears in virtually every non-trivial gadget. Its single-constraint cost is why bit decomposition scales as O(k) rather than O(2^k).

---

## 5. Conditional Selection (MUX)

### What It Does

Given a selector `s ∈ {0, 1}` and two values `a`, `b`, output `a` if `s = 1`, else `b`.

### Formula

```
output = s × (a - b) + b
```

Verify: if `s = 1`: `output = 1×(a-b)+b = a`. If `s = 0`: `output = 0+b = b`. Correct.

### Constraints

1. Boolean check on `s`: `s × (1 - s) = 0` — 1 constraint
2. Compute `s × (a - b)`: one multiplication — 1 constraint

**Total: 2 multiplication constraints.**

Note: `output = s × (a - b) + b` requires computing `s × (a-b)` as an intermediate signal. The `+ b` is linear (free).

### Circom Implementation

```circom
template Mux1() {
    signal input s;
    signal input a;
    signal input b;
    signal output out;

    s * (1 - s) === 0;           // boolean check: 1 constraint
    out <== s * (a - b) + b;     // selection: 1 constraint
}
```

---

## 6. Equality Check

### What It Does

Verify that two signals are equal: `a = b`.

### Constraints

In Circom, `a === b` emits a constraint directly. However, an equality constraint is **linear** (`a - b = 0`) — it costs **0 multiplication constraints**.

**Cost: 0 multiplication constraints** (it is a linear constraint, handled as a special case in R1CS).

### Why "Free" Equality Matters

Equality checks are used constantly (asserting that an output equals a computed value, that a public input matches a claimed value). Their zero cost means they do not inflate circuit complexity.

### Checking Inequality (a ≠ b)

Inequality is more expensive. One approach: prove that `(a - b)` has a multiplicative inverse, i.e., `(a - b) × inv = 1` for some `inv`. This uses 1 multiplication constraint and requires the prover to compute `inv = (a-b)⁻¹` as a witness signal.

---

## 7. Comparison (Less Than)

### What It Does

Verify that `a < b` for `k`-bit values.

### Method: Bit Decomposition of the Difference

`a < b` if and only if `b - a - 1 ≥ 0`, i.e., `b - a - 1` is a valid `k`-bit number.

Steps:
1. Compute `diff = b - a - 1` (linear, free)
2. Range check `diff` in `[0, 2^k)` using bit decomposition — `k` constraints
3. Verify the bit decomposition reconstructs `diff` — 1 linear constraint (free)

**Cost: `k + 1` multiplication constraints** for `k`-bit values.

### Handling Underflow

If `a ≥ b`, then `b - a - 1` is negative — which wraps to a large field element ≥ `2^k` over Fp. The bit decomposition check will fail because the field element has more than `k` bits. This is the intended behavior: the constraint is violated when `a ≥ b`.

But the circuit designer must ensure `k` is large enough that `a` and `b` genuinely fit in `k` bits. If `a` or `b` can be up to `Fp` in value, the comparison is meaningless without prior range checks.

### Circom Ecosystem Implementation

The canonical implementation is `LessThan(k)` from `circomlib`:

```circom
template LessThan(n) {
    signal input in[2];   // in[0] < in[1]?
    signal output out;    // 1 if yes, 0 if no

    component n2b = Num2Bits(n+1);
    n2b.in <== in[0] + (1 << n) - in[1];
    out <== 1 - n2b.out[n];
}
```

This is the circomlib pattern, slightly different from the naive "decompose the difference" approach but equivalent in constraint count.

---

## 8. Constraint Cost Summary

| Gadget | Naive cost | Optimized cost | Key technique |
|---|---|---|---|
| Bit decomposition | — (already primitive) | `k` constraints | Per-bit boolean check |
| Range check (k-bit) | `2^k` constraints | `k` constraints | Bit decomposition |
| Boolean constraint | — | 1 constraint | `n*(1-n)=0` |
| Conditional selection (MUX) | — | 2 constraints | Scalar-times-difference |
| Equality check | — | 0 constraints | Linear constraint (free) |
| Inequality check | — | 1 constraint | Multiplicative inverse trick |
| Less-than (k-bit) | — | `k+1` constraints | Diff + range check |
| Poseidon hash | N/A | ~240 constraints | ZK-native field arithmetic |
| SHA-256 | N/A | ~150,000 constraints | Bit-level operations |

---

## 9. Dependency on Proving System

All constraint counts above are for **R1CS with Groth16 or basic PLONK** — the target arithmetization for ZK Visual's pedagogical content.

### PLONK Custom Gates

UltraPlonk introduces custom gate types. A single UltraPlonk row can encode:
- An arithmetic gate (2 additions + 1 multiplication)
- A range gate (check a value in a range in 1 row)
- An elliptic curve addition
- A lookup table lookup

With custom gates, the "1 constraint per multiplication" cost model breaks down. A range check might cost 1 custom gate row instead of `k` multiplication rows.

### Halo2 Lookup Arguments

Halo2's Plookup integration allows range checks to be done using a lookup table: "is this value in the pre-committed table of all values in [0, 255]?" This costs O(1) rows regardless of `k`, at the cost of a larger proving system setup.

### Why ZK Visual Uses R1CS Counts

Teaching with R1CS constraint counts is pedagogically cleaner because:
1. The connection between "one multiplication" and "one constraint" is direct and intuitive
2. The naive vs optimized comparison is most dramatic in R1CS (256 vs 8 for a range check)
3. R1CS is the lowest common denominator — understanding it transfers to PLONK and Halo2

The catalog visualizations include a note when a PLONK or Halo2 optimization significantly changes the count.

See also: [Proving Systems](./proving-systems.md) for backend-specific arithmetization details.

---

## 10. Implications for ZK Visual

### Catalog Mapping

Each gadget in this document maps to one visualization unit in the content catalog:

| Gadget | Catalog item | Renderer |
|---|---|---|
| Range check (naive vs optimized) | Phase 0 validation experiment | `CostComparison` |
| Bit decomposition | Section 2.x (bit decomposition) | `CircuitDAGRenderer` |
| Boolean constraint | Section 2.x (building blocks) | `CircuitDAGRenderer` |
| MUX | Section 2.x (conditional) | `CircuitDAGRenderer` |
| Less-than | Section 2.x (comparison) | `CircuitDAGRenderer` + constraint walk |

### The Naive/Optimized Story

Every gadget visualization follows the same narrative arc:

1. **State the problem**: what does this gadget need to prove?
2. **Show the naive approach**: how would you do it without ZK-specific insight?
3. **Count the cost**: show the naive constraint count in a `CostComparison` bar chart
4. **Reveal the insight**: what ZK technique solves it more efficiently?
5. **Show the optimized circuit**: the gate-level DAG for the correct implementation
6. **Walk through execution**: animate the `CircuitStep[]` sequence

This arc requires both the `CostComparison` renderer (for step 3) and the `CircuitDAGRenderer` (for step 5) in the same visualization unit.

### See Also

- [Arithmetic Circuits](./arithmetic-circuits.md) — circuit structure and layout
- [R1CS and Witnesses](./r1cs-and-witnesses.md) — what constraints are and how they are checked
- [Hash Functions](./hash-functions.md) — gadgets extended to full hash function design
- [0xPARC Resources](../references/0xparc.md) — canonical gadget implementations from the ZK learning curriculum
