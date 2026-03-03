# 0xPARC

> References — key teams.
> Reference for 0xPARC, the most important ZK education organization, and their curriculum.

---

## Table of Contents

1. [About 0xPARC](#1-about-0xparc)
2. [ZK Learning Resources](#2-zk-learning-resources)
3. [Circom Workshop Materials](#3-circom-workshop-materials)
4. [ZK Bug Book](#4-zk-bug-book)
5. [Applied ZK Residency](#5-applied-zk-residency)
6. [Relevance to ZK Visual](#6-relevance-to-zk-visual)

---

## 1. About 0xPARC

**0xPARC** (Programmable Cryptography Research) is a research and education organization focused on advancing the practical use of cryptographic tools — particularly ZK proofs, multi-party computation, and fully homomorphic encryption.

**Website**: `0xparc.org`

**GitHub**: `github.com/0xPARC`

**Learning curriculum**: `learn.0xparc.org`

0xPARC occupies a unique position in the ZK ecosystem: it is neither a product company (building L2s or protocols) nor an academic institution (publishing papers). It exists specifically to **educate developers** about programmable cryptography, producing the most practical, hands-on ZK educational material available.

For ZK Visual, 0xPARC is important as the **primary source of canonical Circom educational content**. Their workshop problems and curriculum materials define the community's shared vocabulary for ZK circuit design patterns.

---

## 2. ZK Learning Resources

### The `learn.0xparc.org` Curriculum

The 0xPARC ZK curriculum is a structured course covering:

1. **Introduction to ZK**: what ZK proofs are, the three properties (completeness, soundness, zero-knowledge), the mental model for constraints
2. **R1CS by hand**: manually constructing R1CS matrices for simple programs — the most effective way to internalize what constraints mean
3. **Introduction to Circom**: writing templates, using signals, the `<==` vs `<--` distinction (see [R1CS and Witnesses](../zk/r1cs-and-witnesses.md#4-from-circom-to-r1cs))
4. **Circuit writing patterns**: the canonical gadget implementations (bit decomposition, comparators, Merkle proofs)
5. **ZK application design**: putting circuits together into full applications (Merkle-based membership, nullifier patterns)

### Format

The curriculum is delivered as:
- Written guides at `learn.0xparc.org`
- Workshop problem sets with solutions (on GitHub)
- Video recordings of workshop sessions

The written guides are the highest-quality free Circom educational resource available. They are more practical than academic papers and more rigorous than most blog posts.

---

## 3. Circom Workshop Materials

### Overview

0xPARC's Circom workshops are structured around progressive problem sets. Each problem implements one gadget or circuit pattern, starting from scratch (computing witnesses without a library) to build deep understanding.

**GitHub**: `github.com/0xPARC/circom-ecdsa` and related repos contain production-grade Circom examples.

### Workshop Problem Hierarchy

Problems progress in difficulty:

| Problem | Circom concept | Constraint type |
|---|---|---|
| `IsZero` | Template basics, conditional logic | 1 constraint |
| `IsEqual` | Equality via IsZero | 1 constraint |
| `Num2Bits` | Bit decomposition | k constraints |
| `LessThan` | Comparison via bit decomp | k+1 constraints |
| `MiMCSponge` | Hash function construction | ~300 constraints |
| `MerkleProof` | Compositional circuits | Tree-depth × hash cost |
| `ECDSAVerify` | ECDSA signature verification | ~1,500,000 constraints |

These problems map directly to ZK Visual's content catalog. Each is a candidate for a visualization.

### Canonical Gadget Implementations

0xPARC's workshop solutions are the **community-accepted reference implementations** for basic ZK gadgets. When ZK Visual shows a gadget, the implementation should match 0xPARC's canonical version (or circomlib's, which 0xPARC uses) to maximize credibility and avoid teaching non-standard patterns.

Key implementations to reference:

**IsZero** (the foundational gadget):
```circom
template IsZero() {
    signal input in;
    signal output out;
    signal inv;

    inv <-- in != 0 ? 1/in : 0;
    out <== -in * inv + 1;
    in * out === 0;
}
```
This is the 0xPARC canonical IsZero. Note the use of `<--` for the hint (witness computation) and `<==` for the constraints. Three signals, two constraints.

**Num2Bits** (bit decomposition — see [Gadgets](../zk/gadgets.md#2-bit-decomposition)):
```circom
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1 = 0;
    var e2 = 1;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc1 += out[i] * e2;
        e2 = e2 + e2;
    }
    lc1 === in;
}
```

### circomlib

The `circomlib` library (maintained by iden3, widely used by the 0xPARC community) contains production Circom implementations of all standard gadgets:

**GitHub**: `github.com/iden3/circomlib`

Standard gadgets in circomlib:
- `bitify.circom`: Num2Bits, Bits2Num
- `comparators.circom`: IsZero, IsEqual, LessThan, GreaterThan
- `mux1.circom`, `mux2.circom`, `mux3.circom`: multiplexers
- `poseidon.circom`: Poseidon hash (multiple parameterizations)
- `mimc.circom`: MiMC hash
- `merkleproof.circom`: Merkle proof verification

ZK Visual's Circom code snippets should use circomlib components directly, not reimplement them, to match real-world practice.

---

## 4. ZK Bug Book

### What It Is

The **ZK Bug Book** (also known as the "ZK Bug Taxonomy") documents real-world bugs found in deployed ZK circuits. Maintained by 0xPARC and the ZK security community.

**URL**: `github.com/0xPARC/zk-bug-tracker`

### Bug Categories

| Category | What it means | Example |
|---|---|---|
| **Under-constrained** | A private signal is not fully constrained — the prover can set it to any value | `signal x; x <-- some_value;` with no `===` check |
| **Over-constrained** | Valid witnesses are rejected — the circuit is stricter than the specification requires | Range check that rejects valid values due to incorrect bit count |
| **Signal confusion** | A signal intended to be private is treated as public (or vice versa) | Forgetting to declare a signal as `public` when the protocol requires it |
| **Arithmetic errors** | Incorrect constraint encoding of the intended computation | Missing the reconstruction check in bit decomposition |
| **Trusted input assumption** | Circuit assumes an input is validated externally but it is not | Assuming a Merkle root is valid without verifying it is in a canonical set |

### Real-World Examples

The ZK Bug Book documents bugs found in production systems:
- **Tornado Cash**: an under-constrained circuit allowed a certain nullifier bypass
- **circomlib** issues: several historical bugs in library gadgets (now fixed)
- **Various DeFi protocols**: oracle manipulation via under-constrained proofs

### Why It Matters for ZK Visual

ZK Visual can teach not just the "happy path" (valid witness satisfies circuit) but also **what goes wrong**. A visualization of an under-constrained circuit — showing a private signal that the prover can set to any value — would be both educational and unique in the ZK learning landscape.

The constraint animation (`activeConstraints[]` / `satisfiedConstraints[]` in the `CircuitStep` model) can show a "cheating prover" scenario: animate a witness that violates the intended semantics but satisfies the (under-constrained) circuit.

---

## 5. Applied ZK Residency

### What It Is

0xPARC runs a **ZK Residency** program — an intensive multi-week program for researchers and builders to work on ZK applications in a collaborative setting. Residents have included teams building zkEVMs, ZK identity systems, ZK machine learning, and new cryptographic primitives.

### Output

Residency outputs include:
- Technical blog posts documenting novel ZK applications
- Open-source circuit implementations
- Research papers (some residents go on to publish academically)

### Relevance to ZK Visual

The Applied ZK Residency is the source of cutting-edge ZK application examples that can extend the content catalog in Phase 4 and beyond. Monitoring 0xPARC's residency outputs is a way to keep the catalog current as the ZK ecosystem evolves.

---

## 6. Relevance to ZK Visual

### Code Standard

The Circom code snippets in ZK Visual's catalog should:
1. Use `circomlib` components where available (not custom reimplementations)
2. Match 0xPARC's canonical gadget patterns for any custom circuits
3. Be validated against 0xPARC's workshop solutions

This ensures credibility and avoids teaching non-standard patterns that would confuse developers familiar with the 0xPARC curriculum.

### Content Alignment

| 0xPARC resource | ZK Visual catalog items |
|---|---|
| IsZero workshop problem | Catalog item 2.1 (building blocks) |
| Num2Bits + LessThan | Catalog items 2.2, 2.3 (bit decomposition, range check) |
| MerkleProof problem | Catalog item 4.x (Merkle proofs) |
| ZK Bug Book | "What can go wrong" companion visualizations |
| Residency outputs | Phase 4+ advanced catalog content |

### ZK Bug Visualizations

The ZK Bug Book opens a unique ZK Visual feature: **"broken circuit" visualizations**. A visualization that shows:
1. A correctly constrained circuit (normal animation)
2. The same circuit with one constraint removed (under-constrained)
3. A "cheating prover" animation — a witness that passes the under-constrained circuit but violates the intended semantics

This would be unique in the ZK educational space and directly informed by 0xPARC's bug taxonomy.

### See Also

- [PSE](./pse.md) — complementary ZK education team at the Ethereum Foundation
- [Gadgets](../zk/gadgets.md) — the gadget definitions that 0xPARC's curriculum teaches
- [R1CS and Witnesses](../zk/r1cs-and-witnesses.md) — the constraint model underlying Circom
