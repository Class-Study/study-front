import React, { useCallback, useEffect, useRef, useState } from 'react';

interface UseRightPanelResizeOptions {
  storageKey: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

interface UseRightPanelResizeReturn {
  width: number;
  handleResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

export function useRightPanelResize({
  storageKey,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
}: UseRightPanelResizeOptions): UseRightPanelResizeReturn {
  const stored = localStorage.getItem(storageKey);
  const initial = stored ? Math.max(minWidth, Math.min(maxWidth, Number(stored))) : defaultWidth;

  const [width, setWidth] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);

  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX; // drag left = increase width
      const next = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      setWidth(next);
    },
    [minWidth, maxWidth],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      const next = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      localStorage.setItem(storageKey, String(next));
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    [storageKey, minWidth, maxWidth],
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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  return { width, handleResizeStart, isResizing };
}


