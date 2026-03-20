// src/hooks/useSnapshot.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { compressSnapshot, decompressSnapshot } from "@/utils/snapshot";
import api from "@/services/api/client";

interface UseSnapshotProps {
  activityId: string;
  initialHtml?: string;
  onSnapshot: (base64: string) => void;
}

interface UseSnapshotReturn {
  html: string;
  ready: boolean;
  notifyChange: (html: string) => void;
  applyRemoteSnapshot: (base64: string) => void;
}

function fetchSnapshot(
  activityId: string,
  timeoutMs = 3000,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return api
    .get<{ snapshot: string }>(`/folders/activities/${activityId}/snapshot`, {
      signal: controller.signal,
    })
    .then((res) => {
      clearTimeout(timeout);
      return res.data.snapshot;
    })
    .catch(() => null);
}

export const useSnapshot = ({
  activityId,
  initialHtml,
  onSnapshot,
}: UseSnapshotProps): UseSnapshotReturn => {
  const [html, setHtml] = useState<string>(initialHtml ?? "");
  const [ready, setReady] = useState(false);

  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<string>("");

  // ─── Inicialização ao trocar de atividade ────────────────────────────────
  useEffect(() => {
    if (!activityId) {
      setHtml(initialHtml ?? "");
      console.log("[Snapshot] reset síncrono | activityId:", activityId, "| initialHtml length:", (initialHtml ?? "").length);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    setHtml(initialHtml ?? "");
    console.log("[Snapshot] reset síncrono | activityId:", activityId, "| initialHtml length:", (initialHtml ?? "").length);

    fetchSnapshot(activityId).then((snapshot) => {
      if (cancelled) return;

      if (snapshot) {
        try {
          const decompressed = decompressSnapshot(snapshot);
          console.log("[Snapshot] snapshot do servidor | activityId:", activityId, "| length:", decompressed.length);
          setHtml(decompressed);
          lastSnapshotRef.current = snapshot;
          setReady(true);
          return;
        } catch {
          // fallback
        }
      }

      console.log("[Snapshot] sem snapshot, usando initialHtml | activityId:", activityId, "| initialHtml length:", (initialHtml ?? "").length);
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activityId]);

  // ─── Notifica mudança com debounce de 1s ─────────────────────────────────
  const notifyChange = useCallback((nextHtml: string) => {
    setHtml(nextHtml);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      try {
        const base64 = compressSnapshot(nextHtml); // ← síncrono
        if (base64 === lastSnapshotRef.current) return;
        lastSnapshotRef.current = base64;
        onSnapshotRef.current(base64);
      } catch (e) {
        console.error("[Snapshot] Erro ao comprimir:", e);
      }
    }, 0);
  }, []);

  // ─── Aplica snapshot recebido via WS (professor) ─────────────────────────
  const applyRemoteSnapshot = useCallback((base64: string) => {
    try {
      const decompressed = decompressSnapshot(base64); // ← síncrono
      setHtml(decompressed);
    } catch (e) {
      console.error("[Snapshot] Erro ao descomprimir snapshot remoto:", e);
    }
  }, []);

  return { html, ready, notifyChange, applyRemoteSnapshot };
};
