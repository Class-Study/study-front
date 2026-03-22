// src/contexts/WebRTCContext.tsx
import React, {createContext, useContext, useEffect, useRef} from "react";
import {useWS} from "@/contexts/WSContext";

interface WebRTCContextValue {
    send: (data: any) => void;
    setOnData: (fn: (data: any) => void) => void; // ← adiciona isso
}

const WebRTCContext = createContext<WebRTCContextValue>({
    send: () => {},
    setOnData: () => {},
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
                drainQueue(e.channel);
            };
            e.channel.onclose = () => console.log("[WebRTC] canal fechado (teacher)");
            e.channel.onmessage = (ev) => {
                try { onDataRef.current?.(JSON.parse(ev.data)); } catch {}
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
        <WebRTCContext.Provider value={{ send, setOnData }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => useContext(WebRTCContext);