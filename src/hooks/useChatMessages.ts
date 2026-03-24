// src/hooks/useChatMessages.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser } from "@/types/auth.types";
import { ChatMessage } from "@/types/chat.types.ts";
import chatService from "@/services/api/chat.service";

interface UseChatMessagesProps {
    activityId: string | null;
    user: AuthUser;
    send: (data: any) => void;
}

interface UseChatMessagesReturn {
    messages: ChatMessage[];
    sendMessage: (content: string) => Promise<void>;
    isLoading: boolean;
    addIncomingMessage: (data: any) => void;
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

            // TODO: Adiciona ao estado local (UI renderiza imediatamente)
            setMessages((prev) => {
                const updated = [...prev, optimisticMsg];
                return updated;
            });

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
        (data: any) => {
            // TODO: Valida se é mensagem da atividade atual
            if (data.activityId !== activityIdRef.current) {
                return;
            }

            // TODO: Criar objeto ChatMessage com dados do servidor
            const incoming: ChatMessage = {
                id: data.id,
                activityId: data.activityId,
                authorId: data.authorId,
                authorName: data.authorName,
                content: data.content,
                sentAt: data.sentAt,
                isOwn: data.authorId === user.id,  // TODO: Marca se é própria ou do outro
            };

            // TODO: Adiciona ao estado (UI renderiza na "bolha do outro")
            setMessages((prev) => {
                if (prev.some((m) => m.id === incoming.id)) {
                    return prev;  // TODO: Evita duplicata
                }
                const updated = [...prev, incoming];
                return updated;
            });
        },
        [user.id],
    );

    return { messages, sendMessage, isLoading, addIncomingMessage };
};
