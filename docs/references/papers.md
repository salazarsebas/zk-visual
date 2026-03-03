# Annotated Bibliography — Core ZK Papers

> References — academic papers.
> Annotated bibliography of the five core academic papers underlying the ZK Visual content catalog.

---

## Table of Contents

1. [How to Use This Document](#1-how-to-use-this-document)
2. [Groth16](#2-groth16)
3. [PLONK](#3-plonk)
4. [Plookup](#4-plookup)
5. [Poseidon](#5-poseidon)
6. [Nova](#6-nova)

---

## 1. How to Use This Document

Papers are listed in **reading-difficulty order**, not publication date. The first entries have the most accessible introductions; the last assume more background.

For each paper:
- **Citation**: author, venue, year, ePrint ID where available
- **Abstract (plain English)**: what the paper proves or constructs, in non-technical terms
- **Why it matters for ZK Visual**: which catalog items it informs and what it enables
- **Recommended reading approach**: how to get value from the paper without reading every section

Companion resources (blog posts, videos) are listed where they substantially ease the reading.

---

## 2. Groth16

### Citation

Jens Groth. "On the Size of Pairing-Based Non-interactive Arguments." *EUROCRYPT 2016*. ePrint: 2016/260.

### Abstract (plain English)

Groth16 constructs a non-interactive zero-knowledge proof system with the smallest known proof size: just three elliptic curve points (~192 bytes). The verifier checks the proof with three pairing operations, making verification extremely fast. The tradeoff: a trusted setup ceremony is required for each specific circuit.

The paper proves that 3 group elements is optimal — no SNARK with a universal trusted setup can have smaller proofs. This optimality result is one reason Groth16 remains in use despite newer systems.

### Why It Matters for ZK Visual

- **Catalog items 1.x** (ZK foundations): Groth16 is the canonical example of a SNARK — small proof, fast verification, trusted setup
- **Catalog item 5.2** (Groth16 pipeline deep-dive): the pipeline from R1CS → QAP → proof is Groth16's construction
- **Radar chart** (catalog item 5.1): Groth16 defines the "best proof size" and "best verification time" anchor points

### Recommended Reading Approach

1. Read the **introduction** (pages 1–3) for motivation and the result statement
2. Read **Section 3** (the SNARK construction) — this is the core protocol
3. Skip the security proofs on first reading (Sections 4–5)
4. Companion: Vitalik's "zk-SNARKs: Under the Hood" blog series is a more accessible walkthrough of the same ideas

---

## 3. PLONK

### Citation

Ariel Gabizon, Zachary J. Williamson, Oana Ciobotaru. "PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge." ePrint: 2019/953. (Unpublished; ePrint only.) Created at Aztec Network.

### Abstract (plain English)

PLONK constructs a universal SNARK — one where a single trusted setup can be used for *all* circuits up to a maximum size. Previous SNARKs (Groth16) required a new trusted ceremony per circuit. PLONK achieves this by replacing the QAP arithmetization with a new approach: "gate constraints" (polynomial identities at each row) combined with a "copy constraint" argument (a permutation argument proving wires are correctly connected).

The permutation argument is the paper's central contribution: it proves that a set of wire values at different gates are consistent using a product argument over polynomial evaluations at Lagrange basis points.

### Why It Matters for ZK Visual

- **Catalog item 5.3** (PLONK arithmetization): the gate + copy constraint structure is the core of this visualization
- **Radar chart**: PLONK's "universal setup" axis and proof size anchor
- **Aztec and UltraPlonk** context: PLONK is the foundation of Aztec's entire proving stack

### Recommended Reading Approach

1. Read the **introduction** (pages 1–4) for the universal setup motivation
2. Read **Section 5** (the core PLONK protocol) — this is where the gate/copy constraints are defined
3. **Do not** start with Section 2 (preliminaries) — it is dense notation; return to it as needed
4. **Companion**: Vitalik's "Understanding PLONK" blog post is the single best entry point. Read it *before* the paper.
5. After Vitalik's post: read the paper's Section 5.1–5.3 (gate constraints, copy constraints, the permutation check)

---

## 4. Plookup

### Citation

Ariel Gabizon, Zachary J. Williamson. "plookup: A simplified polynomial protocol for lookup tables." ePrint: 2020/315. Aztec Network.

### Abstract (plain English)

Plookup constructs a polynomial protocol for proving that a vector of values is a *subset* of a pre-committed lookup table. This enables "lookup arguments" in ZK circuits: the prover can prove that a value is in range, or that a function evaluation is correct, by looking it up in a table rather than computing it constraint-by-constraint.

The core technique: sort both the witness values and the table values, then prove they are related via a product argument. The product argument proves that the sorted merged vector is a valid interleaving of the two sorted inputs.

### Why It Matters for ZK Visual

- **Catalog item 6.1** (Lookup Arguments): plookup is the mechanism; the visualization shows how a range check becomes one lookup instead of `k` boolean constraints
- **Proving systems context**: explains why Halo2 (which includes Plookup) can reduce range check costs dramatically vs plain PLONK

### Recommended Reading Approach

1. Read the **introduction** for the problem statement: "range checks cost `k` constraints; plookup costs 1"
2. Read **Section 2** (the simplified protocol) — this is the core contribution
3. The security proof (Sections 3–4) can be skipped on first reading
4. **Context**: understand [PLONK](#3-plonk) first; Plookup is an extension to PLONK

---

## 5. Poseidon

### Citation

Lorenzo Grassi, Dmitry Khovratovich, Christian Rechberger, Arnab Roy, Markus Schofnegger. "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems." *USENIX Security Symposium 2021*. ePrint: 2019/458.

### Abstract (plain English)

Poseidon is a hash function designed specifically for use in ZK circuits. Standard hash functions (SHA-256, Keccak) require ~150,000 R1CS constraints per hash because they are built on bitwise operations (XOR, AND) that are expensive to represent in field arithmetic. Poseidon avoids this by using only field operations: its S-box is `x^5` (a field multiplication), and its mixing layer is a matrix multiplication over the field.

The paper defines Poseidon's structure (sponge construction, round function), proves its security against algebraic attacks, and provides parameters for different security levels and field sizes.

### Why It Matters for ZK Visual

- **Catalog item 3.1** (hash function cost comparison): provides the ~240 constraint count for Poseidon that anchors the bar chart
- **Catalog item 3.2** (Poseidon sponge animation): the round structure (ARC + SubWords + MDS) maps directly to the pipeline visualization
- **Catalog item 3.3** (Poseidon permutation): the inner permutation is the circuit being visualized gate-by-gate

### Recommended Reading Approach

1. Read the **introduction** (pages 1–3): motivation for ZK-friendly hashes and the cost comparison
2. Read **Section 2** (the Poseidon construction): the sponge structure, round types (full vs partial), and the S-box
3. Read **Section 3.1** (parameter selection): how to choose the number of rounds for 128-bit security
4. Skip the algebraic attack analysis (Sections 4–6) unless you need to verify the security margins
5. **Table 3** in the paper gives constraint counts for various parameterizations — use these for the CostComparison visualization

---

## 6. Nova

### Citation

Abhiram Kothapalli, Srinath Setty, Ioanna Tzialla. "Nova: Recursive Zero-Knowledge Arguments from Folding Schemes." *CRYPTO 2022*. ePrint: 2021/370. Microsoft Research.

### Abstract (plain English)

Nova introduces a new approach to recursive SNARK composition: instead of verifying a proof inside a circuit, it *folds* two R1CS instances into one using a random linear combination. The folded instance is a "relaxed R1CS" instance — a generalization of standard R1CS that admits an error term. Folding is cheap (linear algebra only, no pairings), making it practical as a per-step operation in Incrementally Verifiable Computation (IVC).

With Nova, a prover can accumulate n steps of a computation into a single relaxed R1CS instance and then compress it with one SNARK, producing a constant-size proof of the entire n-step computation.

### Why It Matters for ZK Visual

- **Catalog item 6.5** (Folding Schemes): Nova is the primary subject; the visualization explains IVC and the folding metaphor
- **Scope definition**: this paper defines the limits of Phase 4 Nova content — the relaxed R1CS structure, what can and cannot be animated, and the IVC chain concept

### Recommended Reading Approach

1. Read the **introduction** (pages 1–5): the IVC problem, existing approaches, and Nova's key innovation
2. Read **Section 2** (the folding scheme for relaxed R1CS): the formal definition of relaxed R1CS and the fold operation
3. Read **Section 3** (the IVC construction): how the folding scheme enables IVC
4. Skip the security proofs on first reading (Sections 4–5)
5. **Companion**: the `microsoft/Nova` GitHub repository has working code and a cleaner explanation in its README
6. See also: [Folding Schemes](../zk/folding-schemes.md) — this doc summarizes the paper's content at a level appropriate for ZK Visual
