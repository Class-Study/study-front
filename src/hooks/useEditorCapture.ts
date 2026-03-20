import { useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";

interface UseEditorCaptureProps {
  elementRef: React.RefObject<HTMLElement>;
  enabled: boolean;
  intervalMs?: number;
  onStream: (stream: MediaStream) => void;
}

export function useEditorCapture({
  elementRef,
  enabled,
  intervalMs = 100,
  onStream,
}: UseEditorCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStreamRef = useRef(onStream);
  onStreamRef.current = onStream;

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    // Cria canvas oculto uma vez
    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.style.display = "none";
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
    }

    // Cria stream do canvas uma vez
    if (!streamRef.current) {
      // @ts-ignore — captureStream é suportado em todos os browsers modernos
      const stream = canvasRef.current.captureStream(10); // 10fps
      streamRef.current = stream;
      onStreamRef.current(stream);
    }

    // Loop de captura
    intervalRef.current = setInterval(async () => {
      const el = elementRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas) return;

      try {
        const captured = await html2canvas(el, {
          canvas,
          useCORS: true,
          logging: false,
          scale: 1,
        });
        // html2canvas já desenhou no canvas — captureStream pega automaticamente
      } catch {
        // silencia erros de captura
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
      streamRef.current = null;
    };
  }, [enabled, intervalMs]);
}

