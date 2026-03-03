# Non-Native Field Arithmetic

> ZK Visual knowledge base — field emulation, the ~36× constraint overhead of non-native
> arithmetic, and native vs non-native design choices for catalog item 6.2.

---

## Table of Contents

1. [What Non-Native Field Arithmetic Means](#1-what-non-native-field-arithmetic-means)
2. [The Common Case: ECDSA Verification](#2-the-common-case-ecdsa-verification)
3. [Field Emulation: How It Works](#3-field-emulation-how-it-works)
4. [The 36× Cost Breakdown](#4-the-36-cost-breakdown)
5. [Why This Compounds](#5-why-this-compounds)
6. [The Design Choice: Native Signature Schemes](#6-the-design-choice-native-signature-schemes)
7. [BabyJubJub](#7-babyjubjub)
8. [When Non-Native Arithmetic Is Unavoidable](#8-when-non-native-arithmetic-is-unavoidable)
9. [Visualization Strategy for Catalog Item 6.2](#9-visualization-strategy-for-catalog-item-62)
10. [Implications for ZK Visual](#10-implications-for-zk-visual)

---

## 1. What Non-Native Field Arithmetic Means

A ZK circuit operates over a **native prime field `Fp`** — all wire values are elements of `Fp`, all gate operations are field operations mod `p`. The arithmetic is native because the proving system's polynomial machinery is defined over `Fp`.

When the computation being proven involves arithmetic over a **different prime field `Fq`** (where `q ≠ p`), the prover must simulate `Fq` operations using `Fp` operations. This simulation is called **field emulation**. Every `Fq` addition, multiplication, and modular reduction requires multiple `Fp` operations — the ratio is the non-native cost.

```
Native:     a × b  (mod p)  →  1 multiplication gate

Non-native: a × b  (mod q)  →  ~36 multiplication gates
            (when representing Fq elements as Fp limbs)
```

The overhead is not a protocol limitation — it is a fundamental consequence of embedding one finite field arithmetic into another. There is no way to perform `Fq` multiplication in a single `Fp` gate when `q ≠ p`.

---

## 2. The Common Case: ECDSA Verification

**ECDSA signatures over secp256k1** are ubiquitous: every Bitcoin transaction, every Ethereum externally-owned account transaction is signed with secp256k1 ECDSA. Applications that need to prove the validity of these signatures inside a ZK circuit face the non-native arithmetic problem directly.

The arithmetic mismatch:

| System | Field |
|---|---|
| secp256k1 group order | `q = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141` (256-bit prime) |
| BN254 scalar field (Groth16) | `p = 0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001` (254-bit prime) |

These are different primes. Groth16 circuits over BN254 must **emulate** secp256k1 field arithmetic using BN254 operations.

**Result:** `circom-ecdsa` (the canonical Circom ECDSA verifier by 0xPARC) requires approximately **1.5 million constraints** to verify a single ECDSA signature. For comparison, a Poseidon hash takes 240 constraints.

This is not a bug or an implementation inefficiency — it is the mathematical cost of field emulation.

---

## 3. Field Emulation: How It Works

To represent a 256-bit element of `Fq` using elements of `Fp` (where `p` is ~254 bits), the standard approach is **limb decomposition**.

### Limb Decomposition

Split the 256-bit `Fq` element into k chunks ("limbs"), each fitting in the native field:

```
Fq element (256 bits):
┌─────────────────────────────────────────────────────────────────────┐
│                   256-bit value (mod q)                             │
└─────────────────────────────────────────────────────────────────────┘

Represented as 3 limbs over Fp (each ~85 bits):
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  limb[2]      │  │  limb[1]      │  │  limb[0]      │
│  bits 170–255 │  │  bits 85–169  │  │  bits 0–84    │
└───────────────┘  └───────────────┘  └───────────────┘

Value = limb[0] + limb[1]·2^85 + limb[2]·2^170   (as integers, not mod p)
```

Each limb is a native `Fp` element (fitting in a single wire). The limb decomposition is valid as long as the integer value of `limb[i]·2^(85i)` combined does not overflow `Fq`.

### Non-Native Addition

Adding two Fq elements `a + b` as limb arrays:
1. Add corresponding limbs: `c[i] = a[i] + b[i]`
2. Propagate carries: if `c[i] ≥ 2^85`, subtract `2^85` from `c[i]` and add 1 to `c[i+1]`
3. Range-check each carry: each carry is a single bit, requiring a boolean constraint

Cost: k additions (free, they are not multiplication gates) + k carry range checks (each requiring 3 constraints for a 1-bit carry)

### Non-Native Multiplication

Multiplying two Fq elements `a × b` as limb arrays (schoolbook multiplication):

```
a × b = (a[0] + a[1]·B + a[2]·B²) × (b[0] + b[1]·B + b[2]·B²)
      = a[0]·b[0]
      + (a[0]·b[1] + a[1]·b[0])·B
      + (a[0]·b[2] + a[1]·b[1] + a[2]·b[0])·B²
      + (a[1]·b[2] + a[2]·b[1])·B³
      + a[2]·b[2]·B⁴

Where B = 2^85
```

For k=3 limbs: 9 limb multiplications (9 native multiplication gates), followed by:
- Carry propagation across 5 product terms
- Modular reduction mod q (requires checking the result is in [0, q-1])
- Range checks on all intermediate values

---

## 4. The 36× Cost Breakdown

For a 256-bit field element split into 3 limbs of 85 bits each, one non-native multiplication requires approximately:

| Operation | Count | Constraints |
|---|---|---|
| Limb multiplications (k² = 9) | 9 | 9 |
| Carry range checks (85-bit carries) | 6 carries × 3 constraints each | 18 |
| Modular reduction checks | 3 | 3 |
| Limb range checks on result | 3 × 2 | 6 |
| **Total** | | **~36** |

The exact count varies by implementation — `circom-ecdsa` uses more careful optimization and still lands around 33–40 constraints per non-native multiplication. The conventional figure **36× overhead** is a reasonable approximation.

**Summary:** one multiplication in Fq costs the same constraints as 36 multiplications in Fp.

---

## 5. Why This Compounds

ECDSA signature verification requires:

1. **Scalar multiplication** on secp256k1: compute `k·G` where `k` is a 256-bit scalar and `G` is the base point
2. **Point addition**: multiple invocations of the elliptic curve group law
3. **Hash verification**: `H(r, s, msg)` = expected value

The constraint accumulation:

| Operation | Count per verification | Fp constraints |
|---|---|---|
| secp256k1 point double | ~256 | 256 × 36 × 3 ≈ 27,648 |
| secp256k1 point add | ~128 | 128 × 36 × 3 ≈ 13,824 |
| Scalar multiplication (double-and-add) | 1 (256-bit scalar) | ~41,000 |
| Two scalar multiplications (ECDSA) | 2 | ~82,000 |
| Field inversions for affine coordinates | ~10 | ~3,600 |
| **Field arithmetic subtotal** | | **~85,000** |
| Hash (Keccak-256) | 1 | ~150,000 |
| Final equality check, other overhead | | ~15,000 |
| **Total (approximate)** | | **~1,500,000** |

This matches the empirically measured constraint count for `circom-ecdsa`. The 1.5M figure is not an error — it is the compounded effect of 36× overhead applied to the hundreds of field multiplications inside scalar multiplication.

---

## 6. The Design Choice: Native Signature Schemes

When an application has flexibility in choosing its signature scheme, native arithmetic eliminates the non-native overhead entirely.

**BabyJubJub EdDSA:**
- Curve: defined over BN254's scalar field → arithmetic is **native to Groth16**
- Non-native overhead: **0** (all arithmetic is in Fp)
- One scalar multiplication on BabyJubJub: ~2,048 constraints
- Full EdDSA verification: ~3,000–5,000 constraints

| Scheme | Curve | Field native to BN254? | Constraints per verification |
|---|---|---|---|
| ECDSA | secp256k1 | No | ~1,500,000 |
| EdDSA | BabyJubJub | Yes | ~3,000–5,000 |
| **Ratio** | | | **~300–500×** |

The cost difference is not 36× — it is 300–500× because the non-native overhead applies to every field multiplication inside the scalar multiplication, which itself involves ~256 iterations.

For ZK applications that control their key material (Semaphore identities, Tornado Cash notes, custom ZK protocols), using BabyJubJub EdDSA instead of ECDSA reduces signature verification cost by 2–3 orders of magnitude.

---

## 7. BabyJubJub

BabyJubJub is a twisted Edwards elliptic curve designed specifically for efficient ZK circuits over BN254.

**Curve equation:**

```
168700·x² + y² = 1 + 168696·x²·y²   (over BN254's scalar field Fp)
```

**Parameters:**

| Parameter | Value |
|---|---|
| Field | BN254 scalar field `p` |
| Group order | `l = 2736030358979909402780800718157159386076813972158567259200215660948447373041` |
| Base point `B₈` | `(5299619240641551281634865583518297030282874472190772894086521144482721001553, 16950150798460657717958625567821834550301663161624707787222815936182638968203)` |

**Used in:**
- Semaphore: identity commitments and group membership proofs
- Tornado Cash: note commitments (original)
- Most `circomlib` signature applications (`eddsa.circom`)
- Any protocol using `circomlib`'s `BabyJubJub` library

**Why it was designed:** The ZK community needed a signature scheme compatible with BN254-based proving systems (Groth16, early PLONK) that did not require non-native arithmetic. BabyJubJub was designed by Jordi Baylina and Marta Bellés for this purpose.

---

## 8. When Non-Native Arithmetic Is Unavoidable

Some applications must verify signatures or computations from external systems that use different curves. In these cases, non-native arithmetic is the only option.

| Application | Non-native signature | Reason unavoidable |
|---|---|---|
| zkEVM | secp256k1 ECDSA | Must verify Ethereum EOA transactions — cannot substitute EdDSA |
| zk-email | RSA-2048 PKCS#1 | Must verify DKIM signatures from email servers — no native equivalent |
| Cross-chain proofs | Varies by chain | Must verify signatures from chains using their native schemes |
| Ethereum account proofs | secp256k1 ECDSA | Must prove Ethereum address ownership |

These use cases accept the ~1.5M constraint cost (or worse) because the application requires cryptographic compatibility with external systems. zkEVM projects (Polygon zkEVM, zkSync Era, Scroll) dedicate a large fraction of their circuit capacity to this problem alone.

---

## 9. Visualization Strategy for Catalog Item 6.2

**Title:** "Non-Native Arithmetic: The 36× Cost"

### CostComparison Renderer Data

```typescript
const nonNativeComparison: ComparisonState = {
  label: "One Field Multiplication",
  left: {
    label: "Non-Native (secp256k1 in BN254)",
    constraintCount: 36,
    description: "Field emulation via 3-limb decomposition",
    color: "highlightCostly",
  },
  right: {
    label: "Native (BabyJubJub in BN254)",
    constraintCount: 1,
    description: "Direct BN254 scalar field multiplication",
    color: "highlightEfficient",
  },
};
```

### SplitView Configuration

- **Left panel:** The limb decomposition circuit fragment — shows the 3-limb representation of a secp256k1 field element as a DAG: one input node labeled "256-bit value", three intermediate nodes labeled "limb[0] (85-bit)", "limb[1] (85-bit)", "limb[2] (85-bit)", then a tree of 9 multiplication gates (schoolbook), then carry nodes, then reduction output
- **Right panel:** A single multiplication gate: one input `a`, one input `b`, one multiplication gate, one output `a·b mod p`

### Description Arc

1. **The choice:** "Your protocol needs signatures. Which curve do you use?"
2. **The cost:** Show the 36-bar vs 1-bar comparison
3. **The mechanism:** Expand the left panel to show the limb decomposition — three labeled boxes for the 256-bit value
4. **The compounding:** Show a counter accumulating: "1 scalar multiplication = 256 point doublings × 36 = 9,216 constraints for field ops alone"
5. **The design recommendation:** "If you control the key material, use BabyJubJub EdDSA: 2,048 constraints total"

---

## 10. Implications for ZK Visual

**New visual element required: Limb Decomposition Row**

The section 6.2 visualization requires showing a 256-bit field element decomposed into 3 labeled limbs:

```
┌────────────────────────────────────────────────────────────────────┐
│                 secp256k1 field element (256 bits)                 │
└────────────────────────────────────────────────────────────────────┘
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   limb[2]       │  │   limb[1]       │  │   limb[0]       │
│   bits 170–255  │  │   bits 85–169   │  │   bits 0–84     │
│   (85-bit Fp)   │  │   (85-bit Fp)   │  │   (85-bit Fp)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Recommended implementation:** SVG group of three labeled rectangles with connector lines from the parent value. Reusable for any multi-limb representation (RSA, secp256r1, etc.). Width proportional to bit count of each limb.

**Cross-links:**
- Catalog: [catalog.md — item 6.2](../content/catalog.md)
- References: [circom-ecdsa by 0xPARC](../references/0xparc.md)
- BabyJubJub in circomlib: [gadgets.md](./gadgets.md)
- Proving systems context: [proving-systems.md — BN254](./proving-systems.md)
- Visualization spec: [step-encoding.md](../technical/step-encoding.md)
