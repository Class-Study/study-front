import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// URL do WebSocket do backend (ajuste conforme necessário)
const WS_URL = 'ws://localhost:8080/api/v1/ws';

interface WSContextValue {
  ws: WebSocket | null;
  sendWSMessage: (msg: any) => void;
}

const WSContext = createContext<WSContextValue>({
  ws: null,
  sendWSMessage: () => {},
});

export const WSProvider: React.FC<{
  children: React.ReactNode;
  userId?: string;
  workspaceId?: string;
}> = ({ children, userId, workspaceId }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId || !workspaceId) return; // aguarda ter os dois antes de conectar

    const socket = new window.WebSocket(
      `${WS_URL}?userId=${userId}&workspaceId=${workspaceId}`,
    );
    wsRef.current = socket;
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", userId, workspaceId }));
    };

    socket.onclose = () => setWs(null);

    return () => socket.close();
  }, [userId, workspaceId]);

  const sendWSMessage = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return (
    <WSContext.Provider value={{ ws, sendWSMessage }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = () => useContext(WSContext);
