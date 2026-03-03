# Aztec Network

> References — key teams.
> Reference for Aztec Network, creators of PLONK, and their contributions to ZK tooling and the Noir language.

---

## Table of Contents

1. [About Aztec](#1-about-aztec)
2. [PLONK](#2-plonk)
3. [UltraPlonk](#3-ultraplonk)
4. [Noir](#4-noir)
5. [Barretenberg](#5-barretenberg)
6. [Aztec Protocol Applications](#6-aztec-protocol-applications)
7. [Relevance to ZK Visual](#7-relevance-to-zk-visual)

---

## 1. About Aztec

**Aztec** is a ZK technology company building a programmable privacy L2 on Ethereum. It operates as two related entities:

- **Aztec Protocol**: the Layer 2 blockchain focused on programmable privacy — private smart contracts, private DeFi, private NFTs
- **Aztec Labs**: the research arm responsible for foundational ZK innovations — PLONK, UltraPlonk, Barretenberg, Noir

**Website**: `aztec.network`

**GitHub**: `github.com/AztecProtocol`

Aztec's research contributions to the ZK field are disproportionate to its size. PLONK (which Aztec created) is the arithmetization underlying Halo2 (Zcash/ECC) and a wide range of other proving systems. Noir (Aztec's ZK DSL) is rapidly becoming the second most popular ZK language after Circom.

For ZK Visual, Aztec is relevant in two direct ways:
1. **PLONK** is the proving system for catalog item 5.3 (the PLONK arithmetization deep-dive)
2. **Noir** is the second supported language in ZK Visual's code panel

---

## 2. PLONK

### Origin

PLONK was created by **Ariel Gabizon**, **Zachary J. Williamson**, and **Oana Ciobotaru** at Aztec Network in 2019. ePrint: 2019/953. See the full annotation in [Papers](./papers.md#3-plonk).

### Gabizon's Background

Ariel Gabizon is one of the most significant researchers in practical ZK cryptography. Before Aztec, he was at Zcash and co-designed the Sapling upgrade. He is the primary author of PLONK, Plookup, and several other key advances. His writing style is technically dense but precise.

### Williamson's Role

Zachary J. Williamson (Aztec CEO) is the co-author of PLONK and the primary architect of UltraPlonk and the Barretenberg library. He drives Aztec's technical direction.

### Why PLONK Matters Beyond Aztec

PLONK's universal trusted setup was a major practical advance — teams no longer needed to run a trusted ceremony per circuit. The PLONK arithmetization (gate + copy constraints) was adopted by:

- **Halo2** (Zcash/ECC): uses PLONK arithmetization with IPA instead of KZG
- **Marlin**: uses PLONK arithmetization with a different polynomial commitment
- **Turbo-PLONK**: Aztec's intermediate step between PLONK and UltraPlonk
- Many zkEVM designs

Understanding PLONK's arithmetization means understanding the base layer of most modern non-STARKs ZK systems.

### How to Read the PLONK Paper

The PLONK paper (`ePrint 2019/953`) is technically dense. Recommended approach:

1. Read Vitalik's "Understanding PLONK" post first (see [Vitalik Buterin](./vitalik-buterin.md#3-plonk-and-universal-setups))
2. In the paper: read the **introduction** (pages 1–4) and **Section 5** (the protocol)
3. Section 5.1: gate constraints — the polynomial `a(X)·b(X)·qM(X) + a(X)·qL(X) + b(X)·qR(X) + c(X)·qO(X) + PI(X) + qC(X) = 0`
4. Section 5.2: the permutation (copy constraint) argument — `Z(X)` the grand product polynomial
5. Return to Section 2 (KZG polynomial commitments) after understanding what they are used for

---

## 3. UltraPlonk

### What It Is

**UltraPlonk** is Aztec's extension of PLONK that adds:

1. **Custom gates**: new gate types beyond the standard arithmetic gate
2. **Lookup arguments**: integration of Plookup (see [Papers](./papers.md#4-plookup))
3. **Range gates**: native range check in one row (vs `k` rows in R1CS)
4. **Elliptic curve gates**: efficient EC point addition in one row

UltraPlonk is what Halo2 uses as its arithmetization model ("UltraPlonk Arithmetization"). When the halo2 book describes "custom gates," it is describing UltraPlonk-style gates.

### Custom Gate Types

| Gate | What it encodes | Cost vs R1CS |
|---|---|---|
| Arithmetic | `qL·a + qR·b + qO·c + qM·(a·b) + qC = 0` | Same |
| Plookup | `(a, b, c)` in a pre-committed lookup table | 1 row vs many |
| Range | `a ∈ [0, 2^k)` | 1 row vs `k` rows |
| Elliptic curve addition | Point addition on BN254 | 1 row vs ~100 rows |

### Why UltraPlonk Changes Constraint Economics

A range check for 32 bits in R1CS costs 32 constraints. In UltraPlonk with a lookup gate, it costs 1 row. For circuits that use many range checks (which is most circuits — range checks appear in comparisons, hash functions, and arithmetic), UltraPlonk circuits can be 10–50× smaller than equivalent R1CS circuits.

This is why "constraint count" comparisons must specify the backend. A "10,000-constraint Groth16 circuit" and a "10,000-row UltraPlonk circuit" have very different effective complexities.

---

## 4. Noir

### What It Is

**Noir** is a domain-specific language for ZK circuits created by Aztec. It has a Rust-like syntax and is designed to be:

- **Readable**: closer to general-purpose programming than Circom
- **Safe**: type system prevents common ZK bugs (field element confusion, unconstrained signals)
- **Backend-agnostic**: compiles to ACIR, not directly to a proving system

**GitHub**: `github.com/noir-lang/noir`

**Documentation**: `noir-lang.org`

### Compilation Pipeline

```
Noir source code
      │
      ▼
ACIR (Abstract Circuit Intermediate Representation)
      │
      ├──▶ Barretenberg (UltraPlonk — Aztec's backend)
      ├──▶ Halo2 backend
      └──▶ Other backends (experimental)
```

ACIR is a backend-agnostic intermediate representation. A Noir program compiles to ACIR once and can then be proven by different backend systems. This is analogous to LLVM IR for compilers.

### Syntax Comparison: Circom vs Noir

**Circom** (bit decomposition, 8-bit):
```circom
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1 = 0;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc1 += out[i] * (2 ** i);
    }
    lc1 === in;
}
```

**Noir** (equivalent — range check built-in):
```rust
fn main(x: u8) {
    // x is constrained to [0, 255] by its type
    assert(x < 200);
}
```

Noir's type system encodes range constraints automatically. An `u8` signal is automatically range-checked to 8 bits without explicit constraint writing. This eliminates an entire class of ZK bugs (forgetting range checks) and makes the code more readable.

### Why Noir for ZK Visual

1. **Cleaner educational code**: Noir's syntax is more readable than Circom for developers without prior ZK experience
2. **Type safety**: the type system demonstrates constraint-level semantics in a familiar programming paradigm
3. **Growing ecosystem**: Noir is gaining adoption rapidly; teaching it alongside Circom prepares users for both ecosystems
4. **Backend flexibility**: Noir targets PLONK/UltraPlonk backends, complementing Circom's Groth16 focus

The ZK Visual code panel (Phase 1) supports both Circom and Noir with syntax highlighting. Catalog items show both where the difference is educational.

---

## 5. Barretenberg

### What It Is

**Barretenberg** is Aztec's C++ ZK proving library. It implements UltraPlonk from scratch and serves as the reference implementation for the Noir compiler's primary backend.

**GitHub**: `github.com/AztecProtocol/barretenberg`

### Performance Characteristics

Barretenberg is one of the most optimized ZK proving libraries in the ecosystem. It includes:
- Hand-optimized MSM (multi-scalar multiplication) using WASM SIMD
- FFT optimizations for UltraPlonk's polynomial operations
- A WASM build for browser-side proving (relevant for ZK Visual's frontend proving ambitions)

### Browser WASM Build

Barretenberg compiles to WebAssembly and can run in the browser. This is used by Aztec's developer tools (`aztec.js`) and by the Noir playground. For ZK Visual, a browser-side WASM prover (Barretenberg or SnarkJS for Groth16) would enable users to generate actual proofs for the circuits they are visualizing — a significant feature for advanced catalog phases.

### Performance Benchmarks

Barretenberg's benchmarks are often used as the UltraPlonk performance baseline in the ecosystem. For ZK Visual's proving systems comparison content, Barretenberg times for standard circuits are credible reference points.

---

## 6. Aztec Protocol Applications

### Programmable Privacy

Aztec's L2 enables:
- **Private token transfers**: ERC-20 transfers where the sender, recipient, and amount are hidden on-chain
- **Private DeFi**: DEX trades, lending, and yield without revealing positions
- **Private NFTs**: NFT ownership and transfer without public attribution
- **Shielded accounts**: an Ethereum account with on-chain privacy

These applications motivate the efficiency requirements for ZK proofs — each private transaction generates a proof that must be verified on Ethereum.

### Aztec Connect (Historical Context)

Aztec Connect was Aztec's original product — a privacy bridge between Ethereum L1 and a private rollup, allowing users to interact with L1 DeFi protocols (Uniswap, Aave, Element) privately. It was sunset in 2023 to focus on Aztec's L2.

### Aztec L2 (Current)

The current Aztec L2 is a full programmable smart contract platform with built-in privacy. Smart contracts are written in Noir; circuits are compiled by the Aztec compiler; proofs are generated by Barretenberg.

---

## 7. Relevance to ZK Visual

### PLONK Deep-Dive (Catalog Item 5.3)

The PLONK arithmetization visualization requires understanding the gate and copy constraint structure as defined in the original Aztec paper. This document, combined with [Proving Systems](../zk/proving-systems.md#3-plonk) and Vitalik's "Understanding PLONK" post, provides the complete reference for that visualization.

Key visual elements for the PLONK animation:
- The gate constraint table (rows = gates, columns = a, b, c, selectors)
- The copy constraint permutation (wiring diagram showing which wires share values)
- The grand product polynomial Z(X) (abstract — may be shown as a "verification step" rather than the polynomial itself)

### Noir in the Code Panel

The Phase 1 code panel supports Noir syntax highlighting. For Noir:
- Use the `noir-lang/noir` syntax definition for Monaco Editor
- Map Noir's type system to constraint annotations in the visualization
- Show how `u8` type automatically adds a range check (connecting Noir's type system to the gadget library)

### Resource Cross-Links

| Aztec resource | ZK Visual content |
|---|---|
| PLONK paper | Catalog item 5.3 (PLONK arithmetization) |
| UltraPlonk custom gates | Proving systems section — "custom gates" note |
| Noir language | Code panel (Phase 1) |
| Barretenberg WASM | Future: browser-side proof generation |
| Aztec applications | Motivation section — why proof efficiency matters |

### See Also

- [Papers — PLONK](./papers.md#3-plonk) — the academic citation and reading guide
- [Papers — Plookup](./papers.md#4-plookup) — the lookup argument that UltraPlonk uses
- [Vitalik — Understanding PLONK](./vitalik-buterin.md#3-plonk-and-universal-setups) — the accessible companion to the paper
- [Proving Systems](../zk/proving-systems.md#3-plonk) — PLONK in the ZK Visual technical context
