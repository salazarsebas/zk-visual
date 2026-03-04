import type { CodeAnnotation } from '../lib/types';
import { CodePanel } from './CodePanel';
import { COLORS } from '../lib/colors';

interface Props {
  naiveCode: string;
  optimizedCode: string;
  naiveLanguage: 'circom' | 'noir';
  optimizedLanguage: 'circom' | 'noir';
  naiveActiveLine?: number;
  optimizedActiveLine?: number;
  naiveAnnotations?: CodeAnnotation[];
  optimizedAnnotations?: CodeAnnotation[];
  naiveLabel?: string;
  optimizedLabel?: string;
  className?: string;
}

export function SplitCodePanel({
  naiveCode,
  optimizedCode,
  naiveLanguage,
  optimizedLanguage,
  naiveActiveLine,
  optimizedActiveLine,
  naiveAnnotations,
  optimizedAnnotations,
  naiveLabel = 'Naive',
  optimizedLabel = 'Optimized',
  className = '',
}: Props) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 min-h-0 border-b border-white/5">
        <div
          className="px-3 py-1.5 text-[10px] font-medium border-b border-white/5"
          style={{ color: COLORS.panelCostly }}
        >
          {naiveLabel}
        </div>
        <div className="h-[calc(100%-28px)]">
          <CodePanel
            code={naiveCode}
            language={naiveLanguage}
            activeLine={naiveActiveLine}
            annotations={naiveAnnotations}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <div
          className="px-3 py-1.5 text-[10px] font-medium border-b border-white/5"
          style={{ color: COLORS.panelEfficient }}
        >
          {optimizedLabel}
        </div>
        <div className="h-[calc(100%-28px)]">
          <CodePanel
            code={optimizedCode}
            language={optimizedLanguage}
            activeLine={optimizedActiveLine}
            annotations={optimizedAnnotations}
          />
        </div>
      </div>
    </div>
  );
}
