export interface ChatMessageResponse {
    id: string;
    activityId: string;
    userId: string;
    authorName: string;
    content: string;
    sentAt: string;
    readAt: string | null;
}

export interface ChatMessage {
    id: string;
    activityId: string;
    authorId: string;
    authorName: string;
    content: string;
    sentAt: string;
    isOwn: boolean;
}