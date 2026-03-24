// src/contexts/WebRTCContext.tsx
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import {useWS} from "@/contexts/WSContext";

interface WebRTCContextValue {
    send: (data: any) => void;
    setOnData: (fn: (data: any) => void) => void;
    /** true quando o DataChannel com o aluno está aberto (lado professor) */
    isStudentOnline: boolean;
    /** último HTML compactado recebido do aluno via DataChannel */
    studentHtml: string | null;
    /** título da atividade definido pelo aluno */
    studentTitle: string | null;
    /** id da atividade definido pelo aluno */
    studentActivityId: string | null;
    /** posição do cursor do aluno { from, to, userName } */
    studentCursor: { from: number; to: number; userName: string } | null;
    /** métricas de scroll do aluno { scrollTop, scrollHeight, clientHeight } */
    studentScroll: { scrollTop: number; scrollHeight: number; clientHeight: number } | null;
    /** Professor pode chamar para solicitar reconexão com o aluno */
    requestReconnect: () => void;
    /** true enquanto uma tentativa de reconexão está em andamento */
    isReconnecting: boolean;
    /** true quando o DataChannel do aluno está aberto (lado aluno) */
    isChannelOpen: boolean;
}

const WebRTCContext = createContext<WebRTCContextValue>({
    send: () => {},
    setOnData: () => {},
    isStudentOnline: false,
    studentHtml: null,
    studentTitle: null,
    studentActivityId: null,
    studentCursor: null,
    studentScroll: null,
    requestReconnect: () => {},
    isReconnecting: false,
    isChannelOpen: false,
});

/** Intervalo de polling automático (ms) — professor tenta reconectar a cada 15s se aluno offline */
const AUTO_RECONNECT_INTERVAL = 15_000;

export const WebRTCProvider: React.FC<{
    children: React.ReactNode;
    workspaceId: string | null;
    role: "student" | "teacher";
}> = ({children, workspaceId, role}) => {
    const { wsRef, sendWSMessage, isConnected } = useWS();

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<RTCDataChannel | null>(null);
    const onDataRef = useRef<((data: any) => void) | null>(null);
    const sendQueue = useRef<any[]>([]);

    const [isStudentOnline, setIsStudentOnline] = useState(false);
    const [studentHtml, setStudentHtml] = useState<string | null>(null);
    const [studentTitle, setStudentTitle] = useState<string | null>(null);
    const [studentActivityId, setStudentActivityId] = useState<string | null>(null);
    const [studentCursor, setStudentCursor] = useState<{ from: number; to: number; userName: string } | null>(null);
    const [studentScroll, setStudentScroll] = useState<{ scrollTop: number; scrollHeight: number; clientHeight: number } | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [isChannelOpen, setIsChannelOpen] = useState(false);

    // Ref para saber se o aluno está online (evita stale closures nos timers)
    const isStudentOnlineRef = useRef(false);
    isStudentOnlineRef.current = isStudentOnline;

    const workspaceIdRef = useRef(workspaceId);
    workspaceIdRef.current = workspaceId;

    const drainQueue = (channel: RTCDataChannel) => {
        sendQueue.current.forEach((data) => {
            channel.send(JSON.stringify(data));
        });
        sendQueue.current = [];
    };

    // ── Limpa a conexão WebRTC existente ──────────────────────────────────────
    const cleanupPeer = useCallback(() => {
        channelRef.current?.close();
        pcRef.current?.close();
        pcRef.current = null;
        channelRef.current = null;
        sendQueue.current = [];
    }, []);

    // ── Cria uma nova RTCPeerConnection ───────────────────────────────────────
    const createPeer = useCallback(() => {
        if (!workspaceIdRef.current) return null;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] connection state:", pc.connectionState);
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                setIsStudentOnline(false);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE state:", pc.iceConnectionState);
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                sendWSMessage({
                    type: "webrtc-signal",
                    workspaceId: workspaceIdRef.current,
                    data: { candidate: e.candidate },
                });
            }
        };

        return pc;
    }, [sendWSMessage]);

    // ── Configura handlers do DataChannel no lado do professor ────────────────
    const setupTeacherChannel = useCallback((channel: RTCDataChannel) => {
        channelRef.current = channel;

        channel.onopen = () => {
            console.log("[WebRTC] canal aberto (teacher)");
            setIsStudentOnline(true);
            setIsReconnecting(false);
            drainQueue(channel);
        };

        channel.onclose = () => {
            console.log("[WebRTC] canal fechado (teacher)");
            setIsStudentOnline(false);
        };

        channel.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data);
                if (data.type === "html-update" && typeof data.html === "string") {
                    setStudentHtml(data.html);
                    if (typeof data.title === "string") setStudentTitle(data.title);
                    if (typeof data.activityId === "string") setStudentActivityId(data.activityId);
                }
                if (data.type === "cursor-update" && typeof data.from === "number") {
                    setStudentCursor({ from: data.from, to: data.to ?? data.from, userName: data.userName ?? "Aluno" });
                }
                if (data.type === "scroll-update" && typeof data.scrollTop === "number") {
                    setStudentScroll({ scrollTop: data.scrollTop, scrollHeight: data.scrollHeight ?? 0, clientHeight: data.clientHeight ?? 0 });
                }
                onDataRef.current?.(data);
            } catch {}
        };
    }, []);

    // ── Configura handlers do DataChannel no lado do aluno ────────────────────
    const setupStudentChannel = useCallback((channel: RTCDataChannel) => {
        channelRef.current = channel;

        channel.onopen = () => {
            console.log("[WebRTC] canal aberto (student)");
            setIsChannelOpen(true);
            drainQueue(channel);
        };

        channel.onclose = () => {
            console.log("[WebRTC] canal fechado (student)");
            setIsChannelOpen(false);
        };

        channel.onmessage = (e) => {
            try { onDataRef.current?.(JSON.parse(e.data)); } catch {}
        };
    }, []);

    // ── Aluno: cria offer e envia ─────────────────────────────────────────────
    const createAndSendOffer = useCallback(async (pc: RTCPeerConnection) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendWSMessage({
                type: "webrtc-signal",
                workspaceId: workspaceIdRef.current,
                data: { sdp: pc.localDescription },
            });
            console.log("[WebRTC] offer enviado");
        } catch (e) {
            console.error("[WebRTC] erro ao criar offer:", e);
        }
    }, [sendWSMessage]);

    // ── Inicializa conexão (chamado no mount e em reconexões) ─────────────────
    const initConnection = useCallback(() => {
        const ws = wsRef?.current;
        if (!ws || !workspaceIdRef.current) return;

        // Limpa conexão anterior
        cleanupPeer();

        const pc = createPeer();
        if (!pc) return;

        if (role === "student") {
            // Aluno cria o DataChannel e o offer
            const channel = pc.createDataChannel("collab");
            setupStudentChannel(channel);

            pc.ondatachannel = (e) => {
                // Caso receba data channel reverso (não esperado, mas seguro)
                setupStudentChannel(e.channel);
            };

            createAndSendOffer(pc);
        } else {
            // Professor espera receber DataChannel do aluno
            pc.ondatachannel = (e) => {
                setupTeacherChannel(e.channel);
            };
        }
    }, [role, cleanupPeer, createPeer, setupStudentChannel, setupTeacherChannel, createAndSendOffer, wsRef]);

    // ── Efeito principal: setup WS listener + inicialização ───────────────────
    useEffect(() => {
        if (!isConnected || !workspaceId) return;

        const ws = wsRef?.current;
        if (!ws) return;

        // Inicializa a conexão
        initConnection();

        // Handler para sinais WebRTC vindos pelo WS
        const handler = async (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);

                // Só processa mensagens webrtc-signal do mesmo workspace
                if (msg.type !== "webrtc-signal" || msg.workspaceId !== workspaceIdRef.current) return;

                const { sdp, candidate, requestOffer } = msg.data;

                // ── Professor pede reconexão → aluno re-cria offer ────────────
                if (requestOffer && role === "student") {
                    console.log("[WebRTC] Professor solicitou reconexão, re-criando offer...");
                    cleanupPeer();
                    const newPc = createPeer();
                    if (!newPc) return;

                    const channel = newPc.createDataChannel("collab");
                    setupStudentChannel(channel);
                    newPc.ondatachannel = (e) => setupStudentChannel(e.channel);

                    await createAndSendOffer(newPc);
                    return;
                }

                // ── Sinal WebRTC normal (offer/answer/candidate) ──────────────
                const pc = pcRef.current;
                if (!pc) return;

                if (sdp) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    if (sdp.type === "offer") {
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        sendWSMessage({
                            type: "webrtc-signal",
                            workspaceId: workspaceIdRef.current,
                            data: { sdp: pc.localDescription },
                        });
                    }
                }
                if (candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (e) {
                console.error("[WebRTC] erro no handler:", e);
            }
        };

        ws.addEventListener("message", handler);

        return () => {
            ws.removeEventListener("message", handler);
            cleanupPeer();
            setIsStudentOnline(false);
            setStudentHtml(null);
            setStudentTitle(null);
            setStudentActivityId(null);
            setStudentCursor(null);
            setStudentScroll(null);
            setIsReconnecting(false);
        };
    }, [isConnected, workspaceId, role]);

    // ── Professor: auto-retry periódico quando aluno está offline ─────────────
    useEffect(() => {
        if (role !== "teacher" || !isConnected || !workspaceId) return;

        const intervalId = setInterval(() => {
            if (!isStudentOnlineRef.current && wsRef?.current?.readyState === WebSocket.OPEN) {
                console.log("[WebRTC] Auto-retry: solicitando reconexão ao aluno...");
                sendWSMessage({
                    type: "webrtc-signal",
                    workspaceId: workspaceIdRef.current,
                    data: { requestOffer: true },
                });
            }
        }, AUTO_RECONNECT_INTERVAL);

        return () => clearInterval(intervalId);
    }, [role, isConnected, workspaceId, sendWSMessage, wsRef]);

    // ── Professor: botão manual de reconexão ──────────────────────────────────
    const requestReconnect = useCallback(() => {
        if (role !== "teacher") return;
        if (!wsRef?.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        console.log("[WebRTC] Professor solicitou reconexão manual");
        setIsReconnecting(true);

        // Limpa peer antigo e cria novo para receber o offer fresco
        cleanupPeer();
        const pc = createPeer();
        if (pc) {
            pc.ondatachannel = (e) => setupTeacherChannel(e.channel);
        }

        // Pede ao aluno para re-enviar offer
        sendWSMessage({
            type: "webrtc-signal",
            workspaceId: workspaceIdRef.current,
            data: { requestOffer: true },
        });

        // Timeout: se não reconectar em 10s, para de mostrar "reconectando"
        setTimeout(() => {
            setIsReconnecting((prev) => {
                if (prev && !isStudentOnlineRef.current) {
                    console.log("[WebRTC] Timeout de reconexão");
                    return false;
                }
                return prev;
            });
        }, 10_000);
    }, [role, wsRef, sendWSMessage, cleanupPeer, createPeer, setupTeacherChannel]);

    const send = (data: any) => {
        const ch = channelRef.current;
        if (ch?.readyState === "open") {
            ch.send(JSON.stringify(data));
        } else {
            sendQueue.current.push(data);
        }
    };

    const setOnData = (fn: (data: any) => void) => {
        onDataRef.current = fn;
    };

    return (
        <WebRTCContext.Provider value={{
            send,
            setOnData,
            isStudentOnline,
            studentHtml,
            studentTitle,
            studentActivityId,
            studentCursor,
            studentScroll,
            requestReconnect,
            isReconnecting,
            isChannelOpen,
        }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => useContext(WebRTCContext);

