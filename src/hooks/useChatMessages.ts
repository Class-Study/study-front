// src/hooks/useChatMessages.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser } from "@/types/auth.types";
import { ChatMessage } from "@/types/chat.types.ts";
import chatService from "@/services/api/chat.service";

interface UseChatMessagesProps {
    activityId: string | null;
    user: AuthUser;
    send: (data: Record<string, unknown>) => void;
}

interface UseChatMessagesReturn {
    messages: ChatMessage[];
    sendMessage: (content: string) => Promise<void>;
    isLoading: boolean;
    addIncomingMessage: (data: Record<string, unknown>) => void;
}

export const useChatMessages = ({
                                    activityId,
                                    user,
                                    send,
                                }: UseChatMessagesProps): UseChatMessagesReturn => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const activityIdRef = useRef(activityId);
    activityIdRef.current = activityId;

    const userIdRef = useRef(user.id);
    userIdRef.current = user.id;

    // ─── FLUXO 0: Carrega histórico ao montar ou trocar atividade ─────────────
    useEffect(() => {
        if (!activityId) {
            setMessages([]);
            return;
        }

        setIsLoading(true);

        chatService
            .getMessages(activityId, userIdRef.current)
            .then((msgs) => {
                setMessages(msgs);
            })
            .catch((e) => {
                console.error(`   ❌ Erro ao carregar histórico:`, e);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [activityId]);

    // ─── FLUXO 2-3: Envia mensagem: persiste na API + envia via WebRTC ───────
    const sendMessage = useCallback(
        async (content: string) => {
            if (!activityIdRef.current || !content.trim()) {
                return;
            }

            const messageId = crypto.randomUUID();

            // TODO: Criar mensagem otimista (aparece IMEDIATAMENTE para quem enviou)
            const optimisticMsg: ChatMessage = {
                id: messageId,
                activityId: activityIdRef.current,
                authorId: user.id,
                authorName: user.name,
                content,
                sentAt: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                isOwn: true,  // TODO: Marca como própria mensagem
            };

            setMessages((prev) => [...prev, optimisticMsg]);

            // TODO: ENVIA VIA WEBRTC (para o outro lado ver em tempo real)
            send({
                type: "chat",
                id: optimisticMsg.id,
                activityId: activityIdRef.current,
                authorId: user.id,
                authorName: user.name,
                content,
                sentAt: optimisticMsg.sentAt,
            });

            // TODO: PERSISTE NO BANCO (pode falhar sem impactar visão local)
            try {
                await chatService.sendMessage(activityIdRef.current, user.id, content);
            } catch (e) {
                console.error(`   ❌ Erro ao salvar mensagem:`, e);
            }
        },
        [user, send],
    );

    // ─── FLUXO 4-5: Recebe mensagem do outro lado via WebSocket ──────────────
    // TODO: addIncomingMessage() - Ponto de entrada do recebimento
    // Chamado por StudentWorkspacePage/ProfessorWorkspacePage quando WebSocket envia dados
    const addIncomingMessage = useCallback(
        (data: Record<string, unknown>) => {
            if (data.activityId !== activityIdRef.current) {
                return;
            }

            const incoming: ChatMessage = {
                id: data.id as string,
                activityId: data.activityId as string,
                authorId: data.authorId as string,
                authorName: data.authorName as string,
                content: data.content as string,
                sentAt: data.sentAt as string,
                isOwn: data.authorId === user.id,
            };

            setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) return prev;
                return [...prev, incoming];
            });
        },
        [user.id],
    );

    return { messages, sendMessage, isLoading, addIncomingMessage };
};
