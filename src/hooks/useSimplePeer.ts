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


    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    if (role === "student") {
      const channel = pc.createDataChannel("collab");
      channelRef.current = channel;

      channel.onopen = () => 
      channel.onclose = () => 
      channel.onerror = (e) => 
      channel.onmessage = (e) => {
        try { onDataRef.current(JSON.parse(e.data)); } catch {}
      };
    }

    pc.ondatachannel = (e) => {
      channelRef.current = e.channel;
      e.channel.onopen = () => 
      e.channel.onmessage = (ev) => {
        try { onDataRef.current(JSON.parse(ev.data)); } catch {}
      };
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWSMessage?.({
          type: "webrtc-signal",
          workspaceId,
          data: { candidate: e.candidate },
        });
      } else {
      }
    };

    if (role === "student") {
      pc.createOffer()
        .then((offer) => {
          return pc.setLocalDescription(offer);
        })
        .then(() => {
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


        const { sdp, candidate } = msg.data;

        if (sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          if (sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWSMessage?.({
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