# ZK Visual — Project Context

## What This Is

Interactive learning platform for ZK circuit visualization — the alg0.dev of zero-knowledge proofs. Users step through ZK circuits frame-by-frame, watching constraints get satisfied, witnesses get assigned, and proof systems do their work.

**Status:** Documentation/planning phase. No code yet. All implementation guides are ready in `docs/technical/`.

## Stack

- **Framework:** Astro + React
- **Language:** TypeScript, bundled with Bun
- **Layout engine:** dagre (for circuit DAG positioning)
- **Code editor:** Monaco Editor (Circom + Noir syntax)
- **Styling:** Tailwind CSS

## Critical Code Conventions

### generateSteps()
- **Pre-computes all animation frames** — zero computation during playback
- Called once at init; returns a flat array of `CircuitStep` snapshots
- See `docs/technical/step-encoding.md` for 4 complete worked examples

### CircuitGraph immutability
- Every step gets a **new** `CircuitGraph` object — never mutate the previous step
- Spread + override pattern: `{ ...prevGraph, nodes: [...] }`

### layoutCircuit()
- Called **once on mount**, positions reused across all steps
- **x/y coordinates are NEVER set inside `generateSteps()`** — always `undefined` there
- See `docs/technical/dagre-layout.md`

### Field arithmetic
- Pedagogy examples use **p = 17** (small prime, fits in head)
- Always use BigInt suffix: `3n`, `255n`, `0n` — never plain numbers for field values
- Witness data lives in TypeScript `const` objects, **never in JSON**
- See `docs/technical/witness-generation.md` for field math utils

## Documentation Map

| What you need | Where |
|---|---|
| How to write `generateSteps()` | `docs/technical/step-encoding.md` (§5–§8 = full examples) |
| dagre integration + `layoutCircuit()` | `docs/technical/dagre-layout.md` |
| Small-field witness + field math | `docs/technical/witness-generation.md` |
| Circom + Noir Monaco grammars | `docs/technical/monaco-grammars.md` |
| SplitView left=naive / right=optimized | `docs/technical/splitview-sync.md` |
| Constraint count tests + R1CS satisfaction | `docs/technical/testing-correctness.md` |
| Canonical constraint counts for gadgets | `docs/zk/gadgets.md` |
| Full ZK knowledge base | `docs/zk/` (9 files) |
| Content catalog (P0/P1/P2 items) | `docs/content/catalog.md` |
| System architecture + CircuitStep pattern | `docs/technical/architecture.md` |

## Content Catalog

12 P0 items defined in `docs/content/catalog.md`. IDs follow `<section>.<item>` format (e.g. `2.1`, `4.2`). Each item has: title, renderer type, constraint count, gadgets involved.

## Constraint Index Convention

- 0-based, **topological order of multiplication gates**
- Satisfied constraints accumulate monotonically — `totalConstraints` never decreases across steps

## Skills Available

| Skill | Invoke | Purpose |
|---|---|---|
| `circom-idioms` | auto (background) | Idiomatic Circom patterns — triggered when reviewing/writing Circom |
| `/circom-check <template>` | manual | Verify constraint count matches `docs/zk/gadgets.md` |
| `/generate-steps <id>` | manual | Scaffold a full `generateSteps()` file for a catalog item |
| `/zk-review <filepath>` | manual | 5-check correctness review before production |
