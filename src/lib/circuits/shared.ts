import dagre from '@dagrejs/dagre';
import type {
  CircuitGraph,
  CircuitNode,
  CircuitEdge,
  NodeState,
  EdgeState,
  LayoutedCircuitGraph,
} from '../types';

// ── Field Arithmetic (mod p) ────────────────────────────────────────

export const SMALL_PRIME = 17n;
export const MEDIUM_PRIME = 97n;
export const LARGE_PRIME = 997n;

export function fieldMod(a: bigint, p: bigint): bigint {
  return ((a % p) + p) % p;
}

export function fieldAdd(a: bigint, b: bigint, p: bigint = SMALL_PRIME): bigint {
  return fieldMod(a + b, p);
}

export function fieldSub(a: bigint, b: bigint, p: bigint = SMALL_PRIME): bigint {
  return fieldMod(a - b, p);
}

export function fieldMul(a: bigint, b: bigint, p: bigint = SMALL_PRIME): bigint {
  return fieldMod(a * b, p);
}

export function fieldInv(a: bigint, p: bigint = SMALL_PRIME): bigint {
  let [old_r, r] = [a, p];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error(`${a} has no inverse mod ${p}`);
  return fieldMod(old_s, p);
}

// ── Graph Construction Helpers ──────────────────────────────────────

export function createNode(
  id: string,
  type: CircuitNode['type'],
  label: string,
  isPublic?: boolean,
): CircuitNode {
  return { id, type, label, state: 'inactive', isPublic };
}

export function createEdge(
  id: string,
  from: string,
  to: string,
): CircuitEdge {
  return { id, from, to, state: 'inactive' };
}

export function buildGraph(
  nodes: CircuitNode[],
  edges: CircuitEdge[],
): CircuitGraph {
  return { nodes, edges };
}

// ── Immutable Graph Update Helpers ──────────────────────────────────

export function withNodeState(
  graph: CircuitGraph,
  nodeId: string,
  newState: NodeState,
): CircuitGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, state: newState } : n,
    ),
  };
}

export function withNodeStates(
  graph: CircuitGraph,
  updates: Record<string, NodeState>,
): CircuitGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      updates[n.id] !== undefined ? { ...n, state: updates[n.id] } : n,
    ),
  };
}

export function withEdgeState(
  graph: CircuitGraph,
  edgeId: string,
  newState: EdgeState,
): CircuitGraph {
  return {
    ...graph,
    edges: graph.edges.map((e) =>
      e.id === edgeId ? { ...e, state: newState } : e,
    ),
  };
}

export function withEdgeValue(
  graph: CircuitGraph,
  edgeId: string,
  value: bigint,
): CircuitGraph {
  return {
    ...graph,
    edges: graph.edges.map((e) =>
      e.id === edgeId ? { ...e, state: 'carrying' as EdgeState, value } : e,
    ),
  };
}

export function withEdgeValues(
  graph: CircuitGraph,
  updates: Record<string, bigint>,
): CircuitGraph {
  return {
    ...graph,
    edges: graph.edges.map((e) =>
      updates[e.id] !== undefined
        ? { ...e, state: 'carrying' as EdgeState, value: updates[e.id] }
        : e,
    ),
  };
}

// ── Dagre Layout ────────────────────────────────────────────────────

function getNodeDimensions(type: CircuitNode['type']): {
  width: number;
  height: number;
} {
  switch (type) {
    case 'gate_mul':
    case 'gate_add':
      return { width: 40, height: 40 };
    case 'input':
      return { width: 50, height: 50 };
    case 'output':
      return { width: 44, height: 44 };
    case 'gate_const':
      return { width: 36, height: 28 };
    default:
      return { width: 40, height: 40 };
  }
}

function pointsToSVGPath(
  points: { x: number; y: number }[],
): string {
  if (points.length < 2) return '';
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

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

  for (const node of graph.nodes) {
    const { width, height } = getNodeDimensions(node.type);
    g.setNode(node.id, { label: node.label, width, height });
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to, { label: edge.id });
  }

  dagre.layout(g);

  const nodes = graph.nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, x: pos.x, y: pos.y };
  });

  const edges = graph.edges.map((edge) => {
    const edgeData = g.edge(edge.from, edge.to);
    return { ...edge, path: pointsToSVGPath(edgeData.points) };
  });

  const graphData = g.graph();
  const width = (graphData.width ?? 400) + 40;
  const height = (graphData.height ?? 300) + 40;

  return { nodes, edges, width, height };
}

// ── SplitView Step Padding ──────────────────────────────────────────

export function padSteps<T>(steps: T[], targetLength: number): T[] {
  if (steps.length >= targetLength) return steps;
  const lastStep = steps[steps.length - 1];
  return [...steps, ...Array(targetLength - steps.length).fill(lastStep)];
}
