import { useEffect, useRef } from "react";
import { useWS } from "@/contexts/WSContext";

interface Props {
  workspaceId: string;
  role: "student" | "teacher";
  onData: (data: any) => void;
}

export const useWebRTC = ({ workspaceId, role, onData }: Props) => {
const wsContext = useWS();
const wsRef = wsContext?.wsRef;      // ✅ ref estável
const sendWSMessage = wsContext?.sendWSMessage;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const onDataRef = useRef(onData);
  useEffect(() => { onDataRef.current = onData; }, [onData]);

  useEffect(() => {
    const ws = wsRef?.current;  
    if (!ws || !workspaceId) return;

    console.log(`[WebRTC] iniciando como ${role}`);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // ✅ Log de mudança de estado geral
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] connectionState → ${pc.connectionState}`);
    };

    // ✅ Log de ICE
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] iceConnectionState → ${pc.iceConnectionState}`);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] iceGatheringState → ${pc.iceGatheringState}`);
    };

    if (role === "student") {
      const channel = pc.createDataChannel("collab");
      channelRef.current = channel;

      channel.onopen = () => console.log("[WebRTC] ✅ canal aberto (student)");
      channel.onclose = () => console.log("[WebRTC] canal fechado (student)");
      channel.onerror = (e) => console.error("[WebRTC] erro no canal:", e);
      channel.onmessage = (e) => {
        try { onDataRef.current(JSON.parse(e.data)); } catch {}
      };
    }

    pc.ondatachannel = (e) => {
      console.log("[WebRTC] ✅ canal recebido (teacher)");
      channelRef.current = e.channel;
      e.channel.onopen = () => console.log("[WebRTC] ✅ canal aberto (teacher)");
      e.channel.onmessage = (ev) => {
        try { onDataRef.current(JSON.parse(ev.data)); } catch {}
      };
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("[WebRTC] enviando ICE candidate via WS");
        sendWSMessage?.({
          type: "webrtc-signal",
          workspaceId,
          data: { candidate: e.candidate },
        });
      } else {
        console.log("[WebRTC] ICE gathering completo");
      }
    };

    if (role === "student") {
      console.log("[WebRTC] criando offer...");
      pc.createOffer()
        .then((offer) => {
          console.log("[WebRTC] offer criada, setando local description");
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log("[WebRTC] enviando offer via WS");
          sendWSMessage?.({
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
        if (msg.type !== "webrtc-signal" || msg.workspaceId !== workspaceId) return;

        console.log(`[WebRTC] sinal recebido via WS:`, msg.data.sdp?.type ?? "candidate");

        const { sdp, candidate } = msg.data;

        if (sdp) {
          console.log(`[WebRTC] setando remote description (${sdp.type})`);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          if (sdp.type === "offer") {
            console.log("[WebRTC] criando answer...");
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("[WebRTC] enviando answer via WS");
            sendWSMessage?.({
              type: "webrtc-signal",
              workspaceId,
              data: { sdp: pc.localDescription },
            });
          }
        }

        if (candidate) {
          console.log("[WebRTC] adicionando ICE candidate");
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error("[WebRTC] erro no handler de sinal:", e);
      }
    };

    ws.addEventListener("message", handler);

    return () => {
      ws.removeEventListener("message", handler);
      channelRef.current?.close();
      pc.close();
      pcRef.current = null;
      channelRef.current = null;
    };
  }, [wsRef, workspaceId, role]);

  const send = (data: any) => {
    const ch = channelRef.current;
    if (ch?.readyState === "open") {
      ch.send(JSON.stringify(data));
    } else {
      console.warn("[WebRTC] canal não aberto, estado:", ch?.readyState);
    }
  };

  return { send };
};