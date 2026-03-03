# Folding Schemes and Nova

> ZK knowledge base — Block 6.
> Nova and folding schemes — the most recent major advance in ZK — at a level that clarifies what Phase 4 should actually visualize.

---

## Table of Contents

1. [The Problem: Recursion in ZK](#1-the-problem-recursion-in-zk)
2. [Existing Approaches (Pre-Nova)](#2-existing-approaches-pre-nova)
3. [Relaxed R1CS](#3-relaxed-r1cs)
4. [The Folding Scheme](#4-the-folding-scheme)
5. [IVC with Nova](#5-ivc-with-nova)
6. [Nova's Limitations](#6-novas-limitations)
7. [The Nova Ecosystem](#7-the-nova-ecosystem)
8. [Visualizability Assessment](#8-visualizability-assessment)
9. [Implications for ZK Visual](#9-implications-for-zk-visual)

---

## 1. The Problem: Recursion in ZK

### Iterated Computation

Some computations have the form `F^n(x)` — the function `F` applied `n` times:

```
x₀ → F → x₁ → F → x₂ → F → x₃ → ... → F → xₙ
```

Examples:
- A virtual machine executing `n` steps (each step is `F`)
- A recursive function applied `n` times
- A sequence of state transitions (each transaction is `F` on a blockchain state)

**The naive ZK approach**: encode the entire computation `F^n(x)` in one circuit. The circuit has `n × |F|` constraints, where `|F|` is the size of one application of `F`. This grows **linearly** with `n` — impractical when `n` is large (e.g., millions of VM steps).

### Incrementally Verifiable Computation (IVC)

**IVC** is a framework where you can prove `F^n(x)` incrementally:

1. Prove step 1: `F(x₀) = x₁` → proof `π₁`
2. Prove step 2: `F(x₁) = x₂` AND `π₁` is valid → proof `π₂`
3. ...
4. Prove step `n`: `F(xₙ₋₁) = xₙ` AND `πₙ₋₁` is valid → proof `πₙ`

The final proof `πₙ` proves that `xₙ = F^n(x₀)` without encoding the entire computation in one circuit. The key property: `πₙ` has **constant size** regardless of `n`.

The challenge: step 2 requires verifying `π₁` inside the step-2 circuit. If the verifier circuit is expensive, this defeats the purpose.

---

## 2. Existing Approaches (Pre-Nova)

### Recursive SNARKs

Verify a SNARK inside a SNARK circuit. The inner verifier circuit implements the full verification algorithm for the outer proof system.

**Cost**: For Groth16, the verification algorithm involves 3 pairing operations. Implementing pairing operations in a Groth16 circuit requires ~millions of constraints. This is not practical as an IVC building block.

For Halo2 with IPA, the inner verifier is cheaper but still non-trivial.

### Accumulation Schemes (Halo2)

Halo2's recursion model: instead of fully verifying each proof inside the next circuit, *accumulate* the verification work across proofs. The accumulator grows as new proofs are added; a final step verifies the accumulator once.

This is more efficient than recursive SNARKs but still requires significant per-step overhead in the circuit.

### Nova's Innovation

Nova completely avoids verifying a proof inside a circuit. Instead of "verify proof π₁ in step 2's circuit," Nova uses a **folding scheme** that *merges* two instances into one without verification:

- No pairing operations
- No polynomial commitment opening
- Just linear algebra (vector additions and scalar multiplications)

---

## 3. Relaxed R1CS

### Motivation

Standard R1CS is: `(Az) ⊙ (Bz) = Cz` (see [R1CS and Witnesses](./r1cs-and-witnesses.md#2-rank-1-constraint-systems-r1cs)).

To enable folding, Nova introduces a generalization: **relaxed R1CS**.

### Definition

Relaxed R1CS: given matrices A, B, C and parameters `u` (a scalar) and `E` (an "error vector"):

```
(Az) ⊙ (Bz) = u·Cz + E
```

Standard R1CS is the special case where `u = 1` and `E = 0`.

### Why This Generalization Enables Folding

When two R1CS instances are combined with a random linear combination, the result is not a standard R1CS instance — the cross terms introduce a non-zero error vector. By allowing `E ≠ 0` in the relaxed form, the folded instance is still a valid relaxed R1CS instance.

The error vector `E` tracks the "slack" introduced by folding. A valid proof shows that `E` was committed to honestly — this is what the folding verifier checks.

---

## 4. The Folding Scheme

### Setup

Two relaxed R1CS instances:
- `(w₁, x₁, u₁, E₁)` — witness, public input, scalar, error for instance 1
- `(w₂, x₂, u₂, E₂)` — same for instance 2

Both instances claim to satisfy the same circuit (same A, B, C).

### The Fold

Using a random challenge `r` (from Fiat-Shamir heuristic), produce a folded instance:

```
w  = w₁ + r · w₂
x  = x₁ + r · x₂
u  = u₁ + r · u₂
E  = E₁ + r · (Az₁ ⊙ Bz₂ + Az₂ ⊙ Bz₁ - u₁·Cz₂ - u₂·Cz₁) + r² · E₂
```

**The key property**: if both input instances satisfy relaxed R1CS, the folded instance also satisfies relaxed R1CS. The fold preserves satisfiability.

**Cost of folding**: O(n) vector operations — no pairings, no polynomial commitments, no FFTs. This is dramatically cheaper than verifying a SNARK.

### The Folding Verifier

The folding verifier checks:
1. That the commitments to `w₁`, `w₂` and `E₁`, `E₂` are valid
2. That the folded commitment `w` is a valid linear combination of `w₁` and `w₂`
3. That the error term `E` is correctly computed

The verifier uses **Pedersen commitments** (or any vector commitment scheme) to check these properties without seeing the actual witness values.

### Why No Pairing

Pedersen commitments require only scalar multiplications over an elliptic curve group (not pairings). Scalar multiplication is much cheaper and, crucially, can be computed inside an arithmetic circuit without an exponential blowup.

---

## 5. IVC with Nova

### The IVC Construction

To prove `F^n(x₀) = xₙ`:

1. **Step 0**: start with a trivial relaxed R1CS instance (u=1, E=0, trivially satisfied)
2. **Step i**: given the previous folded instance, fold in the instance for "step i satisfies F"
3. **After n steps**: one folded instance represents all n steps
4. **Final proof**: produce one SNARK (Groth16, Spartan, etc.) on the final folded instance

The final SNARK proof is constant size. The folded instance has O(1) description size (u, E are committed, not explicit).

### Memory

The prover must hold the full witness for each step in memory to compute the fold. Prover memory: O(n × |F|) — linear in total computation, same as the naive approach. Nova does not reduce memory; it reduces the circuit size of the recursive step.

### Verifier State

The verifier needs only:
- The final folded instance (O(1) committed state)
- The final SNARK proof (O(1))

This is the IVC guarantee: constant-size proof of arbitrary-length computation.

---

## 6. Nova's Limitations

### Uniform Computation Only

Nova's folding scheme folds **two instances of the same circuit** together. This requires that every step of the computation uses the same circuit `F`. This is called **uniform IVC** — the same circuit repeats.

Nova cannot fold instances of different circuits together without extension. Non-uniform IVC (different `Fᵢ` at each step) requires:
- **SuperNova**: extends Nova to support multiple circuit types per step
- **HyperNova**: uses a different algebraic structure (sum-check based)

### No Arbitrary Recursion

Nova is not a general recursive SNARK. It is specifically designed for IVC with uniform circuits. Use cases:

| Use case | Nova applicable? |
|---|---|
| Virtual machine (each instruction = same circuit) | Yes (with SuperNova) |
| Recursive SNARK composition (different circuits) | No — use Halo2 recursion |
| zkML (same neural network inference step repeated) | Yes |
| zk-email (complex one-off circuit) | No |

### Circuit Requirements

The circuit F must be expressible in relaxed R1CS. This is broadly compatible but requires translating AIR-based systems (STARKs) or complex PLONK circuits into relaxed R1CS, which may not be efficient.

---

## 7. The Nova Ecosystem

### Nova

"Nova: Recursive Zero-Knowledge Arguments from Folding Schemes" — Kothapalli, Setty, Tzialla. CRYPTO 2022, ePrint 2021/370. Microsoft Research. See also: [Papers reference](../references/papers.md#6-nova).

The original folding scheme. Targets relaxed R1CS. Uses Pedersen commitments. Requires a trusted setup for the commitment scheme (can use universal setup).

### SuperNova

Extension to support **multiple circuit types per step** (non-uniform IVC). Each step selects which of a pre-committed set of circuits to execute. Useful for VM execution (different opcodes = different circuits).

### HyperNova

Uses the **sum-check protocol** instead of random linear combinations for folding. More efficient for high-degree constraints and naturally compatible with CCS (Customizable Constraint Systems) — a generalization of R1CS that subsumes PLONK and AIR.

### Sangria

**PLONK-based folding** — applies the folding paradigm to PLONK arithmetization instead of R1CS. Enables UltraPlonk-style custom gates in a folding scheme context.

### ProtoStar

General accumulation scheme for non-uniform IVC. Handles arbitrary circuits, not just uniform ones. Combines ideas from Halo2's accumulation scheme and Nova's folding scheme.

### Timeline

```
2018    Recursive SNARKs (Coda, now Mina)
2020    Halo2 accumulation scheme
2022    Nova (Kothapalli, Setty, Tzialla)
2022    SuperNova
2023    Sangria, HyperNova
2023    ProtoStar
2024+   Production integrations (Nova in zkVM projects)
```

---

## 8. Visualizability Assessment

### What Can Be Visualized

| Nova concept | Visualizable? | Renderer | Notes |
|---|---|---|---|
| The IVC chain | Yes | `PipelineVisualizer` | Each step = one pipeline stage; outputs chain |
| The folding operation | Partially | Custom diagram | Merge of two witness vectors → one; abstract but illustrative |
| Relaxed R1CS structure | Yes | Modified `CircuitDAGRenderer` | Show `u` and `E` as additional circuit parameters |
| The error vector `E` | Abstractly | Heat map or highlighted vector | Cannot show actual values (field elements); show as "non-zero" indicator |
| SuperNova multi-circuit | Yes | Branching pipeline | Multiple circuit options with a selector |

### What Cannot Be Visualized Well

| Concept | Why difficult |
|---|---|
| The Pedersen commitment | Elliptic curve group operations — abstract algebra, not circuit structure |
| The cross-term computation in E | Pure linear algebra on large vectors — no natural visual metaphor |
| Fiat-Shamir challenge `r` | A hash output used as a scalar — random-looking number |
| Proof compression (final SNARK) | Requires separate Groth16/Spartan visualization |

### Recommendation

For Phase 4, the Nova visualization should focus on:

1. **The IVC concept**: show `F^n(x)` as a pipeline where each step "accumulates" — the folding metaphor
2. **Before/after folding**: two constraint system instances → one folded instance (schematic, not algebraic)
3. **The payoff**: constant-size proof after n steps regardless of n

Defer the algebraic internals (relaxed R1CS, error vector computation, Pedersen commitments) to advanced content. The core educational message is the IVC concept, not the cryptographic mechanism.

---

## 9. Implications for ZK Visual

### Catalog Item: 6.5 (Parallelism and Folding Schemes)

This file defines the scope and limits of what catalog item 6.5 should cover:

**Should include:**
- The IVC problem and why naive recursion is expensive
- The folding metaphor (two instances → one, then final SNARK)
- The Nova ecosystem overview (Nova, SuperNova, HyperNova — their relationships)
- Which use cases are practical (VM execution, zkML, uniform IVC)

**Should not include (in Phase 4):**
- The relaxed R1CS formal definition (may confuse without preparation)
- The Pedersen commitment scheme
- The cross-term derivation for `E`

**May include as "advanced" toggle:**
- Relaxed R1CS definition (linking to this file)
- Comparison with Halo2 accumulation schemes

### Scope Protection

This file exists to prevent scope creep: Nova is a deep topic that could consume unbounded implementation time. Phase 4's Nova visualization is a conceptual overview, not a cryptographic tutorial. The cryptographic internals documented here are for the ZK Visual team's understanding, not for direct visualization.

### See Also

- [R1CS and Witnesses](./r1cs-and-witnesses.md) — standard R1CS, which relaxed R1CS generalizes
- [Proving Systems](./proving-systems.md) — Halo2's recursion approach (comparison context)
- [Nova paper](../references/papers.md#6-nova) — the original paper
