# Product Roadmap

> Phased development plan from validation experiment to full platform.
> Each phase has clear entry criteria, deliverables, and exit criteria.

---

## Table of Contents

1. [Phase 0 — Validation](#phase-0--validation)
2. [Phase 1 — MVP](#phase-1--mvp)
3. [Phase 2 — Pattern Library](#phase-2--pattern-library)
4. [Phase 3 — Community & Growth](#phase-3--community--growth)
5. [Phase 4 — Advanced Topics](#phase-4--advanced-topics)
6. [Timeline Overview](#timeline-overview)
7. [Decision Gates](#decision-gates)

---

## Phase 0 — Validation

> **Goal:** Confirm that ZK circuit concepts can be made visually understandable before investing in building a full platform.

### Entry criteria
- None. This is the starting point.

### Deliverable

One standalone visualization: **Bit Decomposition — Naive vs Optimized Range Check**

This is the validation experiment described in [ZK Visualization Approach](../concept/zk-visualization.md#5-the-validation-experiment). It must be built as a real, deployable component — not a mockup or sketch.

**Minimum scope for validation:**
- [ ] The naive range check circuit rendered as a DAG with step animation
- [ ] The optimized bit decomposition circuit rendered as a DAG with step animation
- [ ] Side-by-side constraint count comparison bar chart
- [ ] Step-through playback (forward and backward)
- [ ] Plain-English description at each step
- [ ] Deployed publicly (Vercel)

### Validation criteria

Both conditions must be met to proceed to Phase 1:

| Condition | How to test |
|---|---|
| **Technical accuracy** | 5 ZK developers with professional circuit-writing experience review the visualization and confirm it is correct and not misleading |
| **Educational effectiveness** | 5 developers with no ZK background can correctly explain the key insight (why bit decomposition uses 9 constraints instead of 256) after watching the visualization — without any additional explanation |

### Exit criteria
- Both validation conditions met
- Decision to build Phase 1 confirmed

### If validation fails
- If technical accuracy fails: redesign the visualization at a different abstraction level
- If educational effectiveness fails: the visual grammar is wrong — the circuit DAG rendering approach needs to be reconsidered before scaling up

---

## Phase 1 — MVP

> **Goal:** A deployable platform covering all P0 content (12 visualizations) with the full three-panel layout and core UX.

### Entry criteria
- Phase 0 validation conditions met

### Deliverables

#### Platform infrastructure
- [ ] Full three-panel layout: sidebar, circuit visualizer, code panel
- [ ] Monaco editor integrated with Circom syntax highlighting
- [ ] Playback controls: play, pause, step forward, step backward, speed control (5 levels)
- [ ] Responsive layout (drawer pattern for mobile)
- [ ] Keyboard shortcuts: Space, arrows, Escape
- [ ] Resizable panels
- [ ] URL-based routing per topic
- [ ] SEO: title and meta per topic
- [ ] Static deployment pipeline (Astro + Vercel)

#### Content: 12 P0 visualizations

From the [Content Catalog](../content/catalog.md):

**Category 1 — Foundations (5 visualizations):**
- [ ] 1.1 What is a ZK Proof
- [ ] 1.2 Arithmetic Circuits
- [ ] 1.3 Signals and Constraints (R1CS)
- [ ] 1.4 Public vs. Private Inputs
- [ ] 1.5 Witness Generation

**Category 2 — Core Gadgets (4 visualizations):**
- [ ] 2.1 Bit Decomposition *(already built in Phase 0)*
- [ ] 2.2 Range Check
- [ ] 2.3 Boolean Constraints
- [ ] 2.4 Conditional Selection

**Category 3 — Hash Functions (1 visualization):**
- [ ] 3.1 Why Hash Functions Are Expensive in ZK

**Category 5 — Proving Systems (1 visualization):**
- [ ] 5.1 Proving System Comparison (radar chart)

**Category 4 — Merkle Trees (1 visualization):**
- [ ] 4.1 Merkle Proof in a Circuit

#### Code examples
- [ ] Circom snippets for all applicable P0 visualizations, synchronized with animation steps

### Exit criteria
- All 12 P0 visualizations live
- Platform deployed publicly
- At least 2 ZK community members (researchers, engineers, educators) have reviewed and endorsed the platform
- First public share (Twitter/X, Farcaster, ZK-related newsletter)

---

## Phase 2 — Pattern Library

> **Goal:** Expand to the P1 content tier (10 additional visualizations), add Noir support, and pursue first ecosystem grant.

### Entry criteria
- Phase 1 deployed and validated by community
- At least 500 unique users in the first month post-launch

### Deliverables

#### Content: 10 P1 visualizations

**Category 2 — Core Gadgets (3 visualizations):**
- [ ] 2.5 Equality Check
- [ ] 2.6 Comparison (less-than, greater-than)
- [ ] 2.7 Multiplication with Overflow Check

**Category 3 — Hash Functions (1 visualization):**
- [ ] 3.2 Poseidon Hash (sponge construction)

**Category 4 — Merkle Trees (1 visualization):**
- [ ] 4.2 Merkle Inclusion vs. Exclusion

**Category 6 — Optimization Patterns (3 visualizations):**
- [ ] 6.1 Lookup Arguments (Plookup / LogUp)
- [ ] 6.2 Avoiding Non-Native Field Arithmetic
- [ ] 6.3 Signal Reuse

**Category 7 — Real-World Circuits (2 visualizations):**
- [ ] 7.1 ZK Age Verification
- [ ] 7.2 Private Voting (Semaphore pattern)

#### Platform features
- [ ] Noir language support in Monaco (syntax highlighting + code examples)
- [ ] Constraint counter — live running total shown during animation
- [ ] "Key insight" callout system — highlighted tooltip for the most important step in each visualization
- [ ] Improved mobile experience based on Phase 1 user feedback
- [ ] Open Graph preview images per topic (for social sharing)

#### Ecosystem
- [ ] Apply for first grant (Ethereum Foundation ESP or Starknet Foundation)
- [ ] Create short demo video for each visualization category
- [ ] Publish the content catalog as a public RFC for community feedback

### Exit criteria
- All 22 P0+P1 visualizations live
- First grant application submitted
- 2,000+ monthly active users

---

## Phase 3 — Community & Growth

> **Goal:** Enable community contributions, add Spanish language support, and build the ecosystem relationships needed for long-term sustainability.

### Entry criteria
- Phase 2 complete
- At least one grant awarded or sponsorship confirmed

### Deliverables

#### Community contribution system
- [ ] GitHub-based contribution workflow documented
- [ ] `circuit` object spec published as the contribution interface
- [ ] PR template and review guidelines for new visualizations
- [ ] First community-contributed visualization merged

#### Spanish language support
- [ ] All existing visualizations available in Spanish (`/es/` route)
- [ ] Spanish translations for all UI strings
- [ ] Spanish code comments in Circom/Noir examples

#### Platform features
- [ ] Quiz / comprehension check at the end of each visualization
  - 2–3 multiple choice questions auto-generated from step content
  - No account required to take the quiz
  - Immediate feedback with explanation
- [ ] "Related topics" cross-linking between visualizations
- [ ] Progress indicator (local storage — no account required)
- [ ] Difficulty filter in sidebar (★☆☆ / ★★☆ / ★★★)

#### Ecosystem
- [ ] Reach out to Circom and Noir documentation maintainers for cross-linking
- [ ] Present at one ZK community event (ZKSummit, zkWeek, ETHGlobal workshop)
- [ ] Blog post on the educational approach published on Mirror or Substack

### Exit criteria
- Community contribution pipeline active (at least 2 external contributions)
- Spanish support live
- Referenced from at least one official ecosystem documentation site
- 5,000+ monthly active users

---

## Phase 4 — Advanced Topics

> **Goal:** Cover P2 content, add advanced proving system deep-dives, and establish ZK Visual as the canonical visual reference for the ZK developer community.

### Entry criteria
- Phase 3 complete
- Stable community contribution workflow

### Deliverables

#### Content: P2 visualizations (8 visualizations)

**Category 2 (no P2 items)**

**Category 3 — Hash Functions (1 visualization):**
- [ ] 3.3 MiMC Hash

**Category 4 — Merkle Trees (1 visualization):**
- [ ] 4.3 Indexed Merkle Tree

**Category 5 — Proving Systems (2 visualizations):**
- [ ] 5.2 Groth16 deep-dive pipeline
- [ ] 5.3 PLONK / UltraPlonk arithmetization

**Category 6 — Optimization Patterns (2 visualizations):**
- [ ] 6.4 Reducing Constraints with Custom Gates
- [ ] 6.5 Parallelism and Folding Schemes (Nova)

**Category 7 — Real-World Circuits (2 visualizations):**
- [ ] 7.3 ZK KYC / Identity
- [ ] 7.4 Sudoku Proof

#### Platform features
- [ ] Halo2 (Rust) code examples in the code panel
- [ ] "Build your own" guided mode — user fills in a gadget circuit step by step
- [ ] Embed mode — individual visualizations can be embedded in external docs (iframe API)
- [ ] Print-friendly view for each visualization

### Exit criteria
- Full 30-visualization catalog live
- Embed API used by at least one external documentation site
- Platform referenced in at least one university ZK course

---

## Timeline Overview

```
Month 0       Month 1       Month 2       Month 3
    │─────────────│─────────────│─────────────│
    Phase 0                Phase 1
    (Validation)           (MVP Build + Launch)

Month 3       Month 6       Month 9       Month 12
    │─────────────│─────────────│─────────────│
              Phase 2           Phase 3
              (Pattern Library)  (Community)

Month 12      Month 18      Month 24
    │─────────────────────────│
                Phase 4
              (Advanced Topics)
```

Timeline assumes solo or small team (1–2 developers). Each phase can be compressed with additional contributors.

---

## Decision Gates

Before committing to each phase, the following questions should be answered:

### Gate 0 → 1 (Validation → MVP)
1. Did both validation conditions pass (technical accuracy + educational effectiveness)?
2. Is there enough time to commit to building 11 more visualizations?
3. Is the visual grammar (DAG renderer, color system) working well enough to scale?

### Gate 1 → 2 (MVP → Pattern Library)
1. Is there organic user growth after launch (500+ users in month 1)?
2. Has the ZK community given positive signal?
3. Is grant funding confirmed or in progress?

### Gate 2 → 3 (Pattern Library → Community)
1. Is the codebase clean enough for external contributors to work in?
2. Is there sufficient demand for Spanish-language content specifically?
3. Is a quiz system the right engagement feature, or is something else more valuable?

### Gate 3 → 4 (Community → Advanced Topics)
1. Are community contributions actually coming in, or is the platform primarily built by one team?
2. Do P2 topics have clear demand signals (user feedback, GitHub issues)?
3. Is the embed API genuinely useful or scope creep?

---

*See also: [Content Catalog](../content/catalog.md) · [Architecture](../technical/architecture.md) · [Vision](../concept/vision.md)*
