# Lookup Arguments

> ZK Visual knowledge base — lookup arguments (Plookup), the sorted merge mechanism,
> and constraint cost comparison for catalog item 6.1.

---

## Table of Contents

1. [The Problem Lookup Arguments Solve](#1-the-problem-lookup-arguments-solve)
2. [What a Lookup Table Is](#2-what-a-lookup-table-is)
3. [Plookup: The Mechanism](#3-plookup-the-mechanism)
4. [Constraint Cost](#4-constraint-cost)
5. [Plookup in UltraPlonk and Halo2](#5-plookup-in-ultraplonk-and-halo2)
6. [LogUp (Brief Note)](#6-logup-brief-note)
7. [The Visual Metaphor: Sorted Merge](#7-the-visual-metaphor-sorted-merge)
8. [Catalog Item 6.1 Visualization Spec](#8-catalog-item-61-visualization-spec)
9. [Implications for ZK Visual](#9-implications-for-zk-visual)

---

## 1. The Problem Lookup Arguments Solve

Range checks are one of the most common operations in ZK circuits. Any circuit that handles integers, comparisons, bit manipulation, or overflow detection needs to prove that a value lies within an allowed range — for example, "this value is between 0 and 255."

The naive approach uses **bit decomposition**: prove that the value `n` can be written as a sum of weighted bits `b₀ + 2·b₁ + 4·b₂ + ... + 2^(k-1)·b_{k-1}`. Each bit `bᵢ` requires a boolean constraint `bᵢ·(1 - bᵢ) = 0`, which is one multiplication constraint. A k-bit range check therefore costs **k multiplication constraints**.

| Range | Bits (k) | Constraint count (bit decomposition) |
|---|---|---|
| 0–255 | 8 | 8 constraints |
| 0–65535 | 16 | 16 constraints |
| 0–4294967295 | 32 | 32 constraints |
| 0–(2^64 - 1) | 64 | 64 constraints |

When range checks appear throughout a circuit — inside hash functions, comparison gadgets, overflow checks, and field arithmetic — this cost compounds significantly. A circuit with 100 16-bit range checks spends 1,600 constraints just on range validation.

**Lookup arguments replace any range check with a single row, regardless of k.** They are also more general: any constraint of the form "this value is one of these allowed values" can be checked with a single lookup, including XOR tables, AND tables, and more complex multi-column tables.

---

## 2. What a Lookup Table Is

A lookup table is a **pre-committed vector of allowed values**. It occupies **fixed columns** in the circuit's constraint system — the same mechanism as selector polynomials in PLONK. The table is part of the circuit's setup, not the witness.

For an 8-bit range check:
- The table `t` contains `[0, 1, 2, ..., 255]` — 256 entries.
- The prover claims: "my value `f` is in this table."
- The lookup argument verifies this claim without revealing **which table position** was matched.

The table values are committed to as part of the circuit's proving key (during the trusted setup or circuit compilation). The commitment is amortized across all uses of that table — if a circuit performs 500 range checks against the same 8-bit table, the table is committed once and used 500 times.

Multi-column tables are also possible. An XOR table might have columns for `(a, b, a XOR b)` with one row per pair. The lookup argument verifies that the triple `(witness_a, witness_b, witness_c)` appears as a row in the table — proving `witness_a XOR witness_b = witness_c` in one lookup.

---

## 3. Plookup: The Mechanism

Plookup (Gabizon and Williamson, 2020) proves that a set of values `f` is a subset of a table `t` using a **sorted merge** argument.

### The Core Idea

Define three vectors:
- `f` — the witness values to check (unordered; may contain duplicates)
- `t` — the table of allowed values (ordered, no duplicates)
- `s` — the **sorted merge** of `f` and `t` (all values from both, sorted together)

The key property of the sorted merge: **if `f ⊆ t`, then consecutive equal values in `s` are always adjacent** — no equal value is "split" by a different value. Conversely, if any `f` value is not in `t`, the sorted merge will contain a value that does not appear in `t`, breaking the adjacency property.

### Visual: The Sorted Merge

```
f = [6, 2, 6, 1]          (values to check; in any order)
t = [0, 1, 2, 3, 4, 5, 6] (the allowed table; 7-value table for range 0–6)

s = sorted merge of f and t:
  [0, 1, 1, 2, 2, 3, 4, 5, 6, 6, 6]
       ^     ^            ^    ^^^
       |     |            |    consecutive 6s (f contains 6 twice, t once → three 6s total)
       |     consecutive 2s (f contains 2 once, t once → two 2s total)
       consecutive 1s

Property: every value from f appears in s adjacent to its matching t-entry.
No "orphan" f-value (one not in t) can satisfy this — it would appear between two different t-values.
```

### The Product Argument

Plookup encodes the adjacency property as a **product check** over the sorted merge. The protocol constructs a rational function whose product is 1 if and only if the adjacency property holds. This is verified as a polynomial identity — the same technique used for PLONK's copy constraints.

The complete protocol:
1. Prover commits to `f`, `t`, and `s`.
2. Verifier sends a random challenge `β, γ`.
3. Prover computes and commits to a grand product polynomial `Z(X)` encoding the ratio of adjacent elements in `s` versus `f` and `t`.
4. Verifier checks the product relation holds at all positions via a polynomial opening.

The entire argument requires O(n) prover work where n = |f| + |t|.

---

## 4. Constraint Cost

| Method | Range | Constraint count | Notes |
|---|---|---|---|
| Bit decomposition | k-bit | k | One bool constraint per bit |
| Plookup | k-bit | 1 row | Plus amortized table commitment |
| Plookup | XOR (8-bit) | 1 row | Uses 256×3 table (a, b, a⊕b) |
| Plookup | AND (8-bit) | 1 row | Uses 256×3 table (a, b, a∧b) |

**Concrete comparison for a 16-bit range check:**

| | Constraint count |
|---|---|
| Bit decomposition | 16 constraints |
| Plookup | 1 row |

**Reduction factor: 16×**

The amortized cost of the table commitment is circuit-independent and shared across all lookups using that table. For a circuit with 500 16-bit range checks:
- Bit decomposition: 500 × 16 = 8,000 constraints
- Plookup: 500 × 1 = 500 rows + 1 table commitment (65,536 entries committed once)

For circuits with many lookups into the same table, Plookup's advantage is multiplicative. For a single lookup (e.g., a small circuit with one range check), the overhead of committing the table may make Plookup less efficient than bit decomposition.

---

## 5. Plookup in UltraPlonk and Halo2

### UltraPlonk

Plookup is integrated into UltraPlonk (Aztec's extended PLONK variant) as a **lookup gate** — a fourth gate type alongside addition, multiplication, and copy gates. In UltraPlonk:

- The table is stored in fixed columns committed once per circuit.
- Multiple different lookup tables can coexist in the same circuit (one table for range checks, another for XOR, another for a custom function).
- The lookup gate type is specified in the selector polynomial — `q_lookup = 1` for rows using a lookup.
- The sorted merge `s` is computed by the prover during witness generation.

**Important limitation:** lookup gates are **not available in standard R1CS** (e.g., Groth16 without custom gates). They require PLONKish arithmetization — a table-based constraint system. A Circom circuit compiled for Groth16 cannot use lookup tables; the Groth16 backend uses pure R1CS.

### Halo2

Halo2 integrates Plookup natively as the `lookup` method in its constraint API. Using a lookup in Halo2:

```rust
// In a Halo2 chip implementation:
meta.lookup("range check", |meta| {
    let value = meta.query_advice(value_column, Rotation::cur());
    let table_value = meta.query_fixed(range_table, Rotation::cur());
    vec![(value, table_value)]
});
```

The `lookup` call registers the constraint that `value` must appear in `range_table`. Halo2's backend generates the Plookup proof components automatically.

---

## 6. LogUp (Brief Note)

LogUp is a more efficient lookup argument based on **logarithmic derivatives** (Haböck, 2022). It uses a sum of rational functions rather than a product argument, which gives better performance for very large tables (O(n log n) prover time vs O(n²) for naive approaches).

LogUp is used in some STARKs-based systems, notably Plonky2 and FRI-based backends. For ZK Visual's pedagogical content:

- **Plookup is the correct primary explanation** — it is the original, conceptually clearest formulation and is what most PLONKish implementations use.
- **LogUp is noted as a newer alternative in STARKs contexts** — its efficiency advantage matters for very large lookup tables (millions of entries) that appear in zkEVM-scale circuits.

For catalog item 6.1, Plookup is the subject of the visualization.

---

## 7. The Visual Metaphor: Sorted Merge

### What Can Be Visualized

The sorted merge concept has a clear spatial interpretation:

1. **The unsorted `f` vector** — the witness values arriving in arbitrary order (show as a disordered row of labeled boxes)
2. **The table `t`** — the allowed values in sorted order (show as a vertical list with a border)
3. **The sorted merge `s`** — the combined sequence sorted (show as a row where equal values cluster together with arrows connecting them to their table entry)
4. **The adjacency property** — highlight that every `f`-value appears adjacent to its `t`-match in `s` (color the f-value boxes distinctly from t-value boxes in `s`)

Animation arc for catalog item 6.1:
- Step 1: Show an unsorted `f` = [6, 2, 6, 1] and a table `t` = [0..6]
- Step 2: Merge and sort → produce `s`
- Step 3: Highlight the clustering — circles of the same value appear together
- Step 4: Explain: "If any `f` value is NOT in `t`, it cannot cluster — it breaks the adjacency"
- Step 5: Show a "lookup passes" animation: value 6 finds its match in `t` and joins the cluster
- Step 6: Show the failed case: value 9 cannot find a match; it appears isolated in `s`

### What Cannot Be Visualized

The **product argument over polynomial evaluations** is purely algebraic. There is no intuitive spatial metaphor for:
- The grand product polynomial `Z(X)` accumulating the ratio
- The polynomial identity check at a random challenge point
- The polynomial commitment opening proof

These are rendered in ZK Visual as a "abstract algebraic layer" notation — a mathematical formula block with a tooltip explaining "the rest is cryptographic bookkeeping" — rather than an animation. See [ZK Visualization Approach](../concept/zk-visualization.md) for the general policy on non-visualizable steps.

---

## 8. Catalog Item 6.1 Visualization Spec

**Title:** "Lookup Arguments: 1 Constraint vs 16"

### CostComparison Renderer Data

```typescript
const rangeCheckComparison: ComparisonState = {
  label: "16-bit Range Check",
  left: {
    label: "Bit Decomposition",
    constraintCount: 16,
    description: "One boolean constraint per bit: bᵢ·(1−bᵢ) = 0",
    color: "highlightCostly",
  },
  right: {
    label: "Plookup",
    constraintCount: 1,
    description: "One row: value ∈ table[0..65535]",
    color: "highlightEfficient",
  },
};
```

### SplitView Configuration

- **Left panel:** 16-gate boolean check circuit — 16 constraint gates forming a column, each labeled `bᵢ·(1−bᵢ)=0`, one per bit of the 16-bit value
- **Right panel:** A single lookup gate connected to a fixed table (rendered as a scrollable list showing the first and last few values with ellipsis in the middle)

### Description Arc

1. **State the problem:** "Prove that `n` is between 0 and 65535 without revealing which value in that range."
2. **Show naive cost:** 16 boolean constraints, one per bit — the left panel activates each gate in sequence
3. **Reveal the lookup table concept:** "Instead: pre-commit a table of all 65,536 allowed values"
4. **Show the 1-row result:** The right panel shows a single gate executing — total constraints: 1
5. **Demonstrate the sorted merge:** The table panel expands to show the sorted merge diagram from §7, animating where the witness value finds its cluster

---

## 9. Implications for ZK Visual

**Renderer requirements for catalog item 6.1:**

- `CostComparison` — already planned; drives the 16-vs-1 bar chart
- `SplitView` — already planned; shows the two circuit structures simultaneously
- **New element required:** A scrollable SVG table with row highlighting for the lookup table visualization

**Recommended new component: `LookupTablePanel`**

```
┌──────────────────┐
│ Range Table      │
│ ──────────────── │
│  0               │
│  1               │
│  2               │
│  ...             │
│ ► 6  ◄ matched  │
│  ...             │
│  255             │
└──────────────────┘
```

Implement as an SVG foreignObject containing a scrollable div, or as a clipped SVG group with a clip path for overflow. The highlighted row scrolls into view when the animation reaches the lookup step. This component is reusable for any catalog item involving tables (XOR tables, custom lookup tables).

**Cross-links:**
- Catalog: [catalog.md — item 6.1](../content/catalog.md)
- References: [Plookup paper](../references/papers.md) (Gabizon and Williamson, 2020)
- Proving systems context: [proving-systems.md — UltraPlonk](./proving-systems.md)
- Visualization spec: [step-encoding.md](../technical/step-encoding.md)
