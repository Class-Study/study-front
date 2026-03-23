import React from 'react';
import { Header } from '@/components/layout/Header/Header';
import { WSProvider } from '@/contexts/WSContext';
import { WebRTCProvider } from '@/contexts/WebRTCContext';
import { ChatBridge } from '@/pages/workspace/components/Chat/ChatBridge';
import { ChatMessage } from '@/types/chat.types';
import styles from '../../WorkspacePage.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkspaceShellProps {
    // Identidade
    userId?: string;
    workspaceId: string | null;
    role: 'teacher' | 'student';

    // Breadcrumb
    breadcrumbItems: { label: string; path?: string }[];

    // Chat bridge refs (vêm do useWorkspaceBase)
    activityId: string | null;
    userForChat: { id?: string; name?: string; email?: string; role?: string };
    messagesRef: React.MutableRefObject<ChatMessage[]>;
    sendMessageRef: React.MutableRefObject<(content: string) => void>;
    addIncomingRef: React.MutableRefObject<((data: any) => void) | null>;
    onMessagesChange: () => void;

    // Layout (vêm do useWorkspaceBase)
    sidebarCollapsed: boolean;
    setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    chatVisible: boolean;
    setChatVisible: React.Dispatch<React.SetStateAction<boolean>>;
    bodyRef: React.RefObject<HTMLDivElement>;

    /** Conteúdo exclusivo da página (sidebar + editor + painel direito) */
    children: React.ReactNode;

    /**
     * Barra extra renderizada entre o toolbar e o body.
     * Fica fora do flex-row do body para não virar uma coluna.
     * Ex: activity picker bar do professor.
     */
    topBar?: React.ReactNode;

    /** Atributo extra no div.page (ex: data-student-id) */
    pageProps?: React.HTMLAttributes<HTMLDivElement>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
    userId,
    workspaceId,
    role,
    breadcrumbItems,
    activityId,
    userForChat,
    messagesRef,
    sendMessageRef,
    addIncomingRef,
    onMessagesChange,
    sidebarCollapsed,
    setSidebarCollapsed,
    chatVisible,
    setChatVisible,
    bodyRef,
    children,
    topBar,
    pageProps = {},
}) => {
    return (
        <WSProvider userId={userId} workspaceId={workspaceId ?? undefined}>
            <WebRTCProvider
                key={workspaceId ?? 'no-workspace'}
                workspaceId={workspaceId}
                role={role}
            >
                <ChatBridge
                    activityId={activityId}
                    user={userForChat}
                    messagesRef={messagesRef}
                    sendMessageRef={sendMessageRef}
                    addIncomingRef={addIncomingRef}
                    onMessagesChange={onMessagesChange}
                />

                <div className={styles.page} {...pageProps}>
                    <Header breadcrumbItems={breadcrumbItems} />

                    <div className={styles.toolbar}>
                        {sidebarCollapsed && (
                            <button
                                type="button"
                                className={styles.expandSidebarBtn}
                                onClick={() => setSidebarCollapsed(false)}
                                title="Expandir sidebar"
                            >
                                ▶
                            </button>
                        )}
                        <button
                            type="button"
                            className={`${styles.chatToggleBtn} ${chatVisible ? styles.chatToggleBtnActive : ''}`}
                            onClick={() => setChatVisible((v) => !v)}
                        >
                            ⇌ Chat
                        </button>
                    </div>

                    {topBar}

                    <div className={styles.body} ref={bodyRef}>
                        {children}
                    </div>
                </div>
            </WebRTCProvider>
        </WSProvider>
    );
};