import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";

const WS_URL = "ws://localhost:8080/api/v1/ws";

interface WSContextValue {
  wsRef: React.MutableRefObject<WebSocket | null>; // ✅ ref estável, sem re-render
  sendWSMessage: (msg: any) => void;
  onOpen: (callback: () => void) => void;
  onReconnect: (callback: () => void) => void;
}

const WSContext = createContext<WSContextValue>({
  wsRef: { current: null },
  sendWSMessage: () => {},
  onOpen: () => {},
  onReconnect: () => {},
});

export const WSProvider: React.FC<{
  children: React.ReactNode;
  userId?: string;
  workspaceId?: string;
}> = ({ children, userId, workspaceId }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onOpenCallbackRef = useRef<(() => void) | null>(null);
  const onReconnectCallbackRef = useRef<(() => void) | null>(null);
  const isFirstConnectionRef = useRef(true);

  const createSocket = (uid: string, wsId: string) => {
    const socket = new window.WebSocket(
      `${WS_URL}?userId=${uid}&workspaceId=${wsId}`,
    );
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", userId: uid, workspaceId: wsId }));
      
      // ✅ Sem setWs — sem re-render, sem reinicialização do WebRTC
      onOpenCallbackRef.current?.();

      if (!isFirstConnectionRef.current) {
        onReconnectCallbackRef.current?.();
      }
      isFirstConnectionRef.current = false;
    };

    socket.onclose = () => {
      wsRef.current = null;
      setTimeout(() => {
        if (wsRef.current === null) {
          createSocket(uid, wsId);
        }
      }, 2000);
    };

    socket.onerror = (err) => {
      console.error("[WS] Erro na conexão:", err);
    };
  };

  useEffect(() => {
    if (!userId || !workspaceId) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return;

    createSocket(userId, workspaceId);
  }, [userId, workspaceId]);

  const sendWSMessage = (msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const onOpen = (callback: () => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      callback();
    } else {
      onOpenCallbackRef.current = callback;
    }
  };

  const onReconnect = (callback: () => void) => {
    onReconnectCallbackRef.current = callback;
  };

  return (
    <WSContext.Provider value={{ wsRef, sendWSMessage, onOpen, onReconnect }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = () => useContext(WSContext);