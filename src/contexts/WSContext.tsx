import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

// 1. VITE_WS_URL explícito (ex: ws://localhost:8080)
// 2. Derivado do VITE_API_URL (http://localhost:8080/api/v1 → ws://localhost:8080)
// 3. Fallback: mesmo host do front (só funciona com proxy/produção)
const WS_BASE =
    import.meta.env.VITE_WS_URL ??
    import.meta.env.VITE_API_URL?.replace(/^https/, 'wss').replace(/^http/, 'ws').replace(/\/api\/.*$/, '') ??
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
const WS_URL = `${WS_BASE}/api/v1/ws`;

interface WSContextValue {
    wsRef: React.MutableRefObject<WebSocket | null>;
    isConnected: boolean;
    sendWSMessage: (msg: Record<string, unknown>) => void;
    onOpen: (callback: () => void) => void;
    onReconnect: (callback: () => void) => void;
}

const WSContext = createContext<WSContextValue>({
    wsRef: { current: null },
    isConnected: false,
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
    const [isConnected, setIsConnected] = useState(false);
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

            setIsConnected(true); // ✅ dispara re-render nos componentes que usam isConnected
            onOpenCallbackRef.current?.();

            if (!isFirstConnectionRef.current) {
                onReconnectCallbackRef.current?.();
            }
            isFirstConnectionRef.current = false;
        };

        socket.onclose = () => {
            wsRef.current = null;
            setIsConnected(false); // ✅ atualiza estado reativo
            setTimeout(() => {
                if (wsRef.current === null) {
                    createSocket(uid, wsId);
                }
            }, 2000);
        };

        socket.onerror = (err) => {
            console.error("[WSContext] Erro na conexão:", err);
        };
    };

    useEffect(() => {
        if (!userId || !workspaceId) {
            return;
        }

        if (
            wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING
        ) {
            return;
        }

        createSocket(userId, workspaceId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, workspaceId]);

    const sendWSMessage = (msg: Record<string, unknown>) => {
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
        <WSContext.Provider value={{ wsRef, isConnected, sendWSMessage, onOpen, onReconnect }}>
            {children}
        </WSContext.Provider>
    );
};

export const useWS = () => useContext(WSContext);