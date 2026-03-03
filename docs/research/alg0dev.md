# alg0.dev — Deep Analysis

> Reference platform study for the ZK Visual project.
> Source: [alg0.dev](https://www.alg0.dev) · [github.com/midudev/alg0.dev](https://github.com/midudev/alg0.dev)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Internal Architecture](#3-internal-architecture)
4. [Key Features](#4-key-features)
5. [UI/UX Patterns](#5-uiux-patterns)
6. [Unique Differentiators](#6-unique-differentiators)

---

## 1. Overview

**alg0.dev** is a free, browser-based, open-source interactive algorithm visualization and learning platform built by **Miguel Ángel Durán (midudev)** — Google Developer Expert, GitHub Star, and one of the most prominent Spanish-language JavaScript content creators (+500K YouTube subscribers, +577K Instagram followers, +198K Twitch followers).

The platform operates on a **zero-friction philosophy**: no account, no installation, no paywall — users arrive and visualize immediately.

It currently covers **40+ algorithms** across 8 categories and is fully bilingual in English and Spanish.

### Target Audience

| Segment | Primary Need |
|---|---|
| CS students | Understand algorithms beyond static textbook explanations |
| Interview candidates | Visual preparation for FAANG/big-tech technical interviews |
| Spanish-speaking developers | One of the very few high-quality algorithm resources in Spanish |
| Self-taught developers | Building CS fundamentals through visual interaction |
| Educators | A polished, citable visual reference tool for teaching |

The most strategically significant audience segment is the **Spanish-speaking developer market** — 500M+ native speakers with almost no equivalent resources at this quality level.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Meta-framework | Astro | 5.1.7 |
| UI library | React | 19.2.4 |
| Styling | Tailwind CSS v4 | 4.1.18 |
| Code editor | Monaco Editor (`@monaco-editor/react`) | 4.7.0 |
| Typography | Geist (Vercel's font family) | 1.7.0 |
| Language | TypeScript | 97.7% of codebase |
| Build tool | Vite (via Astro) | bundled |
| Package manager | pnpm | — |
| Linting | ESLint 9 + neostandard | — |
| Formatting | Prettier | 3.8.1 |
| Sitemap | @astrojs/sitemap | ^3.7.0 |
| License | MIT | — |

### The Central Architectural Decision: Astro Islands

The Astro meta-framework compiles the application shell (layout, sidebar, routing) to **pure static HTML with zero JavaScript**. Interactive visualization components are "hydrated islands" — React components that only ship JS where interactivity is actually required.

This results in an extremely fast initial load while keeping the heavy Monaco editor and visualization logic isolated to where they are needed. For an educational product, reducing friction on load is a UX-critical decision.

---

## 3. Internal Architecture

### Directory Structure

```
src/
  components/
    AlgoViz.tsx              # Root orchestrator component
    AlgorithmShowcase.tsx    # Algorithm preview grid
    ArrayVisualizer.tsx      # Bar chart renderer (sorting/searching)
    CodePanel.tsx            # Monaco editor with line decorations
    ComplexityChart.tsx      # Big-O complexity curve renderer
    ConceptVisualizer.tsx    # Dispatcher for data structure visualizations
    Controls.tsx             # Playback controls bar (stateless/controlled)
    GraphVisualizer.tsx      # SVG graph renderer
    Header.tsx               # Top navigation
    MatrixVisualizer.tsx     # 2D grid renderer (backtracking/maze)
    Sidebar.tsx              # Algorithm category navigation
    WelcomeScreen.tsx        # Landing / empty state
  hooks/
    useKeyboardShortcuts.ts  # Global keyboard bindings
    usePlayback.ts           # Core playback state machine
    useResizablePanel.ts     # Panel drag-resize logic
  i18n/
    translations.ts          # EN/ES string map
  lib/
    highlight-colors.ts      # 19 semantic highlight color tokens
    types.ts                 # Global TypeScript interfaces
    algorithms/
      index.ts               # Registry and export aggregator
      sorting.ts             # 9 sorting algorithms
      searching.ts           # 4 searching algorithms
      graphs.ts              # 5 graph algorithms
      data-structures.ts     # 6 data structure demos
      dynamic-programming.ts # 3 DP problems
      backtracking.ts        # 3 backtracking problems
      divide-and-conquer.ts  # 1 D&C algorithm
      concepts.ts            # 7 foundational concepts
      shared.ts              # Shared utility functions
  pages/
    index.astro              # Homepage
    [algorithm].astro        # Dynamic per-algorithm route
    es/                      # Spanish locale pages
```

### The Step Snapshot Pattern

The most important architectural decision in alg0.dev. Every algorithm is an object with a `generateSteps(): Step[]` method. The algorithm **does not run live** — it pre-computes all steps as an immutable array before any animation begins. The visualizer simply replays that array.

```typescript
// The universal data contract between algorithms and their visualizers
interface Step {
  array?:         number[]
  highlights?:    Record<number, HighlightType>   // what to highlight and how
  sorted?:        number[]                         // indices in final position
  graph?:         GraphState                       // full graph state snapshot
  matrix?:        MatrixState                      // 2D grid state snapshot
  concept?:       ConceptState                     // abstract concept state
  codeLine?:      number                           // line to highlight in Monaco
  description?:   string                           // human-readable step description
  variables?:     Record<string, string | number | boolean | null>
  consoleOutput?: string[]
}
```

**Why this pattern is the right one:**

- Enables true **bidirectional scrubbing** (step backward) — most competitors cannot do this because they mutate state live
- Completely deterministic playback
- No race conditions in the interval-based auto-advance
- Steps are trivially serializable — a specific step can be referenced by URL index
- The algorithm and the renderer are completely decoupled

### Semantic Color Token System

19 distinct `HighlightType` values, each mapped to a fixed color that is consistent across **all** algorithms in the platform:

```typescript
'comparing'       → #60a5fa  // two elements being compared
'swapped'         → #f87171  // elements that just swapped positions
'sorted'          → #34d399  // element in its final confirmed position
'pivot'           → #f59e0b  // pivot element in quicksort
'found'           → #a78bfa  // target found in search
'visited'         → #6b7280  // node already processed in graph traversal
'path'            → #fbbf24  // optimal path discovered
'current'         → #38bdf8  // element currently under inspection
'minimum'         → #fb923c  // current minimum in selection sort
// ... 10 more semantic tokens
```

This is what separates alg0.dev from amateur visualizers: users learn the color grammar once, and it applies universally across the entire platform. This **is** the design system.

### Monaco Code Synchronization

`CodePanel` uses `editor.deltaDecorations()` to apply the CSS class `algoviz-active-line` to the line number stored in the current step's `codeLine` field. Additionally, variable states are appended as inline comments:

```
// What the user sees in the editor at step N:
for (let i = 0; i < arr.length; i++) {         ← highlighted line
  for (let j = 0; j < arr.length - i - 1; j++) {   // i = 2, j = 0
```

The result is a **visual debugger experience** — not just an animation running next to code, but code and visualization moving in lockstep.

### Playback Hook

`usePlayback` is the single source of truth for all runtime state:

- Selected algorithm
- Pre-computed step array
- Current step index
- Play/pause state
- Speed setting (5 levels: 1500ms → 800ms → 400ms → 150ms → 50ms per step)
- `setInterval` for auto-advance with proper cleanup on unmount

Visualization routing is handled by reading `algorithm.visualization: VisualizationType` and rendering the corresponding component (`'array'` → `ArrayVisualizer`, `'graph'` → `GraphVisualizer`, etc.).

---

## 4. Key Features

| Feature | Description |
|---|---|
| 40+ algorithms | 8 categories: Sorting, Data Structures, Graphs, Searching, DP, Backtracking, D&C, Concepts |
| 4 renderer types | Array bars, Graph (SVG), Matrix (2D grid), Concept (custom) |
| 5 speed levels | 1500ms → 50ms per step |
| Bidirectional scrubbing | Play, pause, step forward, step backward |
| Variable inspector | Real-time variable values annotated inline in Monaco |
| Bilingual (EN/ES) | i18n routing — `/` for English, `/es/` for Spanish |
| Keyboard shortcuts | Space = play/pause, arrows = step, Escape = close mobile drawers |
| Resizable panels | Drag handles with collapse thresholds (sidebar max 260px, code panel max 420px) |
| Responsive layout | 3-panel desktop → bottom-up overlay drawers on mobile |
| Dynamic SEO | Title and meta description updated per algorithm via History API (no full reload) |
| Play button animation | CSS countdown ring synced to selected speed |
| Auto-generated sitemap | Via `@astrojs/sitemap` for both locales |

---

## 5. UI/UX Patterns

### Three-Panel Desktop Layout

```
┌─────────────┬──────────────────────────┬──────────────────┐
│             │                          │                  │
│  Sidebar    │     Visualization        │   Code Panel     │
│             │                          │                  │
│  Category   │  ArrayVisualizer /       │  Monaco Editor   │
│  navigation │  GraphVisualizer /       │                  │
│             │  MatrixVisualizer /      │  Active line     │
│  Algorithm  │  ConceptVisualizer       │  highlighted     │
│  list       │                          │                  │
│             │  Progress bar + counter  │  Variable state  │
│  max 260px  │  Speed + controls        │  annotated       │
│  (drag)     │                          │  max 420px (drag)│
└─────────────┴──────────────────────────┴──────────────────┘
```

### UX Principles Applied

| Principle | Implementation |
|---|---|
| **Progressive disclosure** | Welcome screen with algorithm grid → selection → visualization mode |
| **Consistent visual grammar** | 19 semantic color tokens used identically across all algorithms |
| **Dual-track progress** | Visual progress bar + `step X / Y` counter for spatial context |
| **Developer aesthetic** | Geist font (Vercel), pure `#000000` Monaco background, dark-first design |
| **Mobile drawer pattern** | Sidebar and code panel become bottom-up overlay drawers on small screens |
| **URL-based routing** | Algorithm selection pushes to `window.history` — clean URLs, browser nav works |

---

## 6. Unique Differentiators

| Differentiator | Details |
|---|---|
| **Spanish-first bilingual platform** | Virtually no competitor offers first-class Spanish language support. VisuAlgo has Chinese; nobody else serves Spanish speakers at this quality level. |
| **Step snapshot architecture** | True bidirectional scrubbing. Most competitors cannot step backward because they mutate state live. |
| **Monaco + variable inspector** | The highest standard of code-visualization synchronization in the category — equivalent to a visual debugger. |
| **Abstract concept visualization** | Big-O curves, recursion call stacks, two-pointer, sliding window, memoization. Rarely animated anywhere else. |
| **Astro Islands** | Performance-first architecture. Static HTML shell with hydrated React islands outperforms pure React SPAs. |
| **Organic distribution** | Built by a creator with 500K+ existing audience that already trusts his educational content. |

---

*See also: [Competitive Landscape](./competitive-landscape.md) for how alg0.dev compares against the full field.*
