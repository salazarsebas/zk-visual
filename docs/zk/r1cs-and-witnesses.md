# R1CS and Witnesses

> ZK knowledge base — Block 2.
> Mathematical foundation for constraint systems and witness vectors underlying every visualization.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Rank-1 Constraint Systems (R1CS)](#2-rank-1-constraint-systems-r1cs)
3. [The Witness Vector](#3-the-witness-vector)
4. [From Circom to R1CS](#4-from-circom-to-r1cs)
5. [Satisfiability](#5-satisfiability)
6. [Public vs Private Inputs in R1CS](#6-public-vs-private-inputs-in-r1cs)
7. [Constraint Count as a Metric](#7-constraint-count-as-a-metric)
8. [Implications for ZK Visual](#8-implications-for-zk-visual)

---

## 1. Overview

Every animation in ZK Visual that shows a constraint being "satisfied" or "violated" corresponds to a concrete row in an R1CS matrix being checked. Understanding R1CS precisely is not optional — it is the mathematical substrate of every circuit visualization.

R1CS is the most common intermediate representation between a high-level constraint language (Circom, Noir) and a backend proving system. The prover's job is to produce a witness vector that satisfies every row. The verifier's job is to confirm the proof without seeing the witness.

This document defines R1CS formally, explains what the witness vector contains and why, and traces the compilation path from Circom source code to R1CS rows.

---

## 2. Rank-1 Constraint Systems (R1CS)

### Formal Definition

An R1CS instance consists of:

- Three matrices **A**, **B**, **C** each of size `m × n`
  - `m` = number of constraints
  - `n` = length of the witness vector
- A witness vector **z** of length `n`

A constraint is **satisfied** if and only if:

```
(A·z) ⊙ (B·z) = C·z
```

where `⊙` denotes the Hadamard (element-wise) product.

Each row `i` of the matrices encodes one constraint:

```
(A[i] · z) × (B[i] · z) = C[i] · z
```

This is a "rank-1" constraint because each row encodes exactly one multiplication.

### Why Rank-1

Every constraint is a product of two linear combinations equaling a third linear combination. This form:
- Cannot encode degree-3 or higher constraints directly
- Can encode any arithmetic circuit by breaking down to additions and multiplications
- Maps naturally to pairing-based proof systems (Groth16, PLONK)

### Field Arithmetic

All operations are over a prime field **Fp** for some large prime `p`. Values "wrap around" modulo `p`. There are no overflow errors — just modular arithmetic.

---

## 3. The Witness Vector

### Structure

The witness vector `z` has a fixed structure by convention:

```
z = [ 1 | public_inputs | private_inputs | intermediate_signals ]
     ^                                                            ^
     position 0                                            position n-1
```

The `1` at position 0 is not optional — it is a convention that allows matrix rows to encode constant terms. A matrix row `A[i]` that has a non-zero entry at column 0 effectively adds a constant to the left-hand side of the constraint.

### What "Witness" Means

In ZK terminology, "the witness" refers to the full assignment — every signal value needed to evaluate the circuit. This includes:

| Component | Visibility | Included in z? |
|---|---|---|
| Constant `1` | — | Yes, at position 0 |
| Public inputs | Known to verifier | Yes |
| Private inputs | Hidden from verifier | Yes |
| Intermediate signals | Internal to circuit | Yes |
| Output signals | Public or private | Yes |

The witness is "everything the prover knows" and "everything needed to verify each constraint locally."

### Why Not Just the Private Inputs?

Colloquially, people say "the witness is the secret inputs." Technically, the witness is the full assignment. The private inputs are the *secrets* within the witness. The distinction matters for constraint checking: every constraint row references `z` positions that may be public or private.

---

## 4. From Circom to R1CS

### Circom's Constraint Syntax

Circom uses `<==` (assign and constrain) and `===` (constrain only) to emit R1CS rows.

**Multiplication constraint** — `a * b === c`:

This emits exactly one R1CS row:
- `A[i]` selects signal `a` (coefficient 1 at `a`'s column, 0 elsewhere)
- `B[i]` selects signal `b`
- `C[i]` selects signal `c`

Result: `(1·a) × (1·b) = (1·c)` → one R1CS row.

**Addition constraint** — `a + b === c`:

This is a *linear* constraint. Linear constraints do not require a multiplication row. They are handled as:
- A homogeneous constraint: one linear combination that must equal zero
- Or absorbed into another constraint as a linear combination

In practice, Circom may still emit a formal R1CS row for linear constraints, but with `B[i] = [1, 0, 0, ...]` (selecting the constant 1 at position 0) so that `(A·z) × 1 = C·z`.

### Compilation Example

Circom template:

```circom
template Square() {
    signal input a;
    signal output b;
    b <== a * a;
}
```

Compiles to one R1CS row where A selects `a`, B selects `a`, C selects `b`:

```
(1·a) × (1·a) = (1·b)
```

Witness vector: `z = [1, a, b]` where `a` is private input, `b` is output.

### Why `===` Emits Constraints but `<--` Does Not

In Circom:
- `b <-- expr` assigns a value but emits **no constraint** (dangerous — unconstrained signals)
- `b <== expr` assigns AND constrains (safe)
- `b === expr` constrains only (use when `b` is already assigned)

An unconstrained signal is a ZK bug: the prover can set it to any value and the verifier cannot detect it. See also: [0xPARC ZK Bug Book](../references/0xparc.md#4-zk-bug-book).

---

## 5. Satisfiability

### What "Satisfied" Means

A circuit is **satisfiable** given a specific input if there exists a witness `z` such that every row of the R1CS holds:

```
∀i: (A[i]·z) × (B[i]·z) = C[i]·z
```

Satisfiability is the core invariant. The prover produces a valid witness (which satisfies every constraint). The proof commits to this witness without revealing it. The verifier checks the proof confirms satisfiability without reconstructing `z`.

### Animation Model

In ZK Visual, executing a circuit animation means:

1. Start with input values → populate `z`
2. Compute intermediate signals → extend `z`
3. For each step in the execution trace:
   - Highlight the active constraints (rows being checked)
   - Show whether each evaluates to satisfied (✓) or violated (✗)

Each "step" in a `CircuitStep` object corresponds to checking a subset of R1CS rows.

---

## 6. Public vs Private Inputs in R1CS

### The Instance vs the Witness

The R1CS "instance" is the public part: the values of public inputs and the circuit structure (matrices A, B, C). The "witness" includes everything else.

```
z = [ 1 | pub_in₁  pub_in₂ | priv_in₁  priv_in₂ | sig₁  sig₂  sig₃ ]
         └────────────────┘   └────────────────────┘   └──────────────┘
              instance                witness              witness
              (public)                (secret)            (secret)
```

The verifier knows `A`, `B`, `C`, and the public input columns of `z`. The proof convinces the verifier that a valid completion of `z` exists, without revealing the private columns.

### Implications

- The circuit designer controls which signals are `input signal` (private by default in Circom) vs declared as public
- Public inputs can be verified against external data (e.g., a Merkle root, a nullifier hash)
- Private inputs carry the secret (e.g., a private key, a pre-image)

---

## 7. Constraint Count as a Metric

### Why Constraint Count Matters

Constraint count is the primary proxy for proof generation cost:

| Constraints | Approximate prover time |
|---|---|
| 1,000 | < 1 second |
| 10,000 | ~1–5 seconds |
| 100,000 | ~10–60 seconds |
| 1,000,000 | ~minutes |
| 10,000,000 | ~10+ minutes |

*(Highly hardware-dependent — assume a modern laptop with 16GB RAM.)*

### Complexity

For most proving systems (Groth16, PLONK):

- Prover time: **O(n log n)** — dominated by FFT over the constraint domain
- Proof size: **O(1)** — constant number of group elements (Groth16: 3 points)
- Verifier time: **O(1)** — constant number of pairings

This asymmetry (linear prover, constant verifier) is what makes ZK proofs useful for blockchain verification: a miner proves a large computation, the chain verifies cheaply.

### Why the Constant Matters Too

The O(n log n) prover has a concrete constant. Going from 150,000 constraints (SHA-256) to 240 constraints (Poseidon) is not a marginal improvement — it is a 625× speedup that makes Merkle tree proofs practical. See also: [Hash Functions](./hash-functions.md).

---

## 8. Implications for ZK Visual

### Direct Mappings

| R1CS concept | ZK Visual implementation |
|---|---|
| R1CS row | One item in `activeConstraints[]` |
| Constraint satisfied | `satisfiedConstraints[]` contains the row index |
| Constraint violated | Highlighted in red in the circuit animation |
| Witness vector `z` | The `signals` object in `CircuitStep` |
| Public inputs | Shown in the circuit's "instance" panel |
| Private inputs | Shown as redacted/hidden in the UI |

### The `CircuitStep` Model

In the ZK Visual architecture, a `CircuitStep` object maps directly to "checking a set of R1CS rows":

```typescript
interface CircuitStep {
  stepIndex: number;
  activeConstraints: number[];    // R1CS row indices being checked
  satisfiedConstraints: number[]; // which of those hold
  signals: Record<string, bigint>; // current z values
  explanation: string;
}
```

The witness vector `z` populates `signals`. Each `activeConstraints` entry is an R1CS row index. Walking through `CircuitStep[]` is equivalent to walking through the R1CS row-by-row.

### See Also

- [Arithmetic Circuits](./arithmetic-circuits.md) — how circuits become R1CS
- [Gadgets](./gadgets.md) — constraint counts per gadget
- [Proving Systems](./proving-systems.md) — how R1CS is used by Groth16 and PLONK
- [Folding Schemes](./folding-schemes.md) — relaxed R1CS and Nova
