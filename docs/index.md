# ZK Visual — Documentation

> Research, strategy, and technical specification for a Zero Knowledge circuit
> visualization platform inspired by the alg0.dev model.

---

## Structure

```
docs/
├── index.md                       ← You are here
│
├── research/
│   ├── alg0dev.md                 ← Deep analysis of alg0.dev
│   └── competitive-landscape.md  ← Competing platforms + feature matrix
│
├── concept/
│   ├── vision.md                  ← Vision, mission, market opportunity
│   └── zk-visualization.md        ← The visualization challenge & approach
│
├── content/
│   └── catalog.md                 ← Full ZK content catalog
│
├── technical/
│   ├── architecture.md            ← Proposed stack and architecture
│   ├── step-encoding.md           ← How to write generateSteps() — the core guide
│   ├── dagre-layout.md            ← Dagre API integration and SVG coordinate mapping
│   ├── monaco-grammars.md         ← Monarch grammar specs for Circom and Noir
│   ├── witness-generation.md      ← Strategy for concrete witness data
│   ├── splitview-sync.md          ← Dual-renderer synchronization pattern
│   └── testing-correctness.md     ← Visualization accuracy testing strategy
│
├── roadmap/
│   └── roadmap.md                 ← Product phases and milestones
│
├── zk/                            ← ZK technical concept knowledge base
│   ├── arithmetic-circuits.md     ← DAG structure, gate types, layout algorithms
│   ├── r1cs-and-witnesses.md      ← R1CS formal definition, witness vectors
│   ├── gadgets.md                 ← Canonical gadgets with constraint counts
│   ├── proving-systems.md         ← Groth16, PLONK, Halo2, STARKs comparison
│   ├── hash-functions.md          ← SHA-256 vs Poseidon, ZK-friendly hashes
│   ├── folding-schemes.md         ← Nova, relaxed R1CS, IVC
│   ├── lookup-arguments.md        ← Plookup mechanism, sorted merge, for catalog item 6.1
│   ├── non-native-arithmetic.md   ← Field emulation, 36× cost, for catalog item 6.2
│   └── merkle-structures.md       ← Sparse and indexed Merkle trees for items 4.2 and 4.3
│
└── references/                    ← Sources, key people, and papers
    ├── papers.md                  ← Annotated bibliography (Groth16, PLONK, Poseidon, Nova)
    ├── vitalik-buterin.md         ← Vitalik's ZK posts indexed and annotated
    ├── pse.md                     ← Privacy & Scaling Explorations (Semaphore, halo2)
    ├── 0xparc.md                  ← 0xPARC curriculum and ZK Bug Book
    └── aztec.md                   ← Aztec (PLONK creators, Noir language)
```

---

## Quick Navigation

### Research
| Document | Description |
|---|---|
| [alg0.dev Analysis](./research/alg0dev.md) | Technical deep-dive into the reference platform: stack, architecture, patterns, and differentiators |
| [Competitive Landscape](./research/competitive-landscape.md) | Analysis of VisuAlgo, Algorithm Visualizer, NeetCode, Python Tutor and others — including comparative feature matrix |

### Concept
| Document | Description |
|---|---|
| [Vision & Market Opportunity](./concept/vision.md) | Why this platform should exist, who it serves, and why now is the right moment |
| [ZK Visualization Approach](./concept/zk-visualization.md) | The core challenge of visualizing abstract cryptographic concepts, what can and cannot be visualized, and the proposed approach |

### Content
| Document | Description |
|---|---|
| [ZK Content Catalog](./content/catalog.md) | Full catalog of ZK topics, circuits, and patterns to visualize — organized by category with priority and complexity ratings |

### Technical
| Document | Description |
|---|---|
| [Architecture](./technical/architecture.md) | Proposed tech stack, component model, circuit step pattern, and design system |

### Roadmap
| Document | Description |
|---|---|
| [Product Roadmap](./roadmap/roadmap.md) | Phased development plan from validation experiment to full platform |

### ZK Knowledge Base
| Document | Description |
|---|---|
| [Arithmetic Circuits](./zk/arithmetic-circuits.md) | DAG structure, gate types, wire semantics, layout algorithms, and abstraction levels for visualization |
| [R1CS and Witnesses](./zk/r1cs-and-witnesses.md) | Formal R1CS definition, witness vector structure, Circom-to-R1CS compilation, and the CircuitStep mapping |
| [Gadgets](./zk/gadgets.md) | Canonical gadget implementations with naive vs optimized constraint counts — bit decomposition, range check, MUX, comparison |
| [Proving Systems](./zk/proving-systems.md) | Technical comparison of Groth16, PLONK, Halo2, and STARKs — radar chart axis definitions and what cannot be fairly compared |
| [Hash Functions](./zk/hash-functions.md) | SHA-256 vs Poseidon constraint cost analysis, sponge construction, and Keccak in zkEVM context |
| [Folding Schemes](./zk/folding-schemes.md) | Nova, relaxed R1CS, IVC construction, the Nova ecosystem, and visualizability assessment for Phase 4 |
| [Lookup Arguments](./zk/lookup-arguments.md) | Plookup mechanism, sorted merge property, constraint cost comparison (16× reduction), and catalog item 6.1 visualization spec |
| [Non-Native Arithmetic](./zk/non-native-arithmetic.md) | Field emulation, the ~36× constraint overhead, limb decomposition, BabyJubJub design choice, and catalog item 6.2 spec |
| [Merkle Structures](./zk/merkle-structures.md) | Standard, sparse, and indexed Merkle tree variants with circuit structures and constraint costs for catalog items 4.2 and 4.3 |

### Implementation Guides
| Document | Description |
|---|---|
| [Step Encoding](./technical/step-encoding.md) | Complete guide to writing `generateSteps()` — the CircuitStep interface, renderer dispatch rules, graph state transitions, and four full worked examples |
| [Dagre Layout](./technical/dagre-layout.md) | Full `@dagrejs/dagre` integration: installation, graph configuration, node/edge registration, position extraction, and the `layoutCircuit()` function |
| [Monaco Grammars](./technical/monaco-grammars.md) | Complete Monarch grammar definitions for Circom and Noir, registration pattern, theme integration, and line highlighting for step synchronization |
| [Witness Generation](./technical/witness-generation.md) | Small-field convention for pedagogical witness values, the `signals` format, field arithmetic utilities, and Phase 4 live generation roadmap |
| [SplitView Sync](./technical/splitview-sync.md) | Dual-renderer synchronization: hold-last-frame vs phase-alignment strategies, the `SplitViewProps` interface, and constraint counter divergence |
| [Testing Correctness](./technical/testing-correctness.md) | Constraint count tests, R1CS satisfaction verification, visual snapshot tests, domain expert review protocol, and the ZK Bug mode test |

### References
| Document | Description |
|---|---|
| [Papers](./references/papers.md) | Annotated bibliography of five core ZK papers: Groth16, PLONK, Plookup, Poseidon, Nova |
| [Vitalik Buterin](./references/vitalik-buterin.md) | Curated index of Vitalik's ZK blog posts with catalog item mappings |
| [PSE](./references/pse.md) | Privacy & Scaling Explorations — Semaphore, halo2 book, and ZK educational resources |
| [0xPARC](./references/0xparc.md) | 0xPARC curriculum, canonical Circom gadgets, and the ZK Bug Book |
| [Aztec](./references/aztec.md) | PLONK creators, UltraPlonk custom gates, Noir language, and Barretenberg library |

---

## Project Summary

ZK Visual is a proposed interactive learning platform for Zero Knowledge circuit design and optimization. It adapts the visualization-first educational model pioneered by alg0.dev to the domain of ZK circuits — making constraint systems, gadget patterns, and proving system tradeoffs visually understandable.

**The core thesis:** the ZK developer ecosystem suffers from a severe educational gap. Existing resources are either too academic (papers, formal specifications) or too shallow (blog posts, introductory videos). An interactive, visual platform that teaches ZK circuit patterns the same way alg0.dev teaches algorithms would be uniquely positioned and have virtually no direct competition.

---

*Version 1.0 — March 2026*
