// src/hooks/useChatMessages.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthUser } from "@/types/auth.types";
import { ChatMessage } from "@/types/workspace.types";
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

  // ─── Carrega histórico ao montar ou trocar atividade ─────────────────────
  useEffect(() => {
    if (!activityId) {
      console.log("[Chat] activityId nulo — limpando mensagens");
      setMessages([]);
      return;
    }

    console.log("[Chat] carregando histórico para activityId:", activityId);
    setIsLoading(true);

    chatService
      .getMessages(activityId, userIdRef.current)
      .then((msgs) => {
        console.log("[Chat] histórico carregado:", msgs.length, "mensagens");
        setMessages(msgs);
      })
      .catch((e) => console.error("[Chat] erro ao carregar histórico:", e))
      .finally(() => setIsLoading(false));
  }, [activityId]);

  // ─── Envia mensagem: persiste na API + envia via WebRTC ──────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activityIdRef.current || !content.trim()) return;

      // Mensagem otimista — aparece imediatamente para quem enviou
      const optimisticMsg: ChatMessage = {
        id: crypto.randomUUID(),
        activityId: activityIdRef.current,
        authorId: user.id,
        authorName: user.name,
        content,
        sentAt: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isOwn: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // Envia via WebRTC para o outro lado ver em tempo real
      send({
        type: "chat",
        id: optimisticMsg.id,
        activityId: activityIdRef.current,
        authorId: user.id,
        authorName: user.name,
        content,
        sentAt: optimisticMsg.sentAt,
      });

      // Persiste no banco via service
      try {
        await chatService.sendMessage(activityIdRef.current, user.id, content);
      } catch (e) {
        console.error("[Chat] erro ao salvar mensagem:", e);
      }
    },
    [user, send],
  );

  // ─── Recebe mensagem do outro lado via WebRTC ─────────────────────────────
  const addIncomingMessage = useCallback(
    (data: any) => {
      if (data.activityId !== activityIdRef.current) return;

      const incoming: ChatMessage = {
        id: data.id,
        activityId: data.activityId,
        authorId: data.authorId,
        authorName: data.authorName,
        content: data.content,
        sentAt: data.sentAt,
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
