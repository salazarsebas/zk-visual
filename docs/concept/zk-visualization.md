# ZK Visualization Approach

> The core challenge of making Zero Knowledge circuit design visually understandable.
> What can and cannot be visualized, how to draw the abstraction boundary correctly,
> and the proposed visualization model for each layer.

---

## Table of Contents

1. [The Core Challenge](#1-the-core-challenge)
2. [What Cannot Be Visualized (and Why)](#2-what-cannot-be-visualized-and-why)
3. [The Correct Abstraction Boundary](#3-the-correct-abstraction-boundary)
4. [What Can Be Visualized Well](#4-what-can-be-visualized-well)
5. [The Validation Experiment](#5-the-validation-experiment)
6. [Visual Grammar for ZK Circuits](#6-visual-grammar-for-zk-circuits)

---

## 1. The Core Challenge

The educational power of alg0.dev comes from a fundamental property: **the objects being visualized are intuitively understandable without prior explanation**.

- A sorted array looks different from an unsorted one — anyone can see it
- A visited graph node being colored — immediately readable
- Two elements swapping positions — universally understood

Zero Knowledge circuits do not share this property. Their central objects are mathematically abstract:

```
R1CS constraint:       (a · w) * (b · w) = (c · w)
Polynomial commitment: Com(f) = f(τ)·G  where τ is a secret
Field element:         a value in Fp — just a number mod a prime
Witness vector:        w = [1, x, y, z, ...]
Trusted setup:         τ ∈ Fp chosen secretly, then discarded
```

None of these have natural visual representations. Attempting to visualize them directly risks creating a different kind of problem: **false comprehension** — where a user believes they understand a concept because a diagram looked clear, but the diagram elided the part that actually matters.

This is not a cosmetic risk. ZK is a domain where misconceptions lead to insecure circuits. The platform must be visually accessible *and* technically honest.

### The Resolution

The solution is to **target the right layer of abstraction**. ZK has multiple layers:

```
Layer 5: Cryptographic primitives (pairings, polynomial commitments)  ← too abstract
Layer 4: Proof system protocols (Groth16, PLONK, Halo2, STARKs)      ← partially visualizable
Layer 3: Arithmetic circuit structure (gates, wires, constraints)      ← highly visual
Layer 2: Circuit design patterns (gadgets, lookups, decomposition)     ← highly visual
Layer 1: Efficiency tradeoffs (constraint cost comparisons)            ← highly visual
```

ZK Visual targets Layers 1–3 primarily, with selective treatment of Layer 4 (proving system comparisons as tradeoff charts, not protocol internals).

---

## 2. What Cannot Be Visualized (and Why)

These are the topics that should **not** be the core of ZK Visual visualizations, and why:

### Polynomial commitments
The cryptographic security of KZG commitments, FRI, or Pedersen commitments comes from discrete log hardness or hash function collision resistance. There is no visual representation of "this polynomial is hidden from the verifier" that isn't misleading. The ceremony (trusted setup) can be gestured at, but visualizing the mathematics would require already understanding elliptic curve groups.

**What to do instead:** A high-level pipeline diagram showing "commitment → proof → verification" as black boxes with annotations about what each box guarantees.

### Elliptic curve arithmetic
The group law on an elliptic curve can be drawn geometrically for the real-number case, but ZK curves operate over finite fields — the geometry breaks down completely. Showing an elliptic curve picture alongside Groth16 is actively misleading because the real-number picture doesn't apply.

**What to do instead:** Reference the cost of native vs non-native field arithmetic in terms of constraint count — the circuit-level consequence — not the mathematical definition.

### Soundness and zero-knowledge proofs
"Why is this proof zero-knowledge" and "why is this proof sound" are properties that require understanding the entire protocol — the simulator argument, the extractor argument. These cannot be made visual in a way that is both accurate and accessible.

**What to do instead:** State what the system guarantees as a labeled property and link to formal documentation. Do not attempt to "visualize" security arguments.

### Random oracle model / Fiat-Shamir
The transformation that makes interactive proofs non-interactive involves a hash function standing in for a random oracle. This is a protocol-level detail that doesn't translate to a circuit visualization.

---

## 3. The Correct Abstraction Boundary

ZK Visual should treat the proving system as a **black box with known interface costs**:

```
┌───────────────────────────────────────────────────────────┐
│                    THE ZK BLACK BOX                       │
│                                                           │
│  Input: Satisfied circuit + witness                       │
│  Output: Proof π                                          │
│                                                           │
│  Known properties (visualizable as charts):               │
│  • Proof size (bytes)                                     │
│  • Proving time (relative cost)                           │
│  • Verification time                                      │
│  • Trusted setup requirement (yes/no)                     │
│  • Recursion-friendliness                                 │
└───────────────────────────────────────────────────────────┘
         ▲
         │
What ZK Visual focuses on: what goes INTO this box
(circuit structure, constraint count, gadget patterns)
```

The circuit that goes into the black box is a **directed acyclic graph** — a fundamentally visual data structure that can be rendered, stepped through, and compared.

---

## 4. What Can Be Visualized Well

### Layer 3: Arithmetic Circuit Structure

An arithmetic circuit is a DAG of gates and wires over a finite field. Each gate is either an addition gate or a multiplication gate. This maps directly to standard graph visualization.

**Visualization model:**
- Gates rendered as labeled nodes (`+`, `×`, `const`)
- Wires rendered as directed edges carrying field values
- Input signals as source nodes, output as sink
- Witness values annotated on nodes at each step

```
Example: computing a² + b for inputs a=3, b=5

 [a=3] ──┬──→ [×] ──→ [+] ──→ [out=14]
          └──→       ↑
 [b=5] ──────────────┘
```

**Step animation:** highlight the active gate, show the value propagating through the wire, annotate intermediate values.

### Layer 2: Circuit Design Patterns (Gadgets)

Gadgets are reusable sub-circuits — the "functions" of circuit design. They are the primary pedagogical unit of ZK Visual.

Each gadget visualization shows:
1. The naive implementation (with constraint count)
2. The optimized implementation (with constraint count)
3. Why the optimized version works
4. Which proving systems benefit most from the optimization

See the [Content Catalog](../content/catalog.md) for the full list of gadgets.

### Layer 1: Efficiency Tradeoffs

The most immediately useful visualization type for practicing ZK developers.

**Constraint cost comparison:**
```
Range proof (naive):   ████████████████████████████████ 256 constraints
Range proof (bits):    ████████ 8 constraints

Keccak-256:            ██████████████████████████████████████████ ~150,000 constraints
Poseidon-128:          ████ ~240 constraints

Non-native mult:       ████████████████████████████████████ 36 constraints
Native mult:           █ 1 constraint
```

**Proving system comparison (radar chart):**
- Proof size
- Proving time
- Verification time
- Setup requirement
- Recursion support
- Post-quantum security

### Layer 4 (selective): Proof System Pipeline

Not the internals of each system, but the high-level flow as an interactive diagram that users can step through.

```
[Private Input]      [Public Input]
       │                    │
       ▼                    ▼
  [Witness] ──────→ [Circuit (R1CS / Plonkish)] ──→ [Satisfied?]
                                                           │
                                                     [Prover]
                                                           │
                                                     [Proof π]
                                                           │
                                              [Verifier + Public Input]
                                                           │
                                                    [✓ / ✗]
```

Each box is clickable with a tooltip explaining its role. This gives conceptual orientation without misleading formalism.

---

## 5. The Validation Experiment

Before building the full platform, one visualization must be built and tested:

**The experiment:** Range check — naive vs bit decomposition.

### Why this is the right validation target
- Self-contained: can be understood without knowing anything else about ZK
- Has a clear "before/after" that maps to a bar chart comparison
- The optimized version has a non-obvious insight (why bits work here)
- Tests whether constraint cost can be made visually intuitive

### The visualization

```
NAIVE RANGE CHECK: prove that x < 256

  For each value v in [0, 255]:
    x · (x - v) = 0   ← one constraint per value

  Constraints: ████████████████████████████████ 256
  Cost: linear in range size
  Scales badly: for x < 2^32, you'd need 4 billion constraints

─────────────────────────────────────────────────────────────

BIT DECOMPOSITION: prove that x < 256

  Decompose x into 8 bits: x = b₀ + 2b₁ + 4b₂ + ... + 128b₇
  For each bit bᵢ:
    bᵢ · (1 - bᵢ) = 0   ← proves bᵢ is 0 or 1
  Plus: b₀ + 2b₁ + ... + 128b₇ = x   ← proves reconstruction

  Constraints: ████████ 9 (8 bit constraints + 1 sum constraint)
  Cost: logarithmic in range size
  Scales well: for x < 2^32, only 33 constraints
```

### Success criteria

The validation experiment succeeds if:
1. **5 ZK professionals** confirm the visualization is technically accurate and not misleading
2. **5 developers with no ZK background** can explain the key insight (why bit decomposition uses fewer constraints) after watching the visualization, without any additional explanation

If both conditions are met, the abstraction layer is correct and the platform is worth building fully.
If condition 1 fails → the visualization is technically wrong and must be revised.
If condition 2 fails → the abstraction layer is too high or the visual grammar is wrong.

---

## 6. Visual Grammar for ZK Circuits

Just as alg0.dev defines 19 semantic color tokens that apply consistently across all algorithms, ZK Visual needs a consistent visual grammar for circuit elements.

### Proposed Color Tokens

| Token | Color | Applies To |
|---|---|---|
| `wire-inactive` | `#374151` (gray-700) | Wires not yet carrying a value |
| `wire-active` | `#60a5fa` (blue-400) | Wire currently propagating a value |
| `wire-satisfied` | `#34d399` (green-400) | Wire whose constraint is satisfied |
| `wire-violated` | `#f87171` (red-400) | Wire whose constraint is violated |
| `gate-add` | `#a78bfa` (violet-400) | Addition gate |
| `gate-mul` | `#f59e0b` (amber-400) | Multiplication gate |
| `gate-const` | `#6b7280` (gray-500) | Constant node |
| `gate-input` | `#38bdf8` (sky-400) | Public input node |
| `gate-private` | `#fb923c` (orange-400) | Private input / witness node |
| `gate-output` | `#fbbf24` (yellow-400) | Output node |
| `gate-active` | `#ffffff` (white) | Gate being evaluated in current step |
| `constraint-open` | `#374151` (gray-700) | Constraint not yet checked |
| `constraint-satisfied` | `#34d399` (green-400) | Constraint confirmed satisfied |
| `constraint-violated` | `#f87171` (red-400) | Constraint violated |
| `highlight-efficient` | `#34d399` (green-400) | Efficient pattern (in comparisons) |
| `highlight-costly` | `#f87171` (red-400) | Costly pattern (in comparisons) |
| `highlight-neutral` | `#60a5fa` (blue-400) | Neutral reference |

### Node Shapes
- **Circle:** arithmetic gate (add / mul)
- **Square:** constant value
- **Diamond:** decision / conditional
- **Rounded rect:** input signal (public or private, differentiated by color)
- **Double circle:** output / constraint check point

### Annotations
- Value labels on edges when a step is active: `wire → 9`
- Constraint count badge on gadget headers: `9 constraints`
- Cost delta when showing before/after: `−247 constraints (96.5% reduction)`

---

*See also: [Vision & Market Opportunity](./vision.md) · [Content Catalog](../content/catalog.md) · [Architecture](../technical/architecture.md)*
