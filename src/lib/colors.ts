export const COLORS = {
  // Wire states
  wireInactive: '#374151',
  wireActive: '#60a5fa',
  wireSatisfied: '#34d399',
  wireViolated: '#f87171',

  // Gate types
  gateAdd: '#a78bfa',
  gateMul: '#f59e0b',
  gateConst: '#6b7280',
  gateInputPublic: '#38bdf8',
  gateInputPrivate: '#fb923c',
  gateOutput: '#fbbf24',
  gateActive: '#ffffff',

  // Constraint states
  constraintOpen: '#374151',
  constraintSatisfied: '#34d399',
  constraintViolated: '#f87171',

  // Comparison views
  costly: '#f87171',
  efficient: '#34d399',
  neutral: '#60a5fa',

  // SplitView panel accents
  panelCostly: '#ef4444',
  panelEfficient: '#22c55e',

  // Knowledge barrier
  barrierPublic: '#38bdf8',
  barrierPrivate: '#fb923c',

  // Background
  bg: '#000000',
  bgPanel: '#0a0a0a',
  bgHover: '#111111',
  border: '#1a1a1a',
  borderActive: '#333333',

  // Text
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Accent
  accent: '#facc15',
} as const;

export function getNodeColor(
  type: string,
  isPublic?: boolean,
): string {
  switch (type) {
    case 'gate_add':
      return COLORS.gateAdd;
    case 'gate_mul':
      return COLORS.gateMul;
    case 'gate_const':
      return COLORS.gateConst;
    case 'input':
      return isPublic ? COLORS.gateInputPublic : COLORS.gateInputPrivate;
    case 'output':
      return COLORS.gateOutput;
    default:
      return COLORS.textMuted;
  }
}

export function getStateColor(
  state: string,
): string {
  switch (state) {
    case 'active':
      return COLORS.wireActive;
    case 'satisfied':
    case 'carrying':
      return COLORS.wireSatisfied;
    case 'violated':
      return COLORS.wireViolated;
    default:
      return COLORS.wireInactive;
  }
}

export function getBarColor(color: 'costly' | 'efficient' | 'neutral'): string {
  return COLORS[color];
}
