import { useState } from 'react';
import type { Circuit } from '../lib/types';

interface Props {
  circuits: Circuit[];
  activeId: string;
  onSelect: (id: string) => void;
}

interface Category {
  id: string;
  label: string;
  items: Circuit[];
}

const CATEGORY_ORDER = [
  { id: '1', label: 'Foundations' },
  { id: '2', label: 'Core Gadgets' },
  { id: '3', label: 'Hash Functions' },
  { id: '4', label: 'Merkle Trees' },
  { id: '5', label: 'Proving Systems' },
  { id: '6', label: 'Advanced' },
  { id: '7', label: 'Applications' },
];

function groupByCategory(circuits: Circuit[]): Category[] {
  return CATEGORY_ORDER.map((cat) => ({
    ...cat,
    items: circuits.filter((c) => c.category === cat.id),
  })).filter((cat) => cat.items.length > 0);
}

export function Sidebar({ circuits, activeId, onSelect }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const categories = groupByCategory(circuits);

  const sidebarContent = (
    <nav className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4">
        <a href="/" className="text-sm font-semibold text-white hover:text-gray-300 transition-colors">
          ZK Visual
        </a>
      </div>

      <div className="flex-1 py-2">
        {categories.map((cat) => (
          <div key={cat.id} className="mb-4">
            <div className="px-4 py-1 text-[10px] font-medium text-gray-600 uppercase tracking-widest">
              {cat.label}
            </div>

            <div className="mt-1">
              {cat.items.map((circuit) => {
                const isActive = circuit.id === activeId;
                return (
                  <button
                    key={circuit.id}
                    onClick={() => {
                      onSelect(circuit.id);
                      setMobileOpen(false);
                    }}
                    className={`
                      w-full text-left px-4 py-1.5 text-sm transition-colors
                      ${isActive
                        ? 'text-white border-l-2 border-yellow-400 pl-[14px]'
                        : 'text-gray-500 hover:text-white border-l-2 border-transparent pl-[14px]'
                      }
                    `}
                  >
                    <span className="truncate block">{circuit.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" className="text-gray-400">
          <rect y="2" width="18" height="1.5" rx="0.75" />
          <rect y="8" width="18" height="1.5" rx="0.75" />
          <rect y="14" width="18" height="1.5" rx="0.75" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-black border-r border-white/5 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-black border-r border-white/5 z-50 lg:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white"
            >
              ✕
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
