# Hash Functions in ZK Circuits

> ZK knowledge base — Block 5.
> Why standard hash functions are catastrophically expensive in ZK circuits and how ZK-native hash functions solve this.

---

## Table of Contents

1. [Why Hash Functions Matter in ZK](#1-why-hash-functions-matter-in-zk)
2. [SHA-256 in a ZK Circuit](#2-sha-256-in-a-zk-circuit)
3. [What Makes a Hash ZK-Friendly](#3-what-makes-a-hash-zk-friendly)
4. [Poseidon](#4-poseidon)
5. [MiMC](#5-mimc)
6. [The Sponge Construction (Visualizable)](#6-the-sponge-construction-visualizable)
7. [Keccak/SHA-3 in ZK](#7-keccaksha-3-in-zk)
8. [Constraint Cost Comparison](#8-constraint-cost-comparison)
9. [Implications for ZK Visual](#9-implications-for-zk-visual)

---

## 1. Why Hash Functions Matter in ZK

Hash functions appear throughout ZK applications:

| Application | Where the hash appears |
|---|---|
| Merkle proofs | Hash of sibling nodes at each level |
| Nullifiers | `H(secret, index)` to prevent double-spending |
| Commitments | `H(value, randomness)` to commit without revealing |
| Public input compression | Hash many values into one circuit input |
| zkEVM | Ethereum state root (Keccak/SHA-256) |

If the hash is expensive in ZK, the entire application is expensive. A 20-level Merkle tree proof with 20 hash invocations multiplies the hash cost by 20. The hash is the dominant cost in most practical ZK applications — optimizing it is the most impactful single design decision.

---

## 2. SHA-256 in a ZK Circuit

### How SHA-256 Works

SHA-256 processes 64-byte blocks through:
- 64 rounds of a compression function
- Each round: bitwise operations on 32-bit words (XOR, AND, NOT, right-rotation, right-shift, addition mod 2^32)

### Why Bitwise Operations Are Expensive in R1CS

Arithmetic circuits operate over prime fields Fp, not bits. There is no native XOR or AND gate. To perform bitwise operations in an arithmetic circuit:

1. **Decompose** each 32-bit word into 32 bits: 32 boolean constraints (see [Gadgets](./gadgets.md#4-boolean-constraint))
2. **Apply** the bitwise operation bit-by-bit: ~32 constraints per operation
3. **Recompose** the result into a field element: 1 linear constraint (free)

Cost per 32-bit bitwise operation: ~32–64 constraints.

### SHA-256 Total Cost

SHA-256 contains approximately:
- ~28,000 additions (word-level, 32-bit)
- ~22,000 AND operations (bitwise, 32-bit)
- ~10,000 XOR operations (bitwise, 32-bit)

Translating to R1CS constraints:
- Each AND on 32-bit words: ~32 multiplication constraints
- Each XOR on 32-bit words: ~32 multiplication constraints (via de Morgan's: `XOR(a,b) = a + b - 2*AND(a,b)`)

**Approximate R1CS cost: ~150,000 constraints per SHA-256 hash.**

```
SHA-256   ████████████████████████████████████████████████████  ~150,000 constraints
```

### Why This Is Impractical

A 20-level Merkle tree requires 20 SHA-256 hash invocations:

```
20 × 150,000 = 3,000,000 constraints
```

At ~3 million constraints, proof generation takes minutes on a powerful machine and may be impractical on consumer hardware. A privacy application requiring multiple Merkle proofs (Tornado Cash, Semaphore) would be completely unusable with SHA-256.

---

## 3. What Makes a Hash ZK-Friendly

A hash function is **ZK-friendly** if it is defined natively over a prime field Fp using only field operations:

- **Addition**: `a + b mod p` — free in R1CS (linear, 0 multiplication constraints)
- **Multiplication**: `a × b mod p` — 1 constraint per multiplication
- **Exponentiation**: `a^k mod p` — can be decomposed into multiplications

The key insight: **replace XOR and AND (bit operations) with exponentiation (field operations)**.

A field element `x ∈ Fp` does not need to be decomposed into bits for field operations. An S-box like `x^5` requires only `⌈log₂(5)⌉ = 3` multiplications per element:
```
x² = x × x           (1 multiplication)
x⁴ = x² × x²         (1 multiplication)
x⁵ = x⁴ × x          (1 multiplication)
Total: 3 multiplications per field element per S-box application
```

This replaces hundreds of bit-decomposition constraints with 3 field multiplications.

---

## 4. Poseidon

### Design and Authors

**Poseidon** was designed by Lorenzo Grassi, Dmitry Khovratovich, Christian Rechberger, Arnab Roy, and Markus Schofnegger (2019). Published: USENIX Security 2021; ePrint 2019/458.

Poseidon is currently the **de facto standard** ZK-friendly hash function, used in:
- Semaphore (identity protocol)
- Tornado Cash (privacy mixer)
- Aztec Network
- Filecoin (in some configurations)
- zkSync Era
- Most modern ZK Merkle tree implementations

### Structure

Poseidon uses the **sponge construction** over a prime field Fp:

- **State**: a vector of `t` field elements
- **Permutation**: a sequence of rounds, each consisting of:
  1. **AddRoundConstants (ARC)**: add pre-computed constants to state (linear, free)
  2. **SubWords (S-box)**: apply `x^5` to each state element (full rounds) or one element (partial rounds)
  3. **MixLayer (MDS)**: multiply state by a Maximum Distance Separable (MDS) matrix (linear, free)

### Full vs Partial Rounds

Poseidon uses two types of rounds to minimize constraints:

- **Full rounds** (RF): apply `x^5` to *all* `t` state elements — needed for security
- **Partial rounds** (RP): apply `x^5` to *one* state element — saves constraints

For Poseidon-128 (128-bit security) with `t = 3` (2 inputs + 1 capacity):
- 8 full rounds + 57 partial rounds (typical)
- Full round cost: `t × 3` multiplications = `3 × 3 = 9` per full round
- Partial round cost: `3` multiplications (only 1 S-box active)

Total: `8 × 9 + 57 × 3 = 72 + 171 = 243 ≈ 240 constraints per hash`.

```
Poseidon  ████  ~240 constraints
SHA-256   ████████████████████████████████████████████████████  ~150,000 constraints
```

### The 625× Improvement

`150,000 / 240 ≈ 625`. Poseidon uses ~625× fewer constraints than SHA-256 per hash.

For the 20-level Merkle tree:
```
SHA-256:  20 × 150,000 = 3,000,000 constraints  (minutes of proving)
Poseidon: 20 × 240     =     4,800 constraints  (< 1 second)
```

This improvement makes Merkle tree proofs practical in ZK applications.

### S-Box Choice: Why x^5 and Not x^3?

The S-box `x^α` requires `gcd(α, p-1) = 1` for the S-box to be a bijection over Fp (invertible, as required for a permutation). For the BN254 prime: `gcd(5, p-1) = 1` (valid). `gcd(3, p-1) ≠ 1` for BN254 — so `x^3` cannot be used directly with this curve. For other curves or field sizes, `x^3` may be valid (used in MiMC).

---

## 5. MiMC

### Design

**MiMC** (Minimal Multiplicative Complexity) was designed by Martin Albrecht, Lorenzo Grassi, Christian Rechberger, Arnab Roy, and Tyge Tiessen (2016). ePrint 2016/492.

MiMC uses a simpler construction:
- S-box: `x^3` (requires a field where `gcd(3, p-1) = 1`)
- Iterated key-alternating cipher structure
- Typically ~300–500 multiplication constraints depending on the field and security level

### Status

MiMC is a predecessor to Poseidon. Poseidon achieves better security margins with comparable or lower constraint counts, using the sponge construction instead of the Feistel structure. **Most new ZK systems use Poseidon rather than MiMC.** MiMC remains in use in deployed systems (some older Tornado Cash implementations).

---

## 6. The Sponge Construction (Visualizable)

### Overview

The sponge construction is a general framework for building hash functions from a permutation. It has two phases:

```
ABSORB PHASE
─────────────────────────────────────────────────────────
Input:  m₁    m₂    m₃
        │     │     │
        ▼     ▼     ▼
State: [r | c]─f─[r | c]─f─[r | c]─f─[r | c]
        ▲                              │
Initial state (zeros)             After absorbing all input

SQUEEZE PHASE
─────────────────────────────────────────────────────────
State: [r | c]
        │
        ▼
Output: h₁ (read from rate portion r)
        │
       [r | c]─f─[r | c]
                   │
                   ▼
               h₂ (for multi-output hash)
```

### Components

| Component | Description |
|---|---|
| State | `t` field elements split into rate `r` and capacity `c` |
| Rate (r) | The portion of state that absorbs inputs and emits outputs |
| Capacity (c) | The internal hidden state — provides security |
| Permutation (f) | The Poseidon permutation (rounds of ARC + SubWords + MDS) |

### Absorb Phase

1. XOR (in field: add mod p) each input chunk into the rate portion of the state
2. Apply the permutation f to the full state
3. Repeat for each input chunk

### Squeeze Phase

1. Read output elements from the rate portion of the state
2. If more output is needed, apply the permutation and read again

### Visualizability

The sponge construction maps directly to the `PipelineVisualizer` renderer:
- Each absorb step = one pipeline stage (input block → permutation → updated state)
- Each squeeze step = one pipeline stage (read output)
- The state vector can be shown as a row of boxes (field elements)
- The permutation can be abstracted as a "mixing" animation (the internal details are shown separately in the permutation deep-dive)

---

## 7. Keccak/SHA-3 in ZK

### Keccak Constraint Cost

Keccak (SHA-3) is also built on bitwise operations, similar to SHA-256. **Approximate cost: ~150,000 R1CS constraints per hash** — similar order of magnitude to SHA-256.

### Why Keccak Matters Despite Its Cost

Keccak is the hash function used internally by **Ethereum**:
- Ethereum account addresses are the last 20 bytes of Keccak-256 of a public key
- Ethereum state roots use Merkle-Patricia tries hashed with Keccak
- Solidity's `keccak256()` is the standard on-chain hash

Any circuit that must prove something about Ethereum state must implement Keccak. This is the primary reason **zkEVM circuits are extremely large** — they must implement Keccak in ZK, which alone adds millions of constraints.

### The zkEVM Problem

A zkEVM (zero-knowledge Ethereum Virtual Machine) proves Ethereum block execution in ZK. The Keccak constraint cost is one of several factors making zkEVM circuits massive:

| Component | Approx constraints per block |
|---|---|
| Keccak hashes | ~50,000,000+ |
| EVM arithmetic | ~5,000,000+ |
| Memory operations | ~10,000,000+ |
| State proof (Merkle) | ~20,000,000+ |

Poseidon cannot replace Keccak in zkEVM because zkEVM must match Ethereum's actual Keccak computation — changing the hash function would break Ethereum compatibility.

---

## 8. Constraint Cost Comparison

| Hash function | Design | Constraints per hash | Field | Notes |
|---|---|---|---|---|
| SHA-256 | Bitwise (XOR, AND, rotation) | ~150,000 | Bits (not field-native) | Ethereum-compatible |
| Keccak-256 | Bitwise sponge (χ, θ, ρ, π, ι) | ~150,000 | Bits | Ethereum-compatible |
| MiMC | Field-native (x^3 S-box) | ~300–500 | Fp | Older; still in use |
| Poseidon-128 | Field-native sponge (x^5 S-box) | ~240 | Fp | Current standard |
| Rescue | Field-native (x^α + x^(1/α)) | ~280–400 | Fp | More conservative security |

### Visualization (Relative Bar Chart)

```
SHA-256    ████████████████████████████████████████████████  150,000
Keccak     ████████████████████████████████████████████████  150,000
Rescue     ▌                                                    ~350
MiMC       ▌                                                    ~400
Poseidon   ▌                                                    ~240
```

---

## 9. Implications for ZK Visual

### Catalog Item Mapping

| Catalog item | Content | Renderer |
|---|---|---|
| 3.1 "Why Hash Functions Are Expensive" | SHA-256 vs Poseidon bar chart | `CostComparison` |
| 3.2 "Poseidon Sponge" | Absorb/squeeze pipeline animation | `PipelineVisualizer` |
| 3.3 "Poseidon Permutation" | Round function step-by-step | `CircuitDAGRenderer` |

### Constraint Numbers to Use

The exact numbers for the `CostComparison` renderer:

```typescript
const hashCostData = [
  { name: 'SHA-256',  constraints: 150_000, color: 'red' },
  { name: 'Keccak',   constraints: 150_000, color: 'orange' },
  { name: 'MiMC',     constraints: 400,     color: 'yellow' },
  { name: 'Poseidon', constraints: 240,     color: 'green' },
];
```

### Narrative Arc

The hash functions visualization follows this arc:

1. **The problem**: "Every time you hash in ZK, you pay this cost"
2. **SHA-256 cost**: show the bar chart — 150,000 constraints is an enormous number
3. **Why so expensive**: show one XOR gate decomposing to 32 boolean constraints
4. **The insight**: field operations don't require bit decomposition
5. **Poseidon**: show the S-box `x^5` — 3 multiplications — and the sponge structure
6. **The result**: 240 constraints vs 150,000 — the 625× improvement

### See Also

- [Gadgets](./gadgets.md) — bit decomposition and boolean constraints (the building blocks of SHA-256's cost)
- [Arithmetic Circuits](./arithmetic-circuits.md) — field arithmetic fundamentals
- [R1CS and Witnesses](./r1cs-and-witnesses.md) — constraint counting model
- [Poseidon paper](../references/papers.md#5-poseidon) — the original design paper
