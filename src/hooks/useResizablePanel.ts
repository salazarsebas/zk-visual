import { useState, useCallback, useRef, useEffect } from 'react';

interface PanelConfig {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey: string;
  collapseThreshold?: number;
}

export function useResizablePanel(config: PanelConfig) {
  const {
    defaultWidth,
    minWidth,
    maxWidth,
    storageKey,
    collapseThreshold = 60,
  } = config;

  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const stored = localStorage.getItem(storageKey);
    return stored ? Number(stored) : defaultWidth;
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDragStart = useCallback(
    (e: React.MouseEvent, direction: 'left' | 'right') => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const delta =
          direction === 'right'
            ? moveEvent.clientX - startX.current
            : startX.current - moveEvent.clientX;
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth.current + delta),
        );

        if (newWidth < collapseThreshold) {
          setIsCollapsed(true);
          setWidth(0);
        } else {
          setIsCollapsed(false);
          setWidth(newWidth);
        }
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, minWidth, maxWidth, collapseThreshold],
  );

  const toggle = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setWidth(defaultWidth);
    } else {
      setIsCollapsed(true);
      setWidth(0);
    }
  }, [isCollapsed, defaultWidth]);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(width));
    }
  }, [width, storageKey]);

  return {
    width: isCollapsed ? 0 : width,
    isCollapsed,
    onDragStart,
    toggle,
  };
}
