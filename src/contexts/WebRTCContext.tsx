// src/contexts/WebRTCContext.tsx
import React, {createContext, useContext, useEffect, useRef, useState} from "react";
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
}

const WebRTCContext = createContext<WebRTCContextValue>({
    send: () => {},
    setOnData: () => {},
    isStudentOnline: false,
    studentHtml: null,
    studentTitle: null,
    studentActivityId: null,
});

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

    const drainQueue = (channel: RTCDataChannel) => {
        sendQueue.current.forEach((data) => {
            channel.send(JSON.stringify(data));
        });
        sendQueue.current = [];
    };

    useEffect(() => {
        if (!isConnected || !workspaceId) return;

        const ws = wsRef?.current;
        if (!ws) return;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.onconnectionstatechange = () => {
            console.log("[WebRTC] connection state:", pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("[WebRTC] ICE state:", pc.iceConnectionState);
        };

        if (role === "student") {
            const channel = pc.createDataChannel("collab");
            channelRef.current = channel;

            channel.onopen = () => {
                console.log("[WebRTC] canal aberto (student)");
                drainQueue(channel);
            };
            channel.onclose = () => console.log("[WebRTC] canal fechado (student)");
            channel.onmessage = (e) => {
                try { onDataRef.current?.(JSON.parse(e.data)); } catch {}
            };
        }

        pc.ondatachannel = (e) => {
            channelRef.current = e.channel;

            e.channel.onopen = () => {
                console.log("[WebRTC] canal aberto (teacher)");
                setIsStudentOnline(true);
                drainQueue(e.channel);
            };

            e.channel.onclose = () => {
                console.log("[WebRTC] canal fechado (teacher)");
                setIsStudentOnline(false);
            };

            e.channel.onmessage = (ev) => {
                try {
                    const data = JSON.parse(ev.data);
                    // mensagem de espelho: { type: "html-update", html: "...", title?: "...", activityId?: "..." }
                    if (data.type === "html-update" && typeof data.html === "string") {
                        setStudentHtml(data.html);
                        if (typeof data.title === "string") setStudentTitle(data.title);
                        if (typeof data.activityId === "string") setStudentActivityId(data.activityId);
                    }
                    onDataRef.current?.(data);
                } catch {}
            };
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                sendWSMessage({
                    type: "webrtc-signal",
                    workspaceId,
                    data: { candidate: e.candidate },
                });
            }
        };

        if (role === "student") {
            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                    sendWSMessage({
                        type: "webrtc-signal",
                        workspaceId,
                        data: { sdp: pc.localDescription },
                    });
                })
                .catch((e) => console.error("[WebRTC] erro ao criar offer:", e));
        }

        const handler = async (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);
                console.log("[WebRTC] mensagem WS recebida:", msg.type, msg);
                if (msg.type !== "webrtc-signal" || msg.workspaceId !== workspaceId) return;

                const { sdp, candidate } = msg.data;
                if (sdp) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    if (sdp.type === "offer") {
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        sendWSMessage({
                            type: "webrtc-signal",
                            workspaceId,
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
            channelRef.current?.close();
            pc.close();
            pcRef.current = null;
            channelRef.current = null;
            sendQueue.current = [];
            setIsStudentOnline(false);
            setStudentHtml(null);
            setStudentTitle(null);
            setStudentActivityId(null);
        };
    }, [isConnected, workspaceId, role]);

    const send = (data: any) => {
        const ch = channelRef.current;
        console.log("[WebRTC] send() chamado, canal:", ch?.readyState);
        if (ch?.readyState === "open") {
            ch.send(JSON.stringify(data));
        } else {
            console.log("[WebRTC] canal não aberto, enfileirando mensagem");
            sendQueue.current.push(data);
        }
    };

    const setOnData = (fn: (data: any) => void) => {
        onDataRef.current = fn;
    };

    return (
        <WebRTCContext.Provider value={{ send, setOnData, isStudentOnline, studentHtml, studentTitle, studentActivityId }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => useContext(WebRTCContext);






