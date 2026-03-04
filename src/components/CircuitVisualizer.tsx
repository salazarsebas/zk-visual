import { useRef, useState, useCallback, type MouseEvent } from 'react';
import type { CircuitGraph, LayoutedCircuitGraph } from '../lib/types';
import { getNodeColor, getStateColor, COLORS } from '../lib/colors';

interface Props {
  graph: CircuitGraph;
  layout: LayoutedCircuitGraph;
  className?: string;
}

interface Tooltip {
  x: number;
  y: number;
  label: string;
  value?: string;
}

export function CircuitVisualizer({ graph, layout, className = '' }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Build a map from node id to current state from the graph prop
  const stateMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const edgeStateMap = new Map(graph.edges.map((e) => [e.id, e]));

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.target === svgRef.current || (e.target as Element).classList.contains('bg-rect')) {
        setDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [dragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  }, []);

  const padding = 40;
  const viewBox = `${-padding} ${-padding} ${layout.width + padding} ${layout.height + padding}`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COLORS.wireActive} />
          </marker>
          <marker
            id="arrowhead-inactive"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COLORS.wireInactive} />
          </marker>
          <marker
            id="arrowhead-satisfied"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={COLORS.wireSatisfied} />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#facc15" floodOpacity="0.3" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        >
          {/* Background for pan interaction */}
          <rect
            className="bg-rect"
            x={-padding}
            y={-padding}
            width={layout.width + padding * 2}
            height={layout.height + padding * 2}
            fill="transparent"
          />

          {/* Edges */}
          {layout.edges.map((layoutEdge) => {
            const edgeState = edgeStateMap.get(layoutEdge.id);
            const state = edgeState?.state ?? layoutEdge.state;
            const value = edgeState?.value ?? layoutEdge.value;
            const color = getStateColor(state);
            const markerId =
              state === 'inactive'
                ? 'arrowhead-inactive'
                : state === 'carrying'
                  ? 'arrowhead-satisfied'
                  : 'arrowhead';

            return (
              <g key={layoutEdge.id}>
                <path
                  d={layoutEdge.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={state === 'inactive' ? 1.5 : 2.5}
                  markerEnd={`url(#${markerId})`}
                  style={{ transition: 'stroke 250ms ease-in-out, stroke-width 250ms ease-in-out' }}
                />
                {value !== undefined && (
                  <EdgeValueLabel edge={layoutEdge} value={value} />
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((layoutNode) => {
            const nodeState = stateMap.get(layoutNode.id);
            const state = nodeState?.state ?? layoutNode.state;
            const isPublic = nodeState?.isPublic ?? layoutNode.isPublic;
            const baseColor = getNodeColor(layoutNode.type, isPublic);
            const isActive = state === 'active' || state === 'satisfied';

            return (
              <g
                key={layoutNode.id}
                transform={`translate(${layoutNode.x}, ${layoutNode.y})`}
                filter={isActive ? 'url(#glow)' : undefined}
                style={{ transition: 'opacity 250ms ease-in-out' }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      label: layoutNode.label,
                      value: nodeState?.state,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <NodeShape
                  type={layoutNode.type}
                  color={baseColor}
                  state={state}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={COLORS.textPrimary}
                  fontSize="12"
                  fontFamily="Geist Mono, monospace"
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {getNodeSymbol(layoutNode.type, layoutNode.label)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-black/90 rounded px-2 py-1 text-xs font-mono text-gray-200 z-10"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {tooltip.label}
          {tooltip.value && (
            <span className="text-gray-500 ml-1">({tooltip.value})</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Node Shapes ─────────────────────────────────────────────────────

function NodeShape({
  type,
  color,
  state,
}: {
  type: string;
  color: string;
  state: string;
}) {
  const strokeColor = getStateColor(state);
  const strokeWidth = state === 'inactive' ? 1.5 : 2.5;
  const fillOpacity = state === 'inactive' ? 0.2 : 0.35;

  switch (type) {
    case 'gate_mul':
    case 'gate_add':
      return (
        <circle
          r={20}
          fill={color}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ transition: 'fill-opacity 250ms ease-in-out, stroke 250ms ease-in-out' }}
        />
      );
    case 'input':
      return (
        <polygon
          points="0,-25 25,0 0,25 -25,0"
          fill={color}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ transition: 'fill-opacity 250ms ease-in-out, stroke 250ms ease-in-out' }}
        />
      );
    case 'output':
      return (
        <>
          <circle
            r={22}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1}
            style={{ transition: 'stroke 250ms ease-in-out' }}
          />
          <circle
            r={18}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ transition: 'fill-opacity 250ms ease-in-out, stroke 250ms ease-in-out' }}
          />
        </>
      );
    case 'gate_const':
      return (
        <rect
          x={-18}
          y={-14}
          width={36}
          height={28}
          rx={4}
          fill={color}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ transition: 'fill-opacity 250ms ease-in-out, stroke 250ms ease-in-out' }}
        />
      );
    default:
      return (
        <circle
          r={20}
          fill={color}
          fillOpacity={fillOpacity}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
  }
}

function getNodeSymbol(type: string, label: string): string {
  switch (type) {
    case 'gate_mul':
      return '×';
    case 'gate_add':
      return '+';
    default:
      return label.length > 4 ? label.slice(0, 4) : label;
  }
}

function EdgeValueLabel({
  edge,
  value,
}: {
  edge: { path: string };
  value: bigint;
}) {
  // Parse midpoint from path (approximate: use first M and last coordinate)
  const pathParts = edge.path.split(/[MC ]/g).filter(Boolean);
  const coords = pathParts
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return !isNaN(x) && !isNaN(y) ? { x, y } : null;
    })
    .filter(Boolean);

  if (coords.length === 0) return null;
  const mid = coords[Math.floor(coords.length / 2)]!;

  return (
    <text
      x={mid.x}
      y={mid.y - 8}
      textAnchor="middle"
      fill={COLORS.textSecondary}
      fontSize="11"
      fontFamily="Geist Mono, monospace"
    >
      {value.toString()}
    </text>
  );
}
