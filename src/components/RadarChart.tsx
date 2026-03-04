import { useState } from 'react';
import type { ProvingSystemData } from '../lib/types';

interface Props {
  systems: ProvingSystemData[];
  axes: string[];
  className?: string;
}

const CHART_SIZE = 300;
const CENTER = CHART_SIZE / 2;
const RADIUS = 120;
const LEVELS = 5;

export function RadarChart({ systems, axes, className = '' }: Props) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const angleStep = (2 * Math.PI) / axes.length;

  function getPoint(axisIndex: number, value: number): { x: number; y: number } {
    const angle = axisIndex * angleStep - Math.PI / 2;
    const r = (value / 10) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  }

  function getPolygonPoints(values: Record<string, number>): string {
    return axes
      .map((axis, i) => {
        const val = values[axis] ?? 0;
        const { x, y } = getPoint(i, val);
        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div className={`flex flex-col items-center gap-4 p-4 ${className}`}>
      <svg
        width={CHART_SIZE}
        height={CHART_SIZE}
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
      >
        {/* Grid levels */}
        {Array.from({ length: LEVELS }, (_, i) => {
          const r = ((i + 1) / LEVELS) * RADIUS;
          const points = axes
            .map((_, j) => {
              const angle = j * angleStep - Math.PI / 2;
              return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
            })
            .join(' ');
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="#374151"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const { x, y } = getPoint(i, 10);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="#374151"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Data polygons */}
        {systems.map((system) => {
          const isHighlighted =
            highlighted === null || highlighted === system.name;
          return (
            <polygon
              key={system.name}
              points={getPolygonPoints(system.values)}
              fill={system.color}
              fillOpacity={isHighlighted ? 0.2 : 0.05}
              stroke={system.color}
              strokeWidth={isHighlighted ? 2 : 1}
              strokeOpacity={isHighlighted ? 1 : 0.3}
              style={{ transition: 'all 200ms ease-out' }}
            />
          );
        })}

        {/* Axis labels */}
        {axes.map((axis, i) => {
          const { x, y } = getPoint(i, 12);
          return (
            <text
              key={axis}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#9ca3af"
              fontSize="11"
              fontFamily="Geist, system-ui, sans-serif"
            >
              {axis}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {systems.map((system) => (
          <button
            key={system.name}
            className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-opacity ${
              highlighted === system.name
                ? 'opacity-100'
                : highlighted === null
                  ? 'opacity-80'
                  : 'opacity-40'
            }`}
            onMouseEnter={() => setHighlighted(system.name)}
            onMouseLeave={() => setHighlighted(null)}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: system.color }}
            />
            <span className="text-gray-300">{system.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
