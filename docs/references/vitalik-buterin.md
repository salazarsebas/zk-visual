# Vitalik Buterin — ZK Writing Index

> References — key people.
> Curated index of Vitalik's posts directly relevant to ZK Visual content, with annotations on what each teaches and which catalog items it informs.

---

## Table of Contents

1. [About](#1-about)
2. [ZK Fundamentals Posts](#2-zk-fundamentals-posts)
3. [PLONK and Universal Setups](#3-plonk-and-universal-setups)
4. [STARKs Series](#4-starks-series)
5. [Privacy and Applications](#5-privacy-and-applications)
6. [How to Use These Resources](#6-how-to-use-these-resources)

---

## 1. About

**Vitalik Buterin** is the co-founder of Ethereum. Beyond protocol design, he maintains a blog at `vitalik.eth.limo` that contains some of the most accessible, technically precise explanations of ZK cryptography available anywhere.

His posts are:
- Written for software engineers, not mathematicians
- Precise enough to be technically credible
- Illustrated with concrete examples and worked calculations
- Updated as the field evolves

They are not academic papers — they do not prove theorems or establish formal security bounds. They explain *how* systems work and *why* design choices were made. For ZK Visual's purposes, they are the most directly useful external resource.

---

## 2. ZK Fundamentals Posts

### "Quadratic Arithmetic Programs: from Zero to Hero" (2016)

**URL**: `vitalik.eth.limo/general/2016/12/10/qap.html`

**What it teaches**: The full pipeline from a simple program → R1CS → QAP → Groth16 proof, worked out numerically with tiny example values. The most detailed walkthrough of Groth16's arithmetization that exists outside the original paper.

**Specific content**: Shows exactly how Circom-style constraints translate to R1CS matrices; shows the Lagrange interpolation step that converts R1CS to QAP; shows the polynomial evaluation step in the proof.

**Catalog items informed**: 5.2 (Groth16 pipeline deep-dive), 1.x (R1CS foundations)

**Note**: Written before Circom existed; uses Python pseudocode. The concepts transfer directly; the syntax differs from modern tooling.

---

### "zk-SNARKs: Under the Hood" (2017)

**URL**: `vitalik.eth.limo/general/2017/02/01/zk_snarks.html` (Part 1 of 3)

**What it teaches**: A three-part series that is the most cited ZK introduction for developers. Part 1: homomorphic encryption basics and how they enable verification without revealing the witness. Part 2: the KZG polynomial commitment scheme. Part 3: the full Groth16 construction.

**Catalog items informed**: 1.x (ZK fundamentals), 5.2 (Groth16), radar chart context

**Note**: The polynomial commitment sections (Part 2) are directly relevant to understanding how PLONK verification works, even though the series predates PLONK.

---

### "Why and How zk-SNARK Works" (link)

Vitalik's blog links to Maksym Petkus' 2019 explainer "Why and How zk-SNARK Works: Definitive Explanation" which provides the most rigorous elementary introduction to Groth16. Petkus' document is 47 pages and covers every step from scratch.

**Catalog items informed**: 1.x (foundational explainer for the ZK Visual team)

---

## 3. PLONK and Universal Setups

### "Understanding PLONK" (2019)

**URL**: `vitalik.eth.limo/general/2019/09/22/plonk.html`

**What it teaches**: A walkthrough of the PLONK paper (see [Papers](./papers.md#3-plonk)) at a developer-accessible level. Covers:
- The motivation for universal setups vs Groth16's circuit-specific setup
- Gate constraints and how they differ from R1CS
- The copy constraint / wiring argument (the permutation check)
- The KZG polynomial commitment and why it enables efficient proofs

This is the **recommended entry point before reading the PLONK paper** — read this post, then read PLONK Sections 5.1–5.3.

**Catalog items informed**: 5.3 (PLONK arithmetization deep-dive)

---

## 4. STARKs Series

### "STARKs, Part I: Proofs with Polynomials" (2017)

**URL**: `vitalik.eth.limo/general/2017/11/09/starks_part_1.html`

**What it teaches**: The core insight behind STARKs — any computation can be represented as a polynomial, and polynomial evaluations can be committed to and queried efficiently. Introduces the FRI (Fast Reed-Solomon IOP) protocol conceptually.

**Catalog items informed**: STARKs section of the proving systems comparison (catalog item 5.1)

---

### "STARKs, Part II: Thank Goodness It's FRI-day" (2017)

**URL**: `vitalik.eth.limo/general/2017/11/22/starks_part_2.html`

**What it teaches**: The FRI protocol — how to prove that a function is "close to" a low-degree polynomial using repeated halving and random queries. This is the core of STARK proof generation.

**Catalog items informed**: STARKs deep-dive (if added to Phase 4 content)

---

### "STARKs, Part III: Into the Weeds" (2018)

**URL**: `vitalik.eth.limo/general/2018/07/21/starks_part_3.html`

**What it teaches**: The implementation details — how the AIR (Algebraic Intermediate Representation) works, how the FRI queries are structured, and the concrete performance numbers.

**Catalog items informed**: STARKs implementation context; radar chart prover time estimates

---

## 5. Privacy and Applications

### "An Incomplete Guide to Stealth Addresses" (2023)

**URL**: `vitalik.eth.limo/general/2023/01/20/stealth.html`

**What it teaches**: How stealth addresses provide transaction privacy — a sender derives a one-time address from the recipient's public key; the recipient scans the chain to find transactions. Connects to ZK in the "check without revealing" pattern.

**Catalog items informed**: Phase 4 identity and privacy applications (catalog item 7.x)

---

### Ethereum Research Posts on Privacy Pools and ZKML

Vitalik has co-authored posts on `ethresear.ch` about privacy-preserving applications:
- **Privacy pools**: privacy mixers that can prove funds are not from sanctioned sources (using ZK set membership proofs)
- **ZKML**: zero-knowledge proofs of machine learning inference (proving a model was run correctly without revealing the model)

These are advanced Phase 4 topics. Relevant if catalog section 8 (ZKML) or 7 (privacy applications) is developed.

---

## 6. How to Use These Resources

### Reading Order for ZK Visual Team

For team members building catalog content, recommended reading order:

1. **"Understanding PLONK"** — start here if you want a modern, practical ZK intro
2. **"zk-SNARKs: Under the Hood" (Part 1–3)** — for the Groth16 pipeline deep-dive
3. **"Quadratic Arithmetic Programs: from Zero to Hero"** — for R1CS/QAP details
4. **"STARKs Part I"** — for the radar chart STARKs comparison

### Post-to-Catalog Mapping

| Post | Primary catalog items |
|---|---|
| "QAPs: from Zero to Hero" | 1.x (R1CS foundations), 5.2 (Groth16 pipeline) |
| "zk-SNARKs Under the Hood" (3 parts) | 1.x, 5.2 (Groth16) |
| "Understanding PLONK" | 5.3 (PLONK arithmetization) |
| "STARKs Part I" | 5.1 (radar chart), STARKs section |
| "STARKs Part II" | STARKs deep-dive |
| "Stealth Addresses" | 7.x (privacy applications) |

### Attribution Policy

When ZK Visual visualizations are directly informed by Vitalik's explanations, add a "Based on Vitalik Buterin's [post name]" credit in the visualization's source material reference. This is good academic practice and acknowledges the intellectual lineage.

### See Also

- [Papers](./papers.md) — academic papers for formal definitions
- [PSE](./pse.md) — Ethereum Foundation ZK tooling and education
- [Aztec](./aztec.md) — PLONK creators and Noir language
