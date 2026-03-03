# Privacy & Scaling Explorations (PSE)

> References — key teams.
> Reference for Privacy & Scaling Explorations, the Ethereum Foundation team working on ZK tooling — including Semaphore, the halo2 book, and ZK education resources.

---

## Table of Contents

1. [About PSE](#1-about-pse)
2. [Key People](#2-key-people)
3. [Semaphore](#3-semaphore)
4. [halo2 Book](#4-halo2-book)
5. [Other PSE Projects](#5-other-pse-projects)
6. [Educational Resources](#6-educational-resources)
7. [Relevance to ZK Visual](#7-relevance-to-zk-visual)

---

## 1. About PSE

**Privacy & Scaling Explorations** (PSE) is a research and engineering group within the **Ethereum Foundation**. It was previously known as "Applied ZKP" and before that "Ethereum Privacy and Scaling Research."

**Mission**: Build practical ZK applications, privacy protocols, and developer tooling for the Ethereum ecosystem.

**GitHub**: `github.com/privacy-scaling-explorations`

**Website**: `pse.dev`

PSE does not publish academic papers primarily — it ships working code, developer libraries, educational materials, and reference implementations of ZK protocols. It is the closest thing the ZK ecosystem has to an Ethereum-native "ZK standards body."

PSE's work is directly relevant to ZK Visual because:
1. PSE produces the canonical reference implementations of protocols the catalog covers (Semaphore, MACI)
2. PSE maintains the halo2 book — the most detailed explanation of PLONK-based proving
3. PSE team members are among the best ZK educators in the ecosystem

---

## 2. Key People

| Name | Role / Contribution | Relevance to ZK Visual |
|---|---|---|
| Barry Whitehat | Created Semaphore; pioneered anonymity mining on Ethereum | Semaphore is the canonical real-world ZK application in catalog item 7.2 |
| Chih-Cheng Liang | PSE engineering lead; MACI contributor | MACI (anti-collusion infrastructure) is catalog-relevant for voting applications |
| Enrico Bottazzi | Semaphore maintainer; ZK identity educator | His writing on ZK identity is directly usable as ZK Visual reference material |
| Andy Guzman | ZK developer and educator at PSE | His educational materials and circuit examples are directly relevant to the content catalog |

PSE is a team of ~20–30 engineers and researchers; the above are the most directly relevant to ZK Visual's content scope.

---

## 3. Semaphore

### What It Is

Semaphore is a ZK identity protocol built on Ethereum. It allows users to prove they are members of a group without revealing *which* member they are. It also allows members to signal a value (vote, statement, endorsement) with a nullifier that prevents double-signaling.

**GitHub**: `github.com/semaphore-protocol/semaphore`

**Documentation**: `semaphore.pse.dev`

### Core ZK Circuit

The Semaphore circuit proves two things simultaneously:

1. **Group membership**: the user knows a private key whose commitment (identity commitment) is included in a Merkle tree of all group members
2. **Nullifier integrity**: the user has correctly computed a nullifier `H(externalNullifier, identityNullifier)` that prevents reuse of the same signal

The circuit uses:
- **Poseidon hash** for the identity commitment and the Merkle tree (see [Hash Functions](../zk/hash-functions.md#4-poseidon))
- **Merkle proof verification** (~20 Poseidon hashes for a 20-level tree)
- **Nullifier computation** (one Poseidon hash)

Total: ~5,000–8,000 R1CS constraints depending on tree depth.

### Why It Matters for ZK Visual

Semaphore is the **canonical real-world ZK application** — the clearest example of why ZK matters (identity without surveillance). It maps to:

- **Catalog item 7.2** (Private Voting): Semaphore is the protocol underlying private voting on Ethereum
- **Catalog item 7.1** (ZK Identity): the identity commitment and Merkle membership proof

The Semaphore circuit demonstrates:
1. Poseidon hash usage in context
2. Merkle proof verification as a circuit
3. Nullifier pattern (prevent double-spending without revealing identity)

### Real-World Deployments

Semaphore is used in production by:
- Worldcoin (identity credential verification)
- Various DAO voting systems
- Tornado Cash (the nullifier pattern is derived from Semaphore's approach)

---

## 4. halo2 Book

### What It Is

The **halo2 book** is the official documentation for the Halo2 proving system, maintained by the Zcash/ECC team and referenced extensively by PSE's work.

**URL**: `zcash.github.io/halo2/`

### Why It Is Important

The halo2 book is the most detailed, technically precise explanation of the PLONK-based proving system with custom gates (UltraPlonk). It covers:

- **Arithmetization**: advice, instance, and fixed columns; how they differ from R1CS
- **Region layouting**: how constraints are organized into rectangular regions; the chip abstraction
- **Permutation argument**: the copy constraint mechanism (same content as the PLONK paper, but with concrete implementation detail)
- **Lookup argument**: Plookup integrated into Halo2; how to use lookup tables in circuits
- **Recursive proofs**: how accumulation works in Halo2 IVC

### How to Read It

The halo2 book is not a linear read — it is a reference. Recommended entry points:

1. **"Concepts"** section: explains advice/instance/fixed columns and the circuit model
2. **"Gadgets"** section: practical examples of Halo2 circuit programming
3. **"Design"** section: the permutation argument and lookup argument internals

**Before reading**: understand standard R1CS (see [R1CS and Witnesses](../zk/r1cs-and-witnesses.md)) and PLONK's gate/copy constraint model (see [Proving Systems](../zk/proving-systems.md#3-plonk)).

### Relevance to ZK Visual

The Halo2 deep-dive (catalog item 5.4) requires understanding the column layout model. The halo2 book is the authoritative source for this content. Specifically:
- The "advice/instance/fixed" column diagram comes from the halo2 book's concepts section
- The region layouting animation requires understanding Chapter 3 of the book

---

## 5. Other PSE Projects

| Project | What it is | Relevance |
|---|---|---|
| **MACI** | Minimal Anti-Collusion Infrastructure — ZK-based voting system where votes are encrypted and collusion-resistant | Catalog item 7.2 (voting); MACI is more sophisticated than basic Semaphore voting |
| **Unirep** | Reputation protocol — users accumulate reputation across applications without revealing their identity | Catalog item 7.x (identity); demonstrates the "anonymous reputation" ZK pattern |
| **Zkopru** | ZK optimistic rollup — combines ZK proofs and optimistic fraud proofs for privacy-preserving transactions | Advanced application example; too complex for early catalog phases |
| **zkEVM (PSE)** | Ethereum VM proof system — proves Ethereum block execution in ZK | Catalog section 8 (zkEVM); PSE's zkEVM (formerly "Scroll zkEVM") is one of the main implementations |
| **Anon Aadhaar** | Proves Aadhaar (India's biometric ID) credential in ZK | Identity verification use case example |

### PSE zkEVM

PSE's zkEVM (in collaboration with Scroll) is directly relevant to ZK Visual's catalog item on zkEVM. It:
- Uses Halo2 as the proving system
- Implements Keccak-256 in ZK (the expensive hash — see [Hash Functions](../zk/hash-functions.md#7-keccaksha-3-in-zk))
- Demonstrates the full-stack complexity of real-world ZK applications

---

## 6. Educational Resources

### ZK Learning Group

PSE has hosted ZK Learning Groups — structured programs for developers entering the ZK ecosystem. Materials include:
- Circom and SnarkJS tutorials
- R1CS construction by hand (pedagogically aligned with ZK Visual's approach)
- Circuit security analysis

### PSE Blog

**URL**: `mirror.xyz/privacy-scaling-explorations.eth`

Contains technical posts on ZK research, protocol updates, and educational content. Notable posts:
- Explainers on Semaphore's circuit design
- ZK bug analysis (under-constrained circuits)
- MACI design rationale

### Workshop Slides and Videos

PSE has presented at Devcon, ETHGlobal, and ZK Summit. Slide decks are publicly available on their GitHub and blog. The "Introduction to ZK" workshop materials are particularly aligned with ZK Visual's pedagogical goals.

---

## 7. Relevance to ZK Visual

### Resource-to-Catalog Mapping

| PSE resource | ZK Visual catalog items |
|---|---|
| Semaphore circuit | 7.1 (ZK identity), 7.2 (private voting) |
| halo2 book | 5.4 (Halo2 deep-dive), proving systems section |
| MACI | 7.2 (voting — advanced) |
| PSE zkEVM | 8.x (zkEVM) |
| ZK Learning Group materials | Content validation — check our gadget examples against PSE's canonical implementations |

### Code Alignment

Where ZK Visual shows Circom code for gadgets, cross-reference against PSE's published circuit examples. PSE's Semaphore circuit (`packages/circuits/semaphore.circom`) is the canonical production Circom implementation and should be used as the reference for:
- Poseidon usage in Circom
- Merkle proof verification pattern
- Nullifier computation pattern

### Andy Guzman's Materials

Andy Guzman (PSE) produces ZK educational content that is directly usable as ZK Visual reference material. His circuit examples and explainers should be reviewed when developing catalog content for identity and privacy applications (Phase 4).

### See Also

- [0xPARC](./0xparc.md) — complementary ZK education organization; focuses on Circom curriculum
- [Aztec](./aztec.md) — halo2 and PLONK creators
- [Hash Functions](../zk/hash-functions.md) — Poseidon, used extensively in PSE projects
- [Proving Systems](../zk/proving-systems.md#4-halo2) — Halo2, PSE's primary proving system
