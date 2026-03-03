# ZK Content Catalog

> Full catalog of Zero Knowledge topics, circuits, and patterns to be visualized.
> Organized by category with priority tier, estimated complexity, and visualization type.

**Priority tiers:**
- `P0` — Required for MVP. Foundational, highest educational value
- `P1` — Second release. Important patterns, broader coverage
- `P2` — Third release or community contribution. Specialized topics

**Complexity ratings** (for the learner, not the implementation):
- `★☆☆` — No prior ZK knowledge required
- `★★☆` — Requires understanding of P0 content
- `★★★` — Requires understanding of P1 content or cryptography background

---

## Table of Contents

1. [Category 1 — Foundations](#1-foundations)
2. [Category 2 — Core Gadgets](#2-core-gadgets)
3. [Category 3 — Hash Functions in Circuits](#3-hash-functions-in-circuits)
4. [Category 4 — Merkle Trees](#4-merkle-trees)
5. [Category 5 — Proving Systems](#5-proving-systems)
6. [Category 6 — Optimization Patterns](#6-optimization-patterns)
7. [Category 7 — Real-World Circuits](#7-real-world-circuits)
8. [Coverage Summary](#8-coverage-summary)

---

## 1. Foundations

> No prior ZK knowledge required. These are the conceptual building blocks that everything else depends on.

### 1.1 What is a ZK Proof?
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★☆☆ |
| **Visualization type** | Pipeline diagram (interactive) |

**Description:** High-level interactive diagram of the prover-verifier model. A prover holds a secret witness and wants to convince a verifier of a statement without revealing the secret. The user clicks through each stage — witness generation, circuit satisfaction, proof creation, verification — with plain-English annotations at each step.

**Key insight to deliver:** The verifier learns that the statement is true but learns nothing about the private input. Visualized as an information-flow diagram with "knowledge barrier" clearly marked.

**No mathematics required at this stage.**

---

### 1.2 Arithmetic Circuits
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★☆☆ |
| **Visualization type** | DAG (animated gate-by-gate) |

**Description:** Build a simple arithmetic circuit from scratch — e.g., computing `a² + b·c` — and watch how values flow through addition and multiplication gates. Step through each gate sequentially.

**What the user sees:**
- Input nodes labeled with concrete values (`a=3`, `b=2`, `c=4`)
- Gate nodes (`+`, `×`) lit up as they evaluate
- Wire values appearing as each gate computes
- Final output value appearing at the output node

**Key insight:** Any computation that can be expressed as polynomial equations over a field can be represented as an arithmetic circuit. This is the foundation of all ZK systems.

---

### 1.3 Signals and Constraints (R1CS)
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Split view: circuit DAG + constraint table |

**Description:** Show the relationship between a circuit and its R1CS (Rank-1 Constraint System) representation. For a small example circuit, display the constraint table alongside the circuit DAG. As the user steps through, each constraint is highlighted in both views simultaneously.

**Constraint form:** `(aᵢ · w) * (bᵢ · w) = (cᵢ · w)` — explained visually as "left wire × right wire = output wire" for each multiplication gate.

**Key insight:** Every multiplication gate in a circuit corresponds to exactly one R1CS constraint. Addition gates and constant multiplications are "free" (they don't add constraints). This is why minimizing multiplication gates reduces circuit cost.

---

### 1.4 Public vs. Private Inputs
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★☆☆ |
| **Visualization type** | Circuit DAG with color-coded input types |

**Description:** Show the same circuit with public inputs (orange, visible to verifier) and private inputs (blue, hidden from verifier). Animate the "knowledge barrier" — the verifier can see public inputs and the final proof, but not the private inputs or intermediate wire values.

**Concrete example:** Proving you know the preimage of a hash without revealing the preimage. Public: the hash output. Private: the input.

---

### 1.5 Witness Generation
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Animated wire-value propagation |

**Description:** Step through the process of computing a witness for a given circuit and input. Show how each intermediate signal is computed top-to-bottom through the circuit DAG, producing the full assignment vector `w`.

**Key insight:** Witness generation is just evaluating the circuit with concrete inputs. The witness is the assignment of values to all signals (not just inputs and outputs). The proof is created from this witness.

---

## 2. Core Gadgets

> The fundamental building blocks of ZK circuit design. These are the "functions" that circuit developers compose.

### 2.1 Bit Decomposition
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Side-by-side comparison (naive vs optimized) + DAG |

**Description:** Show how to prove that a signal `x` is a valid n-bit number.

**Naive approach:** Enumerate every possible value and check `x·(x−v)=0` for each. For 8-bit range: 256 constraints.

**Optimized approach:** Decompose `x` into its bits `b₀, b₁, ..., b₇`. Prove each bit is 0 or 1 (`bᵢ·(1−bᵢ)=0`), and prove they reconstruct `x` (`∑ 2ⁱ·bᵢ = x`). For 8-bit range: 9 constraints.

**Constraint comparison visualization:**
```
Naive:     ████████████████████████████████  256 constraints
Optimized: ████████ 9 constraints
           96.5% reduction
```

This is also the **validation experiment** described in [ZK Visualization Approach](../concept/zk-visualization.md#5-the-validation-experiment).

---

### 2.2 Range Check
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Gadget DAG + constraint counter |

**Description:** Prove that `a ≤ x ≤ b` for a private signal `x`. Build on bit decomposition to show how range constraints are implemented efficiently.

**Key insight:** Once you have bit decomposition, range checks become a combination of bit constraints and a final reconstruction check. Show the modular composition of gadgets.

---

### 2.3 Boolean Constraints
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★☆☆ |
| **Visualization type** | Single constraint visualization |

**Description:** The simplest non-trivial constraint pattern: `x·(1−x)=0` proves that `x` is either 0 or 1. Show this as a single gate and explain why it works — if `x=0`, left side is 0. If `x=1`, `(1−1)=0`. If `x=2`, `2·(1−2) = 2·(−1) = −2 ≠ 0`.

**Visualization:** Animate the check for values x=0, x=1, x=2 showing which satisfy and which violate the constraint.

---

### 2.4 Conditional Selection (if/else in circuits)
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Gadget DAG + step animation |

**Description:** Circuits have no branching — you cannot write `if (cond) { a } else { b }` directly. Show how conditional selection is implemented as: `result = cond · a + (1 − cond) · b`.

**Prerequisite:** Boolean constraint (cond must be 0 or 1).

**Visualization:** Animate with `cond=1` (selects `a`) and `cond=0` (selects `b`), showing both branches always evaluated but only one "selected" by the multiplier.

**Key insight:** ZK circuits always evaluate both branches. This is an important anti-pattern to internalize early — code that "looks like" it avoids a branch still pays for both.

---

### 2.5 Equality Check
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★☆ |
| **Visualization type** | Gadget DAG |

**Description:** Proving `a = b` inside a circuit. Two approaches: (1) simply assert the constraint `a − b = 0`, (2) use a helper signal to prove `a·inv(a−b) = 1` when `a ≠ b`. Show when each is appropriate.

---

### 2.6 Comparison (less-than, greater-than)
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Gadget DAG with bit decomposition sub-circuit |

**Description:** Proving `a < b` in a ZK circuit. Requires bit decomposition of the difference `b−a` and a range check. Show the composition of gadgets and the final constraint count.

---

### 2.7 Multiplication with Overflow Check
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Gadget DAG |

**Description:** Multiplying two large numbers inside a circuit and proving no overflow occurred. A critical pattern for implementing integer arithmetic in circuits that operate over a field.

---

## 3. Hash Functions in Circuits

> Hash functions are among the most common components in real-world ZK circuits. Their circuit cost varies enormously by design.

### 3.1 Why Hash Functions Are Expensive in ZK
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Cost comparison chart |

**Description:** A conceptual comparison showing why standard cryptographic hashes (SHA-256, Keccak-256) are extremely expensive in ZK circuits, while ZK-friendly hashes (Poseidon, MiMC, Rescue) are orders of magnitude cheaper.

**The key insight:** Standard hashes use bitwise operations (XOR, AND, shifts) that require bit decomposition in an arithmetic circuit — each bitwise op costs multiple constraints. ZK-friendly hashes are designed using field-native operations (addition, multiplication, exponentiation) that map directly to circuit gates.

**Visualization:** Bar chart of constraint count per hash evaluation:
```
Keccak-256:    ████████████████████████████████████████ ~150,000
SHA-256:       ████████████████████████████████████ ~27,000
MiMC-p/p:      ████████ ~640
Poseidon-128:  ████ ~240
```

---

### 3.2 Poseidon Hash
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Sponge construction DAG + round function detail |

**Description:** Step through the Poseidon permutation at a high level — the sponge construction absorbing inputs, applying round constants and S-boxes (field exponentiation), and producing the hash output. Show why field-native operations are inexpensive.

**Note:** Full mathematical detail is beyond scope. The goal is intuition for the structure, not a proof of security.

---

### 3.3 MiMC Hash
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Round structure diagram |

**Description:** Show the MiMC-p/p (Feistel-based) construction. Simpler than Poseidon, historically important as the first widely-used ZK-friendly hash, now largely superseded.

---

## 4. Merkle Trees

> Merkle trees are the most common data structure in production ZK applications (identity systems, state proofs, membership proofs).

### 4.1 Merkle Proof in a Circuit
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Tree visualization + circuit path animation |

**Description:** Show a Merkle tree and animate a membership proof for a leaf. Then show how this proof is verified inside a ZK circuit — hashing sibling nodes up the path to reconstruct the root and checking equality with the public root.

**Two-panel view:**
- Left: the Merkle tree with the proof path highlighted
- Right: the circuit gadget computing the path hash step by step

**Constraint count:** `depth × hash_cost` — show how the cost scales with tree depth.

---

### 4.2 Merkle Inclusion vs. Exclusion
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Comparison diagram |

**Description:** Inclusion proofs vs. exclusion proofs (non-membership). Sparse Merkle trees as a pattern for efficient non-membership proofs. Show the difference in circuit complexity.

---

### 4.3 Indexed Merkle Tree
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Tree structure + insertion animation |

**Description:** Aztek's indexed Merkle tree pattern — efficient non-membership proofs without the overhead of full sparse Merkle trees. A more advanced pattern for users building identity or nullifier systems.

---

## 5. Proving Systems

> High-level comparison of ZK proving systems. No cryptographic internals — tradeoffs only.

### 5.1 Proving System Comparison
| | |
|---|---|
| **Priority** | P0 |
| **Complexity** | ★★☆ |
| **Visualization type** | Radar/spider chart + property table |

**Description:** Side-by-side comparison of the four major proving system families: Groth16, PLONK, Halo2, and STARKs. Visualized as a radar chart with axes:
- Proof size
- Proving time
- Verification time
- Trusted setup required
- Recursion-friendly
- Post-quantum secure

**Property table:**

| | Groth16 | PLONK | Halo2 | STARKs |
|---|:---:|:---:|:---:|:---:|
| Proof size | ~200B | ~1.5KB | ~2KB | ~45–100KB |
| Setup | Trusted, circuit-specific | Trusted, universal | None | None |
| Verification time | Fast | Medium | Medium-slow | Slow |
| Recursion | Hard | Moderate | Native (IPA) | Native |
| Post-quantum | ❌ | ❌ | ❌ | ✅ |

---

### 5.2 Groth16 Deep-dive
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Protocol pipeline |

**Description:** The proving pipeline for Groth16 — from R1CS to QAP to the pairing-based proof. Shown at the level of "what each step transforms," not the mathematics. For developers who need to understand why Groth16 needs a per-circuit trusted setup.

---

### 5.3 PLONK / UltraPlonk
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Constraint system comparison |

**Description:** How PLONKish arithmetization differs from R1CS — custom gates, lookup arguments, wider columns. Show why UltraPlonk enables more efficient circuits for certain patterns.

---

## 6. Optimization Patterns

> Practical circuit design patterns that reduce constraint count, proving time, or memory usage.

### 6.1 Lookup Arguments (Plookup / LogUp)
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Before/after constraint comparison |

**Description:** Lookup arguments allow a circuit to assert "this value is in this table" as a single constraint, instead of encoding the table membership check as a polynomial constraint. Show the before/after for a range check using a lookup vs. bit decomposition.

**Visualization:** Split view showing constraint count for a 16-bit range check:
```
With bit decomposition:  ████████████████████ 17 constraints
With lookup argument:    █ 1 constraint
```

---

### 6.2 Avoiding Non-Native Field Arithmetic
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Cost comparison + circuit structure |

**Description:** When a circuit operates over field `Fp` but needs to verify arithmetic in a different field `Fq` (e.g., verifying ECDSA over secp256k1 inside a BN254 circuit), the cost is enormous — each non-native field multiplication requires ~36 constraints vs. 1 for native arithmetic.

**Visualization:** Show the constraint explosion visually and explain why using ZK-native hash functions and signature schemes (EdDSA over the native curve instead of ECDSA over secp256k1) matters.

---

### 6.3 Signal Reuse
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★☆ |
| **Visualization type** | Circuit comparison (duplicate vs. shared subgraph) |

**Description:** When the same sub-computation appears multiple times in a circuit, it can be computed once and its result signal reused. Show a circuit with and without signal reuse and the corresponding constraint count difference.

---

### 6.4 Reducing Constraints with Custom Gates
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Constraint table comparison |

**Description:** In PLONKish systems, custom gates allow a single gate to enforce multi-constraint relationships. Show how a 5-wire Poseidon S-box can be encoded as a single custom gate vs. multiple R1CS constraints.

---

### 6.5 Parallelism and Folding Schemes
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Timeline / pipeline diagram |

**Description:** High-level visualization of how Nova and other folding schemes allow incremental computation — proving a long computation step-by-step with constant-size proofs. Not circuit internals — the mental model of "fold many instances into one."

---

## 7. Real-World Circuits

> Complete small circuits from real ZK applications. End-to-end examples that tie together multiple gadgets.

### 7.1 ZK Age Verification
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★☆ |
| **Visualization type** | Full circuit DAG |

**Description:** Prove that a person's age (encoded in a credential) is above a threshold without revealing the actual age or the credential. Circuit components: hash verification of the credential, range check on the age field, public output of the result.

**Gadgets used:** Hash (Poseidon), range check, boolean output.

---

### 7.2 Private Voting
| | |
|---|---|
| **Priority** | P1 |
| **Complexity** | ★★★ |
| **Visualization type** | Full circuit DAG + nullifier concept |

**Description:** Prove membership in a voter set (Merkle proof) and that a vote hasn't been cast twice (nullifier), without revealing the voter's identity. The Semaphore protocol pattern.

**Gadgets used:** Merkle proof, Poseidon hash, nullifier generation, public signal.

---

### 7.3 ZK KYC / Identity
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★★ |
| **Visualization type** | Full circuit DAG + data flow |

**Description:** Prove properties of an identity credential (issued by a trusted authority) without revealing the underlying data. Show how a circuit can verify a signature over selective fields of a credential.

---

### 7.4 Sudoku Proof
| | |
|---|---|
| **Priority** | P2 |
| **Complexity** | ★★☆ |
| **Visualization type** | Grid visualization + constraint animation |

**Description:** A classic ZK example — prove you know the solution to a Sudoku puzzle without revealing the solution. Show the circuit encoding the uniqueness constraints for rows, columns, and boxes. Good for demonstrating the generality of ZK.

---

## 8. Coverage Summary

| Category | P0 | P1 | P2 | Total |
|---|:---:|:---:|:---:|:---:|
| 1. Foundations | 5 | 0 | 0 | 5 |
| 2. Core Gadgets | 4 | 3 | 0 | 7 |
| 3. Hash Functions | 1 | 1 | 1 | 3 |
| 4. Merkle Trees | 1 | 1 | 1 | 3 |
| 5. Proving Systems | 1 | 0 | 2 | 3 |
| 6. Optimization Patterns | 0 | 3 | 2 | 5 |
| 7. Real-World Circuits | 0 | 2 | 2 | 4 |
| **Total** | **12** | **10** | **8** | **30** |

**MVP (P0 items): 12 visualizations**
**Second release (P0 + P1): 22 visualizations**
**Full catalog (all tiers): 30 visualizations**

---

*See also: [ZK Visualization Approach](../concept/zk-visualization.md) · [Architecture](../technical/architecture.md) · [Roadmap](../roadmap/roadmap.md)*
