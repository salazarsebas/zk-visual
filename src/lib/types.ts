// ── Node & Edge States ──────────────────────────────────────────────

export type NodeState = 'inactive' | 'active' | 'satisfied' | 'violated';
export type EdgeState = 'inactive' | 'active' | 'carrying';

// ── Circuit Graph ───────────────────────────────────────────────────

export interface CircuitNode {
  id: string;
  type: 'input' | 'gate_mul' | 'gate_add' | 'gate_const' | 'output';
  label: string;
  state: NodeState;
  isPublic?: boolean;
  x?: number;
  y?: number;
}

export interface CircuitEdge {
  id: string;
  from: string;
  to: string;
  state: EdgeState;
  value?: bigint;
}

export interface CircuitGraph {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}

// ── Animation Step (core data structure) ────────────────────────────

export interface CodeAnnotation {
  line: number;
  label: string;
}

export interface ComparisonBar {
  label: string;
  value: number;
  maxValue: number;
  color: 'costly' | 'efficient' | 'neutral';
}

export interface ComparisonState {
  bars: ComparisonBar[];
}

export interface PipelineStage {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'complete';
}

export interface PipelineState {
  stages: PipelineStage[];
}

export interface CircuitStep {
  graph?: CircuitGraph;
  comparison?: ComparisonState;
  pipeline?: PipelineState;
  codeLine?: number;
  codeAnnotations?: CodeAnnotation[];
  signals?: Record<string, bigint>;
  activeConstraints?: number[];
  satisfiedConstraints?: number[];
  violatedConstraints?: number[];
  totalConstraints: number;
  description: string;
  insight?: string;
  label?: string;
}

// ── R1CS ─────────────────────────────────────────────────────────────

export interface R1CSRow {
  A: Record<string, bigint>;
  B: Record<string, bigint>;
  C: Record<string, bigint>;
}

// ── Circuit Definition ──────────────────────────────────────────────

export interface Circuit {
  id: string;
  title: string;
  category: string;
  difficulty: 1 | 2 | 3;
  code: string;
  language: 'circom' | 'noir';
  generateSteps(): CircuitStep[];
}

export interface SplitViewCircuit extends Circuit {
  naive: {
    code: string;
    generateSteps(): CircuitStep[];
    label: string;
  };
  optimized: {
    code: string;
    generateSteps(): CircuitStep[];
    label: string;
  };
  syncStrategy: 'hold-last-frame' | 'phase-alignment';
}

// ── Layout ──────────────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

export interface LayoutedCircuitGraph {
  nodes: (CircuitNode & { x: number; y: number })[];
  edges: (CircuitEdge & { path: string })[];
  width: number;
  height: number;
}

// ── Proving System (for radar chart) ────────────────────────────────

export interface ProvingSystemData {
  name: string;
  color: string;
  values: Record<string, number>;
}

// ── Type Guards ─────────────────────────────────────────────────────

export function isSplitViewCircuit(c: Circuit): c is SplitViewCircuit {
  return 'naive' in c && 'optimized' in c;
}
