# Arithmetic Circuits

> ZK knowledge base — Block 1.
> Reference for how ZK arithmetic circuits are structured as DAGs and how to render them correctly for education.

---

## Table of Contents

1. [What is an Arithmetic Circuit](#1-what-is-an-arithmetic-circuit)
2. [Gate Types and Their Roles](#2-gate-types-and-their-roles)
3. [Wires as Field Elements](#3-wires-as-field-elements)
4. [DAG Layout Algorithms](#4-dag-layout-algorithms)
5. [Abstraction Levels](#5-abstraction-levels)
6. [Visualization Challenges](#6-visualization-challenges)
7. [Implications for ZK Visual](#7-implications-for-zk-visual)

---

## 1. What is an Arithmetic Circuit

An arithmetic circuit is a **directed acyclic graph (DAG)** where:

- **Nodes** are gates — elementary operations (addition, multiplication, constant injection)
- **Edges** are wires — carrying values from gate outputs to gate inputs
- **Sources** (in-degree 0) are input nodes — public inputs or private inputs (witnesses)
- **Sinks** (out-degree 0) are output nodes

All values are **field elements** over a prime field `Fp` for a specific large prime `p`. There are no bits, no integers, no floating point — only modular arithmetic.

### Distinction from Boolean Circuits

| Property | Boolean circuit | Arithmetic circuit |
|---|---|---|
| Wire values | Bits: {0, 1} | Field elements: Fp |
| Gate types | AND, OR, NOT, XOR | ADD, MUL, CONST |
| Native operations | Bitwise logic | Modular arithmetic |
| ZK usage | Older systems (JKatz, Fairplay) | All modern ZK systems |
| XOR cost | 1 gate | Requires bit decomposition (~k constraints) |
| Multiplication cost | De Morgan's Law required | 1 gate (1 constraint) |

Modern ZK systems (Groth16, PLONK, Halo2, STARKs) all use arithmetic circuits over prime fields. Boolean circuits appear only as sub-circuits when bit-level operations are needed (SHA-256, Keccak).

---

## 2. Gate Types and Their Roles

### Gate Reference Table

| Gate type | Symbol | Operation | Circom equivalent | Constraint cost |
|---|---|---|---|---|
| Addition gate | `+` | `a + b → c` | `c <== a + b` | 0 (linear, free) |
| Multiplication gate | `×` | `a × b → c` | `c <== a * b` | 1 |
| Constant gate | `k` | `k → c` | Literal value | 0 |
| Public input | `pub` | External value enters circuit | `signal input x` + `public [x]` | 0 |
| Private input | `priv` | Witness value enters circuit | `signal input x` | 0 |
| Output wire | `out` | Circuit output | `signal output y` | 0 |

### Cost Model

The key insight: only **multiplication gates** cost constraints. Addition is "free" in R1CS because it is absorbed into the linear combination structure of the constraint matrices.

This is why "degree" matters: a degree-2 expression (one multiplication) costs 1 constraint. A degree-3 expression requires an intermediate signal, adding a constraint. High-degree polynomials must be broken into multiplication steps.

### Gates in PLONK vs R1CS

PLONK's arithmetization introduces *custom gates* that can encode more complex operations in a single constraint row. A "UltraPlonk range gate" can check that a value is in range in a single row, where R1CS would require `k` rows (one per bit). This is why constraint counts are backend-dependent. See also: [Proving Systems](./proving-systems.md).

---

## 3. Wires as Field Elements

### What a Wire Carries

A wire in an arithmetic circuit carries a **field element** — an integer in the range `[0, p-1]` for a prime `p`. Common primes:

| Curve | Prime `p` | Bit length |
|---|---|---|
| BN254 (alt_bn128) | `21888242871839275222246405745257275088548364400416034343698204186575808495617` | 254 bits |
| BLS12-381 | `52435875175126190479447740508185965837690552500527637822603658699938581184513` | 255 bits |
| Pasta (Pallas) | `28948022309329048855892746252171976963363056475044522271086658059420757763045` | 255 bits |

### Visualization Implications

- Wire values cannot be shown as decimal numbers — they are enormous integers
- In diagrams, wire values are typically shown as:
  - Symbolic names: `a`, `b`, `c`
  - Small example values: `3`, `7`, `21` (using a pedagogically convenient small field)
  - Abbreviated: `0x1a3f...` (first/last bytes of the actual field element)
- ZK Visual should use **symbolic names** for gate-level diagrams and **small example values** for constraint checking animations

### Why "mod p" Matters

Subtraction wraps around: `3 - 5 = p - 2` in Fp, not `-2`. This is not an edge case — it is normal arithmetic. Visualizations of range checks and comparisons must handle wrap-around correctly or they will show misleading behavior.

---

## 4. DAG Layout Algorithms

### The Sugiyama Framework

The Sugiyama framework is the standard algorithm for rendering layered DAGs. It produces the left-to-right layered layout that is pedagogically correct for arithmetic circuits (inputs on the left, outputs on the right). The four phases:

#### Phase 1: Cycle Removal

Arithmetic circuits are acyclic by definition, so no cycles exist to remove. This phase is a no-op for valid ZK circuits. (If a cycle is detected, it indicates a Circom programming error.)

#### Phase 2: Layer Assignment

Assign each node to a layer (column) such that all edges point from lower to higher layer numbers. Algorithm: longest path from any input node. Inputs at layer 0, outputs at the maximum layer.

```
Layer:  0        1        2        3
        ┌──┐     ┌──┐     ┌──┐     ┌──┐
        │a │────▶│  │────▶│  │────▶│out│
        └──┘     │ + │     │ × │     └──┘
        ┌──┐  ──▶│  │     │  │
        │b │     └──┘  ──▶└──┘
        └──┘     ┌──┐
        ┌──┐  ──▶│  │
        │c │     │ × │
        └──┘     └──┘
```

#### Phase 3: Crossing Minimization

Permute nodes within each layer to minimize edge crossings. This is NP-hard in general; the standard heuristic is the *barycenter method*: sort nodes in each layer by the average position of their neighbors in adjacent layers. Multiple passes improve quality.

#### Phase 4: Coordinate Assignment

Assign `x` and `y` pixel coordinates to each node. Standard approach: uniform horizontal spacing between layers, uniform vertical spacing within each layer, with Brandes-Köpf assignment for compact layouts.

### Why Not Force-Directed Layout

Force-directed layout (spring-based algorithms like D3-force or Graphviz `neato`) is **rejected** for ZK circuit diagrams because:

1. **Non-deterministic**: same circuit renders differently on each run, breaking reproducibility
2. **No layer semantics**: inputs and outputs have no canonical positions; causality is not visible
3. **Poor for dense graphs**: ZK circuits are dense (many fan-out wires); force-directed layout produces spaghetti
4. **Not pedagogically correct**: the data-flow direction (left → right) is the core educational metaphor

The Sugiyama framework, despite being more complex to implement, produces layouts that communicate the computation flow clearly.

---

## 5. Abstraction Levels

ZK circuits span vastly different complexities. Three abstraction levels are defined:

### Level 1: Gate-Level

Every addition gate, multiplication gate, and wire is visible as a node/edge in the DAG.

- **Use when**: the circuit has ≤ 20 gates
- **Renderer**: full DAG with `CircuitDAGRenderer`
- **Example**: `IsZero` template (3 gates), `Square` (1 gate), `BooleanCheck` (1 gate)

### Level 2: Template-Level

Circom templates are rendered as black boxes with labeled input/output ports. Internal wires are hidden. The viewer sees the circuit's logical structure, not its gate-level implementation.

- **Use when**: the circuit has 20–100 gates, or when multiple templates compose
- **Renderer**: component box diagram with `TemplateBoxRenderer`
- **Example**: a Merkle proof (LessEqThan + MultiMux + Poseidon templates as black boxes)

### Level 3: Component / Pipeline

High-level phases are shown as stages in a pipeline. No individual gates or templates are visible — only the phase names and data flow between them.

- **Use when**: the circuit has 100+ gates, or when explaining a complete system
- **Renderer**: `PipelineVisualizer`
- **Example**: Poseidon full hash (shown as: Input → Key Schedule → Round Function × 8 → Output), Groth16 proof generation

### Abstraction Level Decision Table

| Gate count | Correct abstraction level | Renderer |
|---|---|---|
| < 20 | Gate-level | `CircuitDAGRenderer` |
| 20–100 | Template-level | `TemplateBoxRenderer` |
| 100–1,000 | Pipeline view | `PipelineVisualizer` |
| 1,000+ | Cost comparison only | `CostComparison` |

---

## 6. Visualization Challenges

### Fan-In

Multiple wires arriving at one gate (e.g., an addition gate summing 5 signals). In layered layouts, many edges arriving at one node from the same layer create visual clutter. Mitigation: route edges with orthogonal segments, use edge bundling for fan-in > 3.

### Fan-Out

One wire forking to multiple gate inputs. Common in ZK circuits — intermediate signals are often reused. Fan-out must be shown as a fork (not multiple separate edges from the source gate). In Sugiyama, fan-out edges are routed to a virtual "junction" node, then distributed.

### Sub-Circuit Reuse

A Circom template used multiple times (e.g., Poseidon called 20 times in a Merkle proof). Options:

1. **Instance nodes**: each use is a separate box; boxes are annotated with a shared template name
2. **Inlined expansion**: each instance fully expanded (creates very large diagrams — avoid for > 3 instances)
3. **Folded view**: show one instance with a "×20" badge (good for pipeline views)

ZK Visual uses option 1 (instance nodes) for template-level diagrams and option 3 (folded view) for pipeline views.

### Large Circuits

Scale ranges from trivial to very large:

| Circuit | Gate count (approx) |
|---|---|
| `IsZero` | 3 |
| `BooleanCheck` | 1 |
| `RangeCheck` (8-bit) | 9 |
| Poseidon (2 inputs) | 240 |
| Semaphore identity commitment | ~1,000 |
| SHA-256 | ~150,000 |
| zkEVM block proof | ~50,000,000 |

ZK Visual does not attempt to render circuits above 1,000 gates at gate-level. Large circuits use `PipelineVisualizer` or `CostComparison` only.

---

## 7. Implications for ZK Visual

### Renderer Selection

The abstraction level must be selected automatically based on circuit size, with manual override possible:

```
circuit.gateCount < 20    → CircuitDAGRenderer (gate-level)
circuit.gateCount < 100   → TemplateBoxRenderer (template-level)
circuit.gateCount >= 100  → PipelineVisualizer (pipeline)
```

### Layout Implementation

For `CircuitDAGRenderer`:
- Use Sugiyama framework (e.g., `@dagrejs/dagre` library implements this)
- Left-to-right orientation (`rankdir: 'LR'`)
- Inputs always in the leftmost layer, outputs in the rightmost
- Edge labels show signal names (symbolic, not raw field values)

For `TemplateBoxRenderer`:
- Template boxes have a fixed height per input/output port
- Ports are positioned uniformly on the left (inputs) and right (outputs) edges
- Wires between templates use orthogonal routing (not diagonal)

### What to Animate

- **Gate activation**: highlight gates as they are "evaluated" during execution
- **Wire values**: show the field element value flowing through a wire at the moment it is computed
- **Constraint checking**: for each multiplication gate, show the R1CS row check (see [R1CS and Witnesses](./r1cs-and-witnesses.md))

### See Also

- [R1CS and Witnesses](./r1cs-and-witnesses.md) — the formal constraint system that arithmetic circuits compile to
- [Gadgets](./gadgets.md) — reusable sub-circuits and their gate-level structure
- [Proving Systems](./proving-systems.md) — how circuits are used by different backends
