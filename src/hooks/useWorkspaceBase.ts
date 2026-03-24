/**
 * useWorkspaceBase
 *
 * Hook "pai" que centraliza toda a lógica compartilhada entre
 * ProfessorWorkspacePage e StudentWorkspacePage:
 *
 *  - Sidebar: largura (localStorage), collapsed, resize com mouse
 *  - Chat visibility toggle
 *  - Chat bridge refs (messagesRef / sendMessageRef / addIncomingRef)
 *  - WebSocket listener para mensagens de chat
 *  - Atividade ativa + limpeza de mensagens ao trocar de atividade
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types/chat.types';
import { WorkspaceActivity } from '@/types/workspace.types';

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;

// ─── Opções ───────────────────────────────────────────────────────────────────

export interface UseWorkspaceBaseOptions {
    /** Chave do localStorage para persistir a largura da sidebar */
    sidebarStorageKey: string;
    /** Ref do WebSocket vindo do WSContext (via useWS()) */
    wsRef: React.MutableRefObject<WebSocket | null>;
    /**
     * Sinal de reconexão: quando este valor muda, o listener do WS
     * é re-registrado. O aluno passa `isConnected`; o professor omite.
     */
    reconnectSignal?: boolean;
}

// ─── Retorno ──────────────────────────────────────────────────────────────────

export interface UseWorkspaceBaseReturn {
    // Sidebar
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    bodyRef: React.RefObject<HTMLDivElement>;
    handleSidebarResizeStart: () => void;

    // Chat visibility
    chatVisible: boolean;
    setChatVisible: React.Dispatch<React.SetStateAction<boolean>>;

    // Chat bridge refs — passados para <ChatBridge>
    messagesRef: React.MutableRefObject<ChatMessage[]>;
    sendMessageRef: React.MutableRefObject<(content: string) => void>;
    addIncomingRef: React.MutableRefObject<((data: Record<string, unknown>) => void) | null>;

    // Chat state — passado para <WorkspaceChat>
    messages: ChatMessage[];
    handleMessagesChange: () => void;
    handleSendMessage: (content: string) => void;

    // Atividade ativa
    activeActivity: WorkspaceActivity | null;
    setActiveActivity: React.Dispatch<React.SetStateAction<WorkspaceActivity | null>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkspaceBase({
    sidebarStorageKey,
    wsRef,
    reconnectSignal,
}: UseWorkspaceBaseOptions): UseWorkspaceBaseReturn {

    // ── Sidebar ──────────────────────────────────────────────────────────────
    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        if (typeof window === 'undefined') return 240;
        const raw = window.localStorage.getItem(sidebarStorageKey);
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return 240;
        return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(sidebarStorageKey, String(sidebarWidth));
    }, [sidebarWidth, sidebarStorageKey]);

    const stopResizing = useCallback((): void => {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const handleSidebarResize = useCallback((event: MouseEvent): void => {
        if (!isResizingRef.current) return;
        const containerLeft = bodyRef.current?.getBoundingClientRect().left ?? 0;
        const nextWidth = Math.min(
            SIDEBAR_MAX_WIDTH,
            Math.max(SIDEBAR_MIN_WIDTH, event.clientX - containerLeft),
        );
        setSidebarWidth(nextWidth);
    }, []);

    const handleSidebarResizeStart = useCallback((): void => {
        if (sidebarCollapsed) setSidebarCollapsed(false);
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleSidebarResize);
        window.addEventListener('mouseup', stopResizing);
    }, [sidebarCollapsed, handleSidebarResize, stopResizing]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleSidebarResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [handleSidebarResize, stopResizing]);

    // ── Chat visibility ───────────────────────────────────────────────────────
    const [chatVisible, setChatVisible] = useState(true);

    // ── Chat bridge refs ──────────────────────────────────────────────────────
    const messagesRef = useRef<ChatMessage[]>([]);
    const sendMessageRef = useRef<(content: string) => void>(() => {});
    const addIncomingRef = useRef<((data: Record<string, unknown>) => void) | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const handleMessagesChange = useCallback(() => {
        setMessages([...messagesRef.current]);
    }, []);

    const handleSendMessage = useCallback((content: string) => {
        sendMessageRef.current(content);
    }, []);

    // ── WebSocket listener ────────────────────────────────────────────────────
    // Professor: reconnectSignal=undefined → deps=[undefined] → roda 1x
    // Aluno:     reconnectSignal=isConnected → re-registra ao reconectar
    useEffect(() => {
        if (!wsRef?.current) return;
        const ws = wsRef.current;

        const onMessage = (event: MessageEvent) => {
            let data: Record<string, unknown>;
            try { data = JSON.parse(event.data) as Record<string, unknown>; } catch { return; }
            if (data.type === 'chat' && addIncomingRef.current) {
                addIncomingRef.current(data);
            }
        };

        ws.addEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => { ws.removeEventListener('message', onMessage); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reconnectSignal]);

    // ── Atividade ativa ───────────────────────────────────────────────────────
    const [activeActivity, setActiveActivity] = useState<WorkspaceActivity | null>(null);
    const activeActivityIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (activeActivity?.id === activeActivityIdRef.current) return;
        activeActivityIdRef.current = activeActivity?.id ?? null;
        messagesRef.current = [];
        setMessages([]);
    }, [activeActivity?.id]);

    // ─────────────────────────────────────────────────────────────────────────
    return {
        sidebarWidth,
        sidebarCollapsed,
        setSidebarCollapsed,
        bodyRef,
        handleSidebarResizeStart,
        chatVisible,
        setChatVisible,
        messagesRef,
        sendMessageRef,
        addIncomingRef,
        messages,
        handleMessagesChange,
        handleSendMessage,
        activeActivity,
        setActiveActivity,
    };
}
