import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const WS_URL = "ws://localhost:8080/api/v1/ws";

interface WSContextValue {
  ws: WebSocket | null;
  sendWSMessage: (msg: any) => void;
  onOpen: (callback: () => void) => void; // ← novo: registra callback de conexão
}

const WSContext = createContext<WSContextValue>({
  ws: null,
  sendWSMessage: () => {},
  onOpen: () => {},
});

export const WSProvider: React.FC<{
  children: React.ReactNode;
  userId?: string;
  workspaceId?: string;
}> = ({ children, userId, workspaceId }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onOpenCallbackRef = useRef<(() => void) | null>(null);

  const createSocket = (uid: string, wsId: string) => {
    const socket = new window.WebSocket(
      `${WS_URL}?userId=${uid}&workspaceId=${wsId}`,
    );
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", userId: uid, workspaceId: wsId }));
      setWs(socket);
      // Dispara o callback de onOpen se estiver registrado
      onOpenCallbackRef.current?.();
    };

    socket.onclose = () => {
      wsRef.current = null;
      setWs(null);

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

    return () => {
      // Não fecha no cleanup — deixa o socket vivo entre re-renders
    };
  }, [userId, workspaceId]);

  const sendWSMessage = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  // Registra um callback que será chamado quando o WS abrir (ou imediatamente se já estiver aberto)
  const onOpen = (callback: () => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      callback(); // já está aberto, dispara imediatamente
    } else {
      onOpenCallbackRef.current = callback;
    }
  };

  return (
    <WSContext.Provider value={{ ws, sendWSMessage, onOpen }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = () => useContext(WSContext);