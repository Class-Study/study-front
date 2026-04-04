// src/components/chat/ChatBridge.tsx
import {useEffect} from "react";
import React from "react";
import {useWebRTC} from "@/contexts/WebRTCContext";
import {useChatMessages} from "@/hooks/useChatMessages";
import {ChatMessage} from "@/types/chat.types";
import {AuthUser, UserRole} from "@/types/auth.types";

interface ChatBridgeProps {
    activityId: string | null;
    user: {
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
    };
    messagesRef: React.MutableRefObject<ChatMessage[]>;
    sendMessageRef: React.MutableRefObject<(content: string) => void>;
    addIncomingRef: React.MutableRefObject<((data: Record<string, unknown>) => void) | null>;
    onMessagesChange: () => void;
}

export const ChatBridge: React.FC<ChatBridgeProps> = ({
                                                          activityId,
                                                          user,
                                                          messagesRef,
                                                          sendMessageRef,
                                                          addIncomingRef,
                                                          onMessagesChange,
                                                      }) => {
    const {send, setOnData} = useWebRTC();

    const normalizedUser: AuthUser = {
        id: user.id ?? '',
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        role: user.role as UserRole,
    };

    const {messages, sendMessage, addIncomingMessage} = useChatMessages({
        activityId,
        user: normalizedUser,
        send,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setOnData(addIncomingMessage); }, [addIncomingMessage]);

    useEffect(() => {
        messagesRef.current = messages;
        onMessagesChange();
    }, [messages, messagesRef, onMessagesChange]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { addIncomingRef.current = addIncomingMessage; }, [addIncomingMessage]);

    return null;
};