import React, { useCallback, useEffect, useRef, useState } from 'react';

interface UseVerticalResizeOptions {
  storageKey: string;
  defaultPercent?: number; // percent of total height for the top section (chat)
  minPercent?: number;
  maxPercent?: number;
}

interface UseVerticalResizeReturn {
  chatPercent: number;
  handleVerticalResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

export function useVerticalResize({
  storageKey,
  defaultPercent = 55,
  minPercent = 20,
  maxPercent = 80,
}: UseVerticalResizeOptions): UseVerticalResizeReturn {
  const stored = localStorage.getItem(storageKey);
  const initial = stored
    ? Math.max(minPercent, Math.min(maxPercent, Number(stored)))
    : defaultPercent;

  const [chatPercent, setChatPercent] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);

  const startYRef = useRef(0);
  const startPercentRef = useRef(chatPercent);
  const containerHeightRef = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (containerHeightRef.current === 0) return;
      const delta = e.clientY - startYRef.current;
      const deltaPercent = (delta / containerHeightRef.current) * 100;
      const next = Math.max(
        minPercent,
        Math.min(maxPercent, startPercentRef.current + deltaPercent),
      );
      setChatPercent(next);
    },
    [minPercent, maxPercent],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (containerHeightRef.current > 0) {
        const delta = e.clientY - startYRef.current;
        const deltaPercent = (delta / containerHeightRef.current) * 100;
        const next = Math.max(
          minPercent,
          Math.min(maxPercent, startPercentRef.current + deltaPercent),
        );
        localStorage.setItem(storageKey, String(next));
      }
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [storageKey, minPercent, maxPercent],
  );

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, onMouseMove, onMouseUp]);

  const handleVerticalResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startYRef.current = e.clientY;
      startPercentRef.current = chatPercent;
      // measure the right panel container height
      const container = (e.currentTarget as HTMLElement).closest('[data-right-panel]') as HTMLElement | null;
      containerHeightRef.current = container ? container.getBoundingClientRect().height : window.innerHeight;
      setIsResizing(true);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [chatPercent],
  );

  return { chatPercent, handleVerticalResizeStart, isResizing };
}


