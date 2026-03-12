<p align="center">
  <img src="public/learnzk.png" alt="ZK Visual logo" width="160" />
  <br /><br />
  <strong>ZK Visual</strong>
  <br />
  <em>Step through zero-knowledge circuits, frame by frame.</em>
  <br /><br />
  <a href="https://www.learn-zk.com/">learn-zk.com</a>
</p>

---

ZK Visual is an interactive learning platform for zero-knowledge proof circuits. It lets you watch constraints get satisfied, witness values propagate, and proof systems do their work, all rendered as step-by-step animations you can scrub through like a video.

## Why This Exists

ZK circuit design is hard to learn from text alone. Existing resources explain the math but rarely show what happens inside a circuit during proving. ZK Visual fills that gap. Every animation frame is a pre-computed snapshot of the circuit state, so you can pause, rewind, and inspect any moment in the computation.

## What You Can Explore

| Category | Topics | What You See |
|---|---|---|
| **Foundations** | What is a ZK proof, arithmetic circuits, signals & constraints, public vs. private inputs, witness generation | Pipeline diagrams, DAG animations with value propagation |
| **Core Gadgets** | Bit decomposition, range checks, boolean constraints, conditional selection (MUX) | Side-by-side naive vs. optimized circuits showing constraint reduction |
| **Hash Functions** | Keccak-256 vs. SHA-256 vs. MiMC vs. Poseidon | Constraint cost comparison charts |
| **Merkle Trees** | Merkle inclusion proofs in ZK | Circuit DAG with path hashing animation |
| **Proving Systems** | Groth16 vs. PLONK vs. Halo2 vs. STARKs | Radar chart comparing proof size, verification time, setup, and recursion |

## Architecture

```
Astro (static shell)
├── React islands (interactive visualizations)
│   ├── CircuitVisualizer    SVG DAG with pan/zoom
│   ├── CostComparison       horizontal bar charts
│   ├── PipelineVisualizer   prover/verifier flow diagrams
│   ├── RadarChart           multi-axis proving system comparison
│   └── SplitView            dual-pane before/after optimization
├── Monaco Editor            Circom & Noir syntax highlighting
└── dagre                    automatic left-to-right circuit layout
```

**Key design decision:** all animation frames are pre-computed by `generateSteps()` at mount time. Playback is just indexing into an immutable array. No computation during animation, O(1) random access to any frame, deterministic constraint counts.

## Tech Stack

- **Astro** + **React 19** for static pages with hydrated interactive islands
- **TypeScript** (strict mode) for type-safe circuit data structures
- **Tailwind CSS v4** for styling
- **dagre** for topological DAG layout of circuit graphs
- **Monaco Editor** for code display with Circom/Noir grammar support
- **SVG rendering**, accessible and CSS-animatable, no Canvas/WebGL
- **Bun** for package management, dev server, and test runner

## Getting Started

```bash
# Clone the repository
git clone https://github.com/salazar/zk-visual.git
cd zk-visual

# Install dependencies
bun install

# Start the dev server
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

The dev server starts at `http://localhost:4321`.

## Project Structure

```
src/
├── components/          # React components (visualizers, controls, sidebar)
├── hooks/               # usePlayback, useKeyboardShortcuts
├── lib/
│   ├── circuits/        # Circuit definitions & generateSteps() implementations
│   │   ├── shared.ts    # Field arithmetic, graph builders, layout
│   │   ├── foundations.ts
│   │   ├── gadgets.ts
│   │   ├── hashes.ts
│   │   ├── merkle.ts
│   │   └── proving-systems.ts
│   ├── types.ts         # All TypeScript interfaces
│   └── colors.ts        # Design system color tokens
├── pages/
│   ├── index.astro      # Landing page
│   └── [topic].astro    # Dynamic circuit routes
└── styles/
    └── global.css

docs/
├── technical/           # Implementation guides (step encoding, dagre, witness gen)
├── zk/                  # ZK knowledge base (R1CS, gadgets, hashes, proving systems)
├── content/catalog.md   # Full 30-item content catalog with priorities
└── roadmap/             # Development phases
```

## How It Works

Each visualization topic is a `Circuit` object that defines:

1. **Metadata**: title, category, difficulty, language (Circom or Noir)
2. **Source code**: displayed in the Monaco editor with line highlighting
3. **`generateSteps()`**: returns an array of `CircuitStep` snapshots

A `CircuitStep` captures the full state at one moment: which nodes are active, which constraints are satisfied, current wire values, the code line being executed, and a human-readable description. The playback hook simply walks through this array.

Field arithmetic uses **p = 17** (a small prime where every calculation fits in your head) with BigInt throughout: `3n`, `255n`, `0n`.

## Controls

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `Arrow Right` | Step forward |
| `Arrow Left` | Step back |
| Speed buttons | 0.5x, 1x, 2x, 3x, 5x playback speed |

## Roadmap

- **Phase 1** (current): 12 core visualizations, foundational architecture
- **Phase 2**: 10 additional topics (gadget deep dives, real-world circuits like age verification and private voting)
- **Phase 3**: 8 advanced topics (custom gates, folding schemes), i18n, accessibility
- **Phase 4**: Live Circom compilation via WebAssembly, interactive constraint editor

## License

MIT
