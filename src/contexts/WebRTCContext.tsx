// src/contexts/WebRTCContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWS } from "./WSContext";

interface WebRTCContextValue {
  send: (data: any) => void;
  connected: boolean; // ✅ expõe estado de conexão
}

const WebRTCContext = createContext<WebRTCContextValue>({
  send: () => {},
  connected: false,
});

export const WebRTCProvider: React.FC<{
  children: React.ReactNode;
  workspaceId: string;
  role: "student" | "teacher";
  onData: (data: any) => void;
}> = ({ children, workspaceId, role, onData }) => {
  const { wsRef, sendWSMessage } = useWS();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const onDataRef = useRef(onData);
  const initializedRef = useRef(false);
  const queueRef = useRef<any[]>([]);

  const [connected, setConnected] = useState(false); // ✅ estado reativo

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    if (initializedRef.current) return;

    const tryInit = () => {
      const wss = wsRef?.current;
      if (!wss || wss.readyState !== WebSocket.OPEN) {
        setTimeout(tryInit, 200);
        return;
      }

      if (initializedRef.current) return;
      initializedRef.current = true;

      const createPeer = () => {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
          channelRef.current = null;
          setConnected(false);
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.onconnectionstatechange = () => {
          setConnected(pc.connectionState === "connected");
        };

        pc.oniceconnectionstatechange = () =>
          console.log(`[WebRTC] iceConnectionState → ${pc.iceConnectionState}`);

        if (role === "student") {
          const channel = pc.createDataChannel("collab");
          channelRef.current = channel;

          channel.onopen = () => {
            setConnected(true); // ✅ canal aberto = conectado
            if (queueRef.current.length > 0) {
              queueRef.current.forEach((msg) =>
                channel.send(JSON.stringify(msg)),
              );
              queueRef.current = [];
            }
          };
          channel.onclose = () => {
            setConnected(false);
          };
          channel.onerror = (e) => console.error("[WebRTC] erro canal:", e);
          channel.onmessage = (e) => {
            try {
              onDataRef.current(JSON.parse(e.data));
            } catch {}
          };
        }

        pc.ondatachannel = (e) => {
          const ch = e.channel;
          channelRef.current = ch;
          ch.onopen = () => {
            setConnected(true); // ✅ canal aberto = conectado
          };
          ch.onclose = () => {
            setConnected(false);
          };
          ch.onerror = (err) =>
            console.error("[WebRTC] erro canal (teacher):", err);
          ch.onmessage = (ev) => {
            try {
              onDataRef.current(JSON.parse(ev.data));
            } catch {}
          };
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            sendWSMessage?.({
              type: "webrtc-signal",
              workspaceId,
              data: { candidate: e.candidate },
            });
          }
        };

        return pc;
      };

      const createOffer = (pc: RTCPeerConnection) => {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            sendWSMessage?.({
              type: "webrtc-signal",
              workspaceId,
              data: { sdp: pc.localDescription },
            });
          })
          .catch((e) => console.error("[WebRTC] erro offer:", e));
      };

      const handler = async (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);

          if (
            msg.type === "webrtc-ready" &&
            msg.workspaceId === workspaceId &&
            msg.role === "teacher" &&
            role === "student"
          ) {
            const pc = createPeer();
            createOffer(pc);
            return;
          }

          if (
            msg.type === "webrtc-student-ready" &&
            msg.workspaceId === workspaceId &&
            msg.role === "student" &&
            role === "teacher"
          ) {
            createPeer();
            sendWSMessage?.({
              type: "webrtc-ready",
              workspaceId,
              role: "teacher",
            });
            return;
          }

          if (msg.type !== "webrtc-signal" || msg.workspaceId !== workspaceId)
            return;

          const pc = pcRef.current;
          if (!pc) return;

          if (msg.data.sdp) {
            if (
              msg.data.sdp.type === "offer" &&
              role === "teacher" &&
              pc.signalingState !== "stable"
            ) {
              const newPc = createPeer();
              await newPc.setRemoteDescription(
                new RTCSessionDescription(msg.data.sdp),
              );
              const answer = await newPc.createAnswer();
              await newPc.setLocalDescription(answer);
              sendWSMessage?.({
                type: "webrtc-signal",
                workspaceId,
                data: { sdp: newPc.localDescription },
              });
              return;
            }

            await pc.setRemoteDescription(
              new RTCSessionDescription(msg.data.sdp),
            );

            if (msg.data.sdp.type === "offer") {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendWSMessage?.({
                type: "webrtc-signal",
                workspaceId,
                data: { sdp: pc.localDescription },
              });
            }
          }

          if (msg.data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.data.candidate));
          }
        } catch (e) {
          console.error("[WebRTC] erro no handler:", e);
        }
      };

      const ws = wsRef.current!;
      ws.addEventListener("message", handler);

      if (role === "teacher") {
        sendWSMessage?.({ type: "webrtc-ready", workspaceId, role: "teacher" });
        createPeer();
      }

      if (role === "student") {
        sendWSMessage?.({
          type: "webrtc-student-ready",
          workspaceId,
          role: "student",
        });

        const pc = createPeer();

        setTimeout(() => {
          if (pc.signalingState === "stable" && !pc.localDescription) {
            createOffer(pc);
          }
        }, 3000);
      }

      return () => {
        ws.removeEventListener("message", handler);
        channelRef.current?.close();
        pcRef.current?.close();
        pcRef.current = null;
        channelRef.current = null;
        initializedRef.current = false;
        queueRef.current = [];
        setConnected(false);
      };
    };

    tryInit();
  }, []);

  const send = (data: any) => {
    const ch = channelRef.current;
    if (ch?.readyState === "open") {
      ch.send(JSON.stringify(data));
    } else if (ch?.readyState === "connecting") {
      if (data.type === "cursor" || data.type === "scroll") {
        const idx = queueRef.current.findIndex((m) => m.type === data.type);
        if (idx !== -1) queueRef.current[idx] = data;
        else queueRef.current.push(data);
      } else {
        queueRef.current.push(data);
      }
    }
  };

  return (
    <WebRTCContext.Provider value={{ send, connected }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => useContext(WebRTCContext);
