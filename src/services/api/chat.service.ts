// src/services/api/chat.service.ts
import api from "@/services/api/client";
import { ChatMessage, ChatMessageResponse } from "@/types/chat.types";



const mapMessage = (msg: ChatMessageResponse, currentUserId: string): ChatMessage => ({
    id: msg.id,
    activityId: msg.activityId,
    authorId: msg.userId,
    authorName: msg.authorName,
    content: msg.content,
    sentAt: new Date(msg.sentAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    }),
    isOwn: msg.userId === currentUserId,
});

const chatService = {
    getMessages: async (activityId: string, currentUserId: string): Promise<ChatMessage[]> => {
        const { data } = await api.get<ChatMessageResponse[]>(`/chat/${activityId}/messages`);
        return data.map((msg) => mapMessage(msg, currentUserId));
    },

    sendMessage: async (activityId: string, userId: string, content: string): Promise<void> => {
        await api.post(`/chat/${activityId}/messages`, { userId, content });
    },

    markAsRead: async (activityId: string, userId: string): Promise<void> => {
        await api.patch(`/chat/${activityId}/messages/read`, { userId });
    },
};

export default chatService;