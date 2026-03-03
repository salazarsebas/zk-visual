# Proving Systems

> ZK knowledge base — Block 4.
> Technical reference for the four proving systems covered in the catalog — what makes each different, and what is actually comparable across them.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Groth16](#2-groth16)
3. [PLONK](#3-plonk)
4. [Halo2](#4-halo2)
5. [STARKs](#5-starks)
6. [The Radar Chart Axes — Defined Precisely](#6-the-radar-chart-axes--defined-precisely)
7. [What Cannot Be Fairly Compared](#7-what-cannot-be-fairly-compared)
8. [Arithmetic vs Boolean Fields](#8-arithmetic-vs-boolean-fields)
9. [Implications for ZK Visual](#9-implications-for-zk-visual)

---

## 1. Overview

Four proving systems are covered in the ZK Visual content catalog:

| System | Year | Arithmetization | Trusted Setup | Proof Size |
|---|---|---|---|---|
| Groth16 | 2016 | R1CS → QAP | Circuit-specific | ~192 bytes |
| PLONK | 2019 | Gate + copy constraints | Universal | ~500 bytes |
| Halo2 | 2020 | PLONK-based (UltraPlonk) | None (IPA) | ~1–2 KB |
| STARKs | 2018 | AIR (polynomials) | None (transparent) | 10–100 KB |

These systems coexist because they represent different tradeoffs — no single system is optimal across all dimensions. The right choice depends on the use case: deployments requiring smallest on-chain proof sizes use Groth16; systems requiring no trusted setup and post-quantum security use STARKs; applications needing efficient recursion use Halo2.

---

## 2. Groth16

### Source

"On the Size of Pairing-Based Non-interactive Arguments" — Jens Groth, EUROCRYPT 2016. See also: [Papers reference](../references/papers.md#2-groth16).

### Input

R1CS instance (matrices A, B, C) + witness vector z.

### Arithmetization: R1CS to QAP

Groth16 converts the R1CS system to a **Quadratic Arithmetic Program (QAP)** via Lagrange interpolation:

1. Embed each column of A, B, C into a polynomial of degree `m-1` (where `m` = number of constraints)
2. Evaluate these polynomials at a hidden challenge point (the structured reference string, or SRS)
3. The proof is valid iff a specific polynomial divisibility condition holds

The QAP transformation allows the verifier to check all `m` constraints with a constant number of operations (3 pairings).

### Trusted Setup

Groth16 requires a **circuit-specific trusted setup** — a structured reference string (SRS) generated for one specific circuit (one specific A, B, C). If the circuit changes, the setup must be repeated. The setup ceremony involves "toxic waste" that must be destroyed — if any participant keeps the randomness, they can forge proofs.

Notable setups: Groth16 for Zcash (the "Powers of Tau" ceremony, 2017), Tornado Cash's setup.

### Proof Structure

A Groth16 proof consists of **three elliptic curve points**: `(A, B, C)`:
- `A` ∈ G₁ (one group element, ~32 bytes for BN254)
- `B` ∈ G₂ (one group element, ~64 bytes for BN254)
- `C` ∈ G₁ (~32 bytes)

Total: **~192 bytes** — the smallest proof size among all major proving systems.

### Verification

Verification requires **3 pairing operations**:

```
e(A, B) = e(α, β) · e(L, γ) · e(C, δ)
```

where `α, β, γ, δ` are SRS parameters and `L` is a linear combination of public inputs. Pairing operations take ~1–2 ms on modern hardware. Verification is **O(public_inputs)** linear in the number of public inputs, but effectively constant for small public input counts.

On-chain verification (e.g., Ethereum): ~200,000–300,000 gas per Groth16 verify, making it practical for rollup verification.

### Prover Time

O(n log n) with FFT, where n = number of constraints. The dominant cost is multi-scalar multiplication (MSM) over the elliptic curve group. Prover must hold all n constraints in memory.

---

## 3. PLONK

### Source

"PLONK: Permutations over Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge" — Gabizon, Williamson, Ciobotaru, ePrint 2019/953. Created by Aztec. See also: [Aztec reference](../references/aztec.md) and [Papers reference](../references/papers.md#3-plonk).

### Arithmetization: Gate + Copy Constraints

PLONK's arithmetization consists of two types of constraints:

1. **Gate constraints**: for each row `i`, a polynomial identity:
   ```
   qL·a + qR·b + qO·c + qM·(a·b) + qC = 0
   ```
   where `a, b, c` are the left/right/output signals of gate `i`, and `qL, qR, qO, qM, qC` are selector polynomials (fixed by the circuit).

2. **Copy constraints (wiring)**: a permutation argument proving that certain wires carry the same value across different gates. For example, if the output of gate 3 is the left input of gate 7, the copy constraint enforces `wire_out[3] = wire_left[7]`.

The permutation argument is PLONK's key innovation: it proves that a set of values is a permutation of another set using a product argument over polynomial evaluations.

### Universal Trusted Setup

PLONK requires only a **universal structured reference string (SRS)** — one SRS can be used for any circuit of size up to `N`. No circuit-specific setup is needed. This dramatically reduces deployment friction: the universal "Powers of Tau" ceremony (run once) serves all circuits.

### Custom Gates (UltraPlonk)

UltraPlonk extends PLONK with custom gate types. A custom gate is a new polynomial identity that can encode complex operations in a single row:

| Custom gate | What it encodes | Cost vs R1CS |
|---|---|---|
| Arithmetic gate | `qL·a + qR·b + qO·c + qM·(a·b) + qC = 0` | Same as PLONK |
| Range gate | `a ∈ [0, 2^k)` | 1 row vs `k` rows in R1CS |
| EC addition gate | Elliptic curve point addition | 1 row vs ~100 rows in R1CS |
| Lookup gate | `(a, b, c)` is in a pre-committed table | 1 row vs many rows |

Custom gates allow UltraPlonk circuits to be significantly smaller than equivalent R1CS circuits.

### Proof Size

~500 bytes for a typical circuit (polynomial commitment to witness + evaluation proofs + permutation argument). Larger than Groth16 but still compact.

---

## 4. Halo2

### Source

Developed by Zcash / Electric Coin Company. The halo2 book: `zcash.github.io/halo2/`. See also: [PSE reference](../references/pse.md#4-halo2-book).

### Arithmetization

Halo2 uses the same arithmetization as UltraPlonk (gate constraints + copy constraints + lookup arguments). The circuit is described in terms of:

- **Advice columns**: private signals (equivalent to witness in R1CS)
- **Instance columns**: public inputs
- **Fixed columns**: pre-committed constants and selector values

A circuit is a collection of "regions" — groups of cells constrained together. The prover fills in advice columns; the fixed columns are part of the circuit definition.

### Trusted Setup: None (IPA)

Halo2's key innovation: it replaces polynomial commitments over pairing-based groups (KZG, used in Groth16 and PLONK) with the **Inner Product Argument (IPA)** — a commitment scheme requiring no trusted setup.

The IPA uses only discrete log assumptions (no pairings), eliminating the need for a trusted ceremony. This makes Halo2 **transparent** (no toxic waste, no ceremony).

### Native Recursive Composition

Halo2 supports efficient recursive proof composition: verifying a Halo2 proof inside another Halo2 circuit is cheaper than with pairing-based systems. The IPA commitment scheme amortizes verification work across multiple proofs.

### Tradeoffs vs Groth16/PLONK

| Property | Groth16 | PLONK | Halo2 |
|---|---|---|---|
| Proof size | ~192 B | ~500 B | ~1–2 KB |
| Verification time | ~1 ms | ~2 ms | ~10 ms |
| Trusted setup | Circuit-specific | Universal | None |
| Recursion | Hard | Medium | Native |
| Prover time | Fastest | Fast | Slower than PLONK |

---

## 5. STARKs

### Source

"Scalable, transparent, and post-quantum secure computational integrity" — Ben-Sasson et al., ePrint 2018/046. Developed by StarkWare.

### Arithmetization: AIR

STARKs use **Algebraic Intermediate Representation (AIR)** — a system of polynomial constraints over execution traces. A computation is described as a transition function: given state at step `t`, what is the state at step `t+1`? The AIR constraints enforce that every transition is valid.

This is different from arithmetic circuits: AIR natively supports **uniform computations** (same transition function applied repeatedly) — ideal for VMs and repeated operations.

### Transparent Setup

STARKs require **no trusted setup**. The prover uses a random oracle (modeled by a hash function) to generate all randomness. There is no structured reference string, no ceremony, no toxic waste.

### Post-Quantum Security

STARKs are based on collision-resistant hash functions (e.g., SHA-256, Rescue-Prime), not elliptic curves. Elliptic curve discrete log is broken by Shor's algorithm on a quantum computer; hash functions are not (only Grover's, which requires doubling security levels). STARKs are therefore **post-quantum secure** — Groth16, PLONK, and Halo2 are not.

### Proof Size

STARKs produce large proofs: **10–100 KB** depending on circuit size and security level, compared to 192 bytes for Groth16. This makes STARKs impractical for on-chain proof verification where calldata cost matters, but acceptable for off-chain verification.

### Prover Time

STARK provers are highly parallelizable (no elliptic curve group operations, only field arithmetic and hash evaluations). Fast on modern hardware with large circuits. Slower than Groth16 for small circuits due to higher overhead.

### Verification Time

STARK verification is more expensive than pairing-based systems: O(log² n) vs O(1) for Groth16. For a circuit of 1,000,000 constraints, Groth16 verification is ~3 pairings; STARK verification is ~100 hash evaluations.

---

## 6. The Radar Chart Axes — Defined Precisely

The ZK Visual radar chart (catalog item 5.1) compares the four proving systems. For the chart to be honest, each axis must be precisely defined.

| Axis | What it measures | Unit | Notes |
|---|---|---|---|
| Proof size | Serialized proof bytes | Bytes | Canonical: 1,000-constraint test circuit |
| Verification time | Time to verify on reference hardware | Milliseconds | Reference: modern laptop, Ethereum EVM for on-chain |
| Prover time | Relative, normalized to Groth16 | Ratio | Highly circuit-size dependent; see §7 |
| Setup trust level | Trust required for soundness | 0–2 scale | 0 = none, 1 = universal, 2 = circuit-specific |
| Recursion support | Cost of recursive composition | Qualitative | Native / Efficient / Expensive / Impractical |
| Post-quantum security | Secure against quantum attackers | Boolean | Yes = hash-based, No = ECC-based |

### Numeric Values for the Chart

| System | Proof size | Verify time | Prover (relative) | Setup trust | Recursion | Post-quantum |
|---|---|---|---|---|---|---|
| Groth16 | 192 B | ~1 ms | 1× (baseline) | 2 (circuit-specific) | Expensive | No |
| PLONK | ~500 B | ~2 ms | 1.5× | 1 (universal) | Efficient | No |
| Halo2 | ~1.5 KB | ~10 ms | 3× | 0 (none) | Native | No |
| STARKs | ~50 KB | ~50 ms | 5× | 0 (none) | Native | Yes |

---

## 7. What Cannot Be Fairly Compared

The following are **not valid comparisons** without additional context:

### Prover Time

Prover time depends on:
1. Circuit size (number of constraints/rows)
2. Hardware (CPU vs GPU vs FPGA)
3. Specific implementation optimizations (MSM algorithms, FFT implementations)
4. Memory availability

"Groth16 is faster than STARKs" is only true for small circuits on CPU-dominant hardware. For very large circuits on GPU-optimized STARK provers (like StarkEx), STARKs can be faster.

### "Constraint count" across systems

An R1CS constraint for Groth16 is not the same as a PLONK row or an AIR row. A "10,000-constraint circuit" in Groth16 will have a different prover time than a "10,000-row circuit" in PLONK because the arithmetic per row is different.

### Security levels

Comparing security levels requires specifying field sizes and round counts. A 128-bit security Groth16 proof is not directly comparable to a 128-bit security STARK proof — the threat models differ (classical vs post-quantum).

---

## 8. Arithmetic vs Boolean Fields

All four proving systems use field arithmetic, but over different fields:

| System | Field | Bit length | Notes |
|---|---|---|---|
| Groth16 | BN254 (alt_bn128) | 254 bits | Ethereum-native; pairing-friendly |
| PLONK | BN254 or BLS12-381 | 254–381 bits | Flexible |
| Halo2 | Pasta curves (Pallas/Vesta) | 255 bits | Designed for efficient recursion |
| STARKs | Large prime (Goldilocks, etc.) | 64 bits | `p = 2^64 - 2^32 + 1` for efficiency |

### Implication for Gadgets

A gadget (e.g., Poseidon) is defined for a specific field. The S-box `x^5` works over BN254 (where `gcd(5, p-1) = 1`) but must be replaced with `x^3` for other fields where `gcd(3, p-1) = 1`. Circom gadgets written for BN254 may not compile correctly if the backend uses a different field.

STARKs often use smaller fields (64-bit Goldilocks) for performance. Operating over Goldilocks reduces MSM cost but requires different range check strategies (a 64-bit field element is already in range for most applications, so range checks can be simpler).

### Cross-System Circuit Portability

Circuits written in Circom target BN254 specifically. Noir (Aztec's DSL) compiles to ACIR, which is backend-agnostic — the same Noir program can target Barretenberg (PLONK over BN254) or a STARK backend. This is one reason Noir is strategically important: it abstracts over the field choice.

See also: [Aztec and Noir](../references/aztec.md).

---

## 9. Implications for ZK Visual

### The Radar Chart (Catalog Item 5.1)

The radar chart should:
- Use the axis definitions from §6 exactly
- Display normalized values (each axis 0–100%)
- Include a tooltip explaining each axis when hovered
- Include a caveat note linking to §7 ("these comparisons are approximate")

The numeric values in §6 provide the data for each system's radar polygon.

### Deep-Dive Animations

| Catalog item | What to animate | Source section |
|---|---|---|
| 5.2 Groth16 pipeline | R1CS → QAP → Proof (A, B, C) | §2 |
| 5.3 PLONK arithmetization | Gate constraints + copy constraint permutation | §3 |
| 5.4 STARKs overview | AIR transition function + FRI protocol | §5 |

### Renderer Selection

The proving system deep-dives each use different renderers:
- Groth16: `PipelineVisualizer` (shows the pipeline: circuit → SRS → QAP → proof)
- PLONK: `CircuitDAGRenderer` or custom table view showing the gate/copy constraint structure
- Halo2: column layout diagram (advice/instance/fixed columns + region structure)
- STARKs: `PipelineVisualizer` (execution trace → AIR → FRI → proof)

### See Also

- [R1CS and Witnesses](./r1cs-and-witnesses.md) — R1CS, the input to Groth16
- [Gadgets](./gadgets.md) — constraint counts, which differ by proving system
- [Folding Schemes](./folding-schemes.md) — recursive composition beyond Halo2
- [PLONK paper](../references/papers.md#3-plonk) and [Aztec reference](../references/aztec.md)
- [Groth16 paper](../references/papers.md#2-groth16)
