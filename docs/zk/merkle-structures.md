# Merkle Tree Structures in ZK Circuits

> ZK Visual knowledge base — standard, sparse, and indexed Merkle tree variants with
> circuit structures and constraint costs for catalog items 4.1, 4.2, and 4.3.

---

## Table of Contents

1. [Standard Merkle Trees (Brief Recap)](#1-standard-merkle-trees-brief-recap)
2. [The Non-Membership Problem](#2-the-non-membership-problem)
3. [Sparse Merkle Trees](#3-sparse-merkle-trees)
4. [Sparse Merkle Tree Circuit Structure](#4-sparse-merkle-tree-circuit-structure)
5. [Sparse Merkle Tree Tradeoffs](#5-sparse-merkle-tree-tradeoffs)
6. [Indexed Merkle Trees (Aztec Pattern)](#6-indexed-merkle-trees-aztec-pattern)
7. [Indexed Merkle Tree Circuit Structure](#7-indexed-merkle-tree-circuit-structure)
8. [Indexed vs Sparse: Comparison](#8-indexed-vs-sparse-comparison)
9. [Nullifier Sets: The Canonical Application](#9-nullifier-sets-the-canonical-application)
10. [Constraint Cost Summary](#10-constraint-cost-summary)
11. [Implications for ZK Visual](#11-implications-for-zk-visual)

---

## 1. Standard Merkle Trees (Brief Recap)

A standard Merkle tree is a binary tree where each internal node is the hash of its two children, and the root commits to all leaves. Given any leaf value, a **membership proof** (Merkle path) consists of the leaf value plus the sibling node at each level of the tree — enough information for anyone to recompute the root and verify membership.

**Circuit cost:** `depth × hash_cost`

For Poseidon with a 20-level tree:
- `20 × 240 = 4,800 constraints`

This is covered in catalog item 4.1. See [hash-functions.md §3](./hash-functions.md) for Poseidon's constraint cost derivation.

> This section is a pointer, not a full explanation. Refer to catalog item 4.1 and the Merkle path verification gadget in [gadgets.md](./gadgets.md).

---

## 2. The Non-Membership Problem

Standard Merkle trees prove **inclusion** only. There is no efficient membership proof for absence — to prove "value x is NOT in this set," you would need to reveal all leaves (2^depth values), which is completely impractical.

ZK applications regularly need to prove non-membership:

| Application | Non-membership requirement |
|---|---|
| **Nullifier sets** | Prove a transaction has not been double-spent (nullifier is NOT in the spent set) |
| **Revocation lists** | Prove a credential has not been revoked (identifier is NOT in the revoked set) |
| **Allowlists (negative)** | Prove a value is absent from a blocked list |
| **Membership exclusion** | Prove an identity is not in a banned set |

Two circuit patterns efficiently solve non-membership proof:

- **Sparse Merkle Trees** — same circuit as standard Merkle, verifies an empty leaf
- **Indexed Merkle Trees** — embed a sorted linked list, verify a gap between adjacent values

---

## 3. Sparse Merkle Trees

A **sparse Merkle tree** has `2^depth` leaf positions — one position for every possible value in the domain. However, most leaf positions are "empty" (they contain a canonical **zero value**, typically `H("empty")` or simply `0`). Only the values actually inserted into the set occupy leaf positions, forming a sparse population of an enormous address space.

**Key insight:** In a sparse Merkle tree, every value in the domain has a unique, deterministic leaf position — whether or not that value has been inserted. The leaf position for value `x` is derived from `x` itself (e.g., `position = x` or `position = H(x)`).

**Non-membership proof:** Provide the Merkle path to the position where `x` would reside if it were in the set, and show that position contains the zero value.

```
                    root
                   /    \
                  /      \
              node          node
             /    \        /    \
            /      \      /      \
         leaf[0]  leaf[1]  leaf[2]  leaf[3]
           "0"    "alice"   "0"    "bob"

Non-membership proof for "carol":
  - carol's position = H("carol") mod 4 = 2
  - leaf[2] = "0"  (empty)
  - Provide path from leaf[2] to root
  - Verifier recomputes root from the zero leaf
  - Matches the public root → "carol is NOT in the set"
```

The circuit performs the **exact same Merkle path verification** as a standard membership proof — the only difference is that the leaf value is the canonical zero rather than the claimed member value.

---

## 4. Sparse Merkle Tree Circuit Structure

**Public inputs:**
- `root` — the current Merkle tree root (public commitment to the set)

**Private inputs:**
- `x` — the value being proven NOT to be a member (private; its position is derived from it)
- `siblings[]` — the sibling nodes along the path from `x`'s leaf position to the root (private array of `depth` field elements)

**Constraints:**

```
1. Compute the leaf position for x:
   position = H(x)   (or the appropriate position derivation function)

2. Assert that the leaf at that position contains the zero value:
   leaf_value = ZERO_HASH   (constant; this is the key assertion)

3. Verify the Merkle path:
   computed_root = MerkleVerify(ZERO_HASH, position, siblings[])

4. Assert the computed root equals the public root:
   computed_root === root
```

**Total cost:** `depth × hash_cost` — identical to a standard membership proof.

For a 20-level tree with Poseidon: **4,800 constraints** (same as membership).

The "non-membership" is not checked by an additional circuit element — it is encoded in the constant `ZERO_HASH`. The circuit proves "the leaf at x's position is zero" by using `ZERO_HASH` as the leaf input. If x were actually in the set, its leaf would contain a non-zero value, and the Merkle path would hash to a different root — the root check would fail.

---

## 5. Sparse Merkle Tree Tradeoffs

### Advantages

| Advantage | Explanation |
|---|---|
| Simple circuit | Same pattern as standard membership — no additional gadgets |
| Equal cost | Non-membership costs the same as membership (both: `depth × hash_cost`) |
| Composable | Membership and non-membership can use the same Circom template |

### Disadvantages

| Disadvantage | Explanation |
|---|---|
| Expensive tree construction | Inserting n elements requires computing n × depth hashes |
| Static or append-only | Deletion is expensive (must recompute the path to the deleted leaf's position) |
| Large address space | A depth-32 tree has 2^32 positions — must pre-allocate for the full domain |
| Off-chain computation | The tree must be maintained off-chain; the on-chain state is only the root |

### Best Suited For

Sparse Merkle trees work well for **append-only nullifier sets** in private payment protocols:
- Values are inserted (spending creates nullifiers) but never deleted
- The address space matches the nullifier domain (derived from secrets via a hash)
- The circuit cost is predictable and constant

**Used in:** Semaphore (early versions), basic Tornado Cash nullifier sets, many simple ZK applications.

---

## 6. Indexed Merkle Trees (Aztec Pattern)

An **indexed Merkle tree** takes a fundamentally different approach: instead of reserving leaf positions for every possible value, it embeds a **sorted linked list** inside a Merkle tree. Each leaf stores a linked list node pointing to the next-larger value in the set.

### Leaf Structure

Each leaf in an indexed Merkle tree stores a triple:
```
leaf = (value, nextValue, nextIndex)
```

Where:
- `value` — the value stored at this leaf
- `nextValue` — the value of the next-larger element in the sorted list
- `nextIndex` — the leaf index of the next-larger element

The leaves maintain the **sorted invariant**: traversing the linked list (following `nextIndex` pointers) visits all values in ascending order.

### The Non-Membership Proof

To prove that `x` is NOT in the set, find the **adjacent pair** in the sorted list where `x` would fit:

```
Sorted list:  ... → [3] → [7] → [12] → ...

Non-membership proof for x = 5:
  low leaf: value=3, nextValue=7, nextIndex=...

  Proof:
    1. The low leaf IS in the tree (membership proof for the low leaf)
    2. low.value < x     (3 < 5)
    3. x < low.nextValue (5 < 7)

  Together: 3 < 5 < 7, and 3's successor is 7,
  so 5 cannot be in the list without appearing between them.
```

### Visualization: The Sorted Linked List Inside a Merkle Tree

```
                          root
                         /    \
                        /      \
              (3, 7, idx=3)   (12, ∞, idx=0)
              /    \               /    \
             /      \             /      \
       (1,3,idx=2)  (7,12,idx=3) (0,1,idx=1) (3,7,idx=2)
```

The tree is arranged by leaf index (not by value). The sorted order is maintained by the `nextValue`/`nextIndex` pointers — a linked list encoded in the tree leaves.

---

## 7. Indexed Merkle Tree Circuit Structure

**Public inputs:**
- `root` — the current Merkle tree root

**Private inputs:**
- `x` — the value being proven NOT to be a member
- `lowLeaf` — the low leaf triple `(value, nextValue, nextIndex)`
- `lowLeafPath[]` — the Merkle path for the low leaf (array of `depth` siblings)

**Constraints:**

```
1. Verify the low leaf is in the tree (Merkle membership proof):
   lowLeafHash = Poseidon(lowLeaf.value, lowLeaf.nextValue, lowLeaf.nextIndex)
   computed_root = MerkleVerify(lowLeafHash, lowLeafIndex, lowLeafPath[])
   computed_root === root
   Cost: depth × hash_cost

2. Verify x is greater than the low leaf value (LessThan gadget):
   lowLeaf.value < x
   Cost: k + 1 constraints  (k = bit length of values)

3. Verify x is less than the low leaf's next value (LessThan gadget):
   x < lowLeaf.nextValue
   Cost: k + 1 constraints

4. (Implicit) The sorted invariant was established at tree construction time;
   these three checks together prove x is not in the list.
```

**Total cost:**
```
depth × hash_cost + 2 × (k + 1)

For depth=20, Poseidon, k=32-bit values:
  20 × 240 + 2 × 33 = 4,800 + 66 = 4,866 constraints
```

This is only slightly more expensive than the sparse Merkle non-membership proof (4,800 constraints), with two small comparison gadgets added.

---

## 8. Indexed vs Sparse: Comparison

| Property | Sparse Merkle Tree | Indexed Merkle Tree |
|---|---|---|
| **Non-membership circuit cost** | `depth × hash_cost` | `depth × hash_cost + 2·(k+1)` |
| **Membership circuit cost** | `depth × hash_cost` | `depth × hash_cost` |
| **Insertion cost (off-circuit)** | O(depth) hashes — update path from leaf to root | O(depth) hashes — update the low leaf pointer AND the new leaf's path |
| **Supports deletion?** | Yes, expensive (must recompute from zero leaf) | Yes, update the predecessor's `nextValue` pointer |
| **Address space** | 2^depth leaf positions | n leaf positions for n elements |
| **Implementation complexity** | Low | Higher (sorted list maintenance) |
| **Production use** | Semaphore, basic nullifier sets | Aztec's nullifier trees, Aztec's note commitment trees |
| **Best for** | Static/append-only sets | Dynamic sets with frequent insertions and deletions |

---

## 9. Nullifier Sets: The Canonical Application

The **nullifier set pattern** is the standard ZK mechanism for preventing double-spending without a central authority:

1. A user owns a note with a secret `s` and index `i`.
2. A **nullifier** is computed as `N = H(s, i)` — unique to the secret, but reveals nothing about it.
3. To spend the note, the user proves:
   - They know a secret `s` corresponding to the note in the commitment tree (**membership proof**)
   - The nullifier `N` is NOT in the nullifier set (**non-membership proof**)
4. After proof verification, `N` is inserted into the nullifier set.
5. Any future attempt to spend the same note produces the same nullifier `N`, which is now in the nullifier set — the non-membership proof fails.

This pattern appears in:

| Protocol | Non-membership structure | Hash function |
|---|---|---|
| Tornado Cash | Sparse Merkle (via Semaphore-like design) | MiMC / Pedersen |
| Semaphore | Sparse Merkle | Poseidon |
| Zcash Sapling | Incremental Merkle (note: Zcash uses a different construction) | Pedersen |
| Aztec | Indexed Merkle | Pedersen / Blake2 |
| Aztec (current) | Indexed Merkle | Poseidon |

The nullifier set is maintained by the smart contract — it stores only the current root. The insertion of new nullifiers is done by ZK proofs that verify the non-membership and update the root.

---

## 10. Constraint Cost Summary

| Structure | Proof type | Circuit cost formula | Example (20-level, 32-bit values, Poseidon) |
|---|---|---|---|
| Standard Merkle | Membership | `depth × hash_cost` | 20 × 240 = **4,800** constraints |
| Sparse Merkle | Non-membership | `depth × hash_cost` | 20 × 240 = **4,800** constraints |
| Indexed Merkle | Non-membership | `depth × hash_cost + 2·(k+1)` | 20 × 240 + 2×33 = **4,866** constraints |

Notes:
- Poseidon `hash_cost` = 240 constraints per hash (2-to-1 compression; see [hash-functions.md](./hash-functions.md))
- `k` = bit length of the value domain (32-bit values → k=32, so k+1=33)
- Indexed Merkle insertion also requires an update proof: 2 Merkle membership proofs + 1 sorted order verification

---

## 11. Implications for ZK Visual

### Catalog Item 4.2: Sparse Merkle Tree Non-Membership

**Visualization elements:**
- `PipelineVisualizer` for the overall flow: "Value → Hash to position → Check empty leaf → Verify path → Root matches"
- `CircuitVisualizer` for the gadgets: standard Merkle path verification circuit with a constant zero-leaf input node (labeled `ZERO_HASH = H("empty")`)
- Key animation: show the leaf position being derived from the non-member value, then pan to that position in the tree to reveal the empty leaf

**Key insight to convey:** The empty leaf proof uses the exact same circuit as the membership proof. The "non-membership" is encoded in the constant, not in a separate gadget.

### Catalog Item 4.3: Indexed Merkle Tree (Insertion)

**Visualization elements:**
- `CircuitVisualizer` for the circuit gadgets: two LessThan nodes plus the Merkle membership sub-circuit
- Custom animation: the sorted linked list embedded in the tree — show the list as a horizontal chain of nodes overlaid on the tree structure, with arrows following the `nextIndex` pointers
- Insertion animation: show the new element finding its position between two adjacent list nodes, updating the predecessor's `nextValue` pointer, and inserting a new leaf

**Key insight to convey:** The tree stores a sorted linked list. Non-membership is a range proof in the sorted list — "there is no element between 3 and 7, so 5 cannot be in the set."

**Cross-links:**
- Catalog: [catalog.md — items 4.1, 4.2, 4.3](../content/catalog.md)
- Hash functions: [hash-functions.md — Poseidon](./hash-functions.md)
- Gadgets: [gadgets.md — Merkle path verification](./gadgets.md)
- References (Aztec): [aztec.md — indexed Merkle trees](../references/aztec.md)
- Visualization spec: [step-encoding.md](../technical/step-encoding.md)
