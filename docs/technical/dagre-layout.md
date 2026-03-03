# Dagre Layout Integration

> Implementation guide — complete integration reference for `@dagrejs/dagre`, from
> installation through extracting SVG-ready `(x, y)` coordinates for the `CircuitVisualizer`.

---

## Table of Contents

1. [Why Dagre and How to Install](#1-why-dagre-and-how-to-install)
2. [The Three-Step Dagre Workflow](#2-the-three-step-dagre-workflow)
3. [Graph Configuration for ZK Circuits](#3-graph-configuration-for-zk-circuits)
4. [Node Registration](#4-node-registration)
5. [Edge Registration](#5-edge-registration)
6. [Running the Layout](#6-running-the-layout)
7. [Extracting Node Positions](#7-extracting-node-positions)
8. [Extracting Edge Paths](#8-extracting-edge-paths)
9. [Handling Fan-Out Correctly](#9-handling-fan-out-correctly)
10. [The `layoutCircuit()` Integration Function](#10-the-layoutcircuit-integration-function)
11. [Common Layout Problems and Fixes](#11-common-layout-problems-and-fixes)

---

## 1. Why Dagre and How to Install

**Why dagre:** `@dagrejs/dagre` implements the Sugiyama layered graph layout algorithm — the correct algorithm for directed acyclic graphs like ZK circuits. It assigns nodes to horizontal layers (ranks) based on topological order, then minimizes edge crossings within each layer. The result is a clean left-to-right layout that matches how ZK circuit diagrams appear in textbooks and papers.

Alternatives:
- **ELK** (Eclipse Layout Kernel) — more powerful but significantly more complex API and a large WASM bundle
- **D3-DAG** — lighter but less stable for production use
- **Manual layout** — only viable for circuits with ≤ 5 nodes; does not scale

`@dagrejs/dagre` is the only actively maintained JS implementation of Sugiyama layout with a stable API and no WASM dependency.

**Installation:**

```sh
bun add @dagrejs/dagre
bun add -d @types/dagre
```

**Import:**

```typescript
import dagre from '@dagrejs/dagre';
```

---

## 2. The Three-Step Dagre Workflow

Dagre layout is a three-step process, all synchronous:

```
Step 1: Create graph object and configure it
         ↓
Step 2: Register all nodes and edges with their pixel dimensions
         ↓
Step 3: Call dagre.layout(g) and read back computed positions
```

All three steps happen **once** per circuit, before any animation begins. The computed positions are stored in component state. The step array animation uses these stored positions — dagre is never called during playback.

---

## 3. Graph Configuration for ZK Circuits

```typescript
import dagre from '@dagrejs/dagre';

// Create the graph object
const g = new dagre.graphlib.Graph({ directed: true, compound: false });

// Configure layout options
g.setGraph({
  rankdir: 'LR',   // Left-to-right layout (inputs on left, output on right)
  ranksep: 80,     // Pixels between layers (columns of nodes)
  nodesep: 40,     // Pixels between nodes in the same layer
  edgesep: 10,     // Minimum pixels between parallel edge paths
  marginx: 20,     // Left/right margin inside the SVG viewport
  marginy: 20,     // Top/bottom margin inside the SVG viewport
});

// Required: set a default edge label (empty string is fine)
g.setDefaultEdgeLabel(() => ({}));
```

**Option rationale:**

| Option | Value | Rationale |
|---|---|---|
| `rankdir: 'LR'` | `'LR'` | ZK circuit convention: signals flow left-to-right, inputs on the left, output on the right |
| `ranksep: 80` | 80px | Enough space for edge labels (signal values) between layers without crowding |
| `nodesep: 40` | 40px | Minimum vertical separation between nodes at the same depth; prevents overlap |
| `edgesep: 10` | 10px | Minimum separation between parallel edges to the same node (fan-out) |
| `marginx/y: 20` | 20px | Small margin so the circuit doesn't touch the SVG edge |

For circuits with ≤ 3 nodes per layer, reduce `nodesep` to 20 to avoid excess whitespace.

---

## 4. Node Registration

Register each `CircuitNode` with its pixel dimensions. Dagre uses these dimensions to compute center coordinates and avoid overlap.

**Standard node dimensions:**

| Node type | Width | Height | Shape |
|---|---|---|---|
| `gate_mul` | 40 | 40 | Circle |
| `gate_add` | 40 | 40 | Circle |
| `input` | 50 | 50 | Diamond |
| `input_private` | 50 | 50 | Diamond (dashed) |
| `output` | 44 | 44 | Double circle |
| `gate_const` | 36 | 28 | Rectangle |

**Registration code:**

```typescript
function getNodeDimensions(type: CircuitNode['type']): { width: number; height: number } {
  switch (type) {
    case 'gate_mul':
    case 'gate_add':    return { width: 40, height: 40 };
    case 'input':       return { width: 50, height: 50 };
    case 'output':      return { width: 44, height: 44 };
    case 'gate_const':  return { width: 36, height: 28 };
    default:            return { width: 40, height: 40 };
  }
}

// Register all nodes
for (const node of graph.nodes) {
  const { width, height } = getNodeDimensions(node.type);
  g.setNode(node.id, {
    label: node.label,  // Used by dagre internally; does not affect SVG output
    width,
    height,
  });
}
```

The `label` in `g.setNode()` is dagre's internal bookkeeping — it does not affect the rendered SVG. The SVG rendering uses `node.label` from the `CircuitGraph` directly.

---

## 5. Edge Registration

```typescript
// Register all edges
for (const edge of graph.edges) {
  g.setEdge(edge.from, edge.to, { label: edge.id });
}
```

**Notes:**
- The `label` stores the edge `id` for later lookup when extracting waypoints.
- Do not set `minlen` (minimum edge length in ranks) unless you encounter specific layout problems — dagre's default is usually correct.
- Edge weights are not needed for ZK circuits (all edges have equal routing priority).
- Dagre handles multi-edges (multiple edges between the same two nodes) automatically.

---

## 6. Running the Layout

```typescript
dagre.layout(g);
```

After this call:
- Every registered node has `g.node(id).x` and `g.node(id).y` — **center coordinates** of the node in pixel space.
- Every registered edge has `g.edge(from, to).points` — an array of `{x, y}` waypoints for the edge path (including the start and end points near the node boundaries).

The layout is synchronous and deterministic. Given the same nodes, edges, and configuration, it always produces the same result.

---

## 7. Extracting Node Positions

```typescript
// After dagre.layout(g):

const layoutedNodes: CircuitNode[] = graph.nodes.map(node => {
  const pos = g.node(node.id);
  return {
    ...node,
    x: pos.x,  // Center x coordinate
    y: pos.y,  // Center y coordinate
  };
});
```

**Coordinate usage in SVG:**

| Node type | SVG usage |
|---|---|
| Circle nodes (gates) | `cx={node.x}`, `cy={node.y}` |
| Diamond nodes (inputs) | Center of diamond at `(node.x, node.y)` |
| Rectangle nodes (constants) | Top-left at `(node.x - width/2, node.y - height/2)` |
| Output double-circle | `cx={node.x}`, `cy={node.y}` |

---

## 8. Extracting Edge Paths

Dagre provides waypoints for each edge as `g.edge(from, to).points[]`. Convert these to an SVG path string using a monotone cubic spline for smooth curves:

```typescript
/**
 * Convert an array of {x, y} waypoints to an SVG cubic Bezier path.
 * Uses a Catmull-Rom to cubic Bezier conversion for smooth curves
 * through all waypoints.
 */
function pointsToSVGPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    // Simple line segment
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Catmull-Rom to cubic Bezier conversion
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];

    // Control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return d.join(' ');
}
```

**Extracting paths for all edges:**

```typescript
const layoutedEdges = graph.edges.map(edge => {
  const edgeData = g.edge(edge.from, edge.to);
  return {
    ...edge,
    path: pointsToSVGPath(edgeData.points),
  };
});
```

**For simple circuits (≤ 8 nodes):** a polyline is acceptable and simpler:

```typescript
function pointsToPolyline(points: { x: number; y: number }[]): string {
  return 'M ' + points.map(p => `${p.x} ${p.y}`).join(' L ');
}
```

---

## 9. Handling Fan-Out Correctly

When one node has multiple outgoing edges (fan-out), dagre creates separate edge entries with their own waypoints, automatically routing each edge to avoid overlaps.

```typescript
// Circuit with fan-out: node 'a' → 'sq' AND 'a' → 'mul'
// Both edges are registered normally:
g.setEdge('a', 'sq', { label: 'edge_a_sq' });
g.setEdge('a', 'mul', { label: 'edge_a_mul' });

// After layout, each edge has its own path:
const pathToSq  = g.edge('a', 'sq').points;   // routes upward
const pathToMul = g.edge('a', 'mul').points;  // routes downward
```

No special treatment is needed. Dagre handles the routing — each edge gets a distinct path. The paths may overlap near the source node (both originate from the same `(x, y)` center point), which is visually acceptable and matches how circuit diagrams typically appear.

**Important:** If the same `(from, to)` pair appears more than once in `graph.edges` (parallel edges in the Circom sense — two separate wires between the same two nodes), dagre does not support true multi-edges by default. Use intermediate phantom nodes to disambiguate:

```typescript
// Two wires from 'a' to the squaring gate (both inputs of a×a):
// Instead of two a→sq edges, route through phantom nodes:
g.setNode('phantom_a1', { label: '', width: 0, height: 0 });
g.setEdge('a', 'phantom_a1', {});
g.setEdge('phantom_a1', 'sq', {});
```

---

## 10. The `layoutCircuit()` Integration Function

Complete TypeScript implementation:

```typescript
import dagre from '@dagrejs/dagre';

interface LayoutedCircuitGraph {
  nodes: (CircuitNode & { x: number; y: number })[];
  edges: (CircuitEdge & { path: string })[];
  width: number;   // Total layout width (for SVG viewBox)
  height: number;  // Total layout height (for SVG viewBox)
}

/**
 * Apply dagre layout to a CircuitGraph.
 * Takes a graph with no x/y coordinates; returns a new graph with all
 * node positions and edge paths populated.
 *
 * Call once when a Circuit is first loaded, before animation begins.
 * Store the result in component state.
 */
export function layoutCircuit(graph: CircuitGraph): LayoutedCircuitGraph {
  const g = new dagre.graphlib.Graph({ directed: true, compound: false });

  g.setGraph({
    rankdir: 'LR',
    ranksep: 80,
    nodesep: 40,
    edgesep: 10,
    marginx: 20,
    marginy: 20,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Register nodes
  for (const node of graph.nodes) {
    const { width, height } = getNodeDimensions(node.type);
    g.setNode(node.id, { label: node.label, width, height });
  }

  // Register edges
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to, { label: edge.id });
  }

  // Run layout
  dagre.layout(g);

  // Extract node positions
  const nodes = graph.nodes.map(node => {
    const pos = g.node(node.id);
    return { ...node, x: pos.x, y: pos.y };
  });

  // Extract edge paths
  const edges = graph.edges.map(edge => {
    const edgeData = g.edge(edge.from, edge.to);
    return {
      ...edge,
      path: pointsToSVGPath(edgeData.points),
    };
  });

  // Compute total dimensions for SVG viewBox
  const graphData = g.graph();
  const width  = (graphData.width  ?? 400) + 40;  // + 2 × marginx
  const height = (graphData.height ?? 300) + 40;  // + 2 × marginy

  return { nodes, edges, width, height };
}
```

**Usage in component:**

```typescript
// In the CircuitVisualizerPage component (or equivalent):
const [layout, setLayout] = useState<LayoutedCircuitGraph | null>(null);

useEffect(() => {
  // Run layout once on mount, using the initial graph
  const initialGraph = circuit.generateSteps()[0].graph!;
  setLayout(layoutCircuit(initialGraph));
}, [circuit]);

// During animation: use layout.nodes and layout.edges for positions,
// but override state/value from the current step's graph.
function getNodeState(nodeId: string): NodeState {
  const stepNode = currentStep.graph?.nodes.find(n => n.id === nodeId);
  return stepNode?.state ?? 'inactive';
}
```

---

## 11. Common Layout Problems and Fixes

| Problem | Cause | Fix |
|---|---|---|
| **Nodes overlapping** | `nodesep` too small for the number of nodes per layer | Increase `nodesep` to 60 or 80 |
| **Edge paths crossing many nodes** | Long-range edges creating visual noise | Try `g.setGraph({ acyclicer: 'greedy' })` before layout |
| **Wide circuit doesn't fit in viewport** | Circuit wider than container | Apply `transform: scale(factor)` to the SVG `<g>` element; compute `factor = containerWidth / layout.width` |
| **Small circuit has excessive whitespace** | Default ranksep/nodesep too large | Reduce: `ranksep: 50, nodesep: 20` for circuits with ≤ 5 nodes |
| **Fan-in edges all overlap** | Multiple edges arriving at the same target node | This is expected behavior for gates with multiple inputs; dagre spaces them at the node boundary |
| **Layout flickers on step change** | `layoutCircuit()` called on every step | Call `layoutCircuit()` once on mount; re-use positions for all subsequent steps |
| **Parallel edges (multi-edge) not rendered** | Dagre conflates `g.edge(A, B)` calls | Use phantom intermediate nodes (see §9) or represent as a single edge with two wire labels |
| **Very deep circuit (> 20 layers)** | Long horizontal layout exceeds container | Switch to `rankdir: 'TB'` (top-to-bottom) for circuits with depth > 15 |
