// src/contexts/WebRTCContext.tsx
import React, { createContext, useContext, useRef } from "react";

interface WebRTCContextValue {
    send: (data: any) => void;
}

const WebRTCContext = createContext<WebRTCContextValue>({ send: () => {} });

export const WebRTCProvider: React.FC<{
    children: React.ReactNode;
    }> = ({ children }) => {
    const channelRef = useRef<RTCDataChannel | null>(null);

    // 📍 PASSO 3: Envia dados via RTCDataChannel
    const send = (data: any) => {
        const ch = channelRef.current;

        if (ch?.readyState === "open") {
            ch.send(JSON.stringify(data));
        }
    };

    return (
        <WebRTCContext.Provider value={{ send }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => useContext(WebRTCContext);