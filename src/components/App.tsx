import { useCallback } from 'react';
import { getAllCircuits, getCircuitById, getCircuitSlug } from '../lib/circuits/index';
import { ZKViz } from './ZKViz';
import { Sidebar } from './Sidebar';

interface Props {
  circuitId: string;
}

export function App({ circuitId }: Props) {
  const allCircuits = getAllCircuits();
  const circuit = getCircuitById(circuitId);

  const handleSelect = useCallback((id: string) => {
    const c = allCircuits.find((c) => c.id === id);
    if (c) {
      window.location.href = `/${getCircuitSlug(c)}`;
    }
  }, [allCircuits]);

  if (!circuit) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Circuit not found
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-black">
      <Sidebar
        circuits={allCircuits}
        activeId={circuit.id}
        onSelect={handleSelect}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <ZKViz circuit={circuit} />
        </div>
      </main>
    </div>
  );
}
