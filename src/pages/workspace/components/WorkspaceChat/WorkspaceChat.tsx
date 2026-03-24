import React, { useEffect, useRef, useState } from 'react';
import { Send, WifiOff, RefreshCw } from 'lucide-react';
import { ChatMessage } from '@/types/chat.types';
import styles from './WorkspaceChat.module.css';

interface WorkspaceChatProps {
  activityTitle: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  /** When true, chat is disabled (e.g. student not connected) */
  disabled?: boolean;
  /** Optional message to show when disabled */
  disabledMessage?: string;
  /** Callback para tentar reconectar */
  onReconnect?: () => void;
  /** true enquanto reconexão está em andamento */
  isReconnecting?: boolean;
}

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({
  activityTitle,
  messages,
  onSendMessage,
  disabled = false,
  disabledMessage,
  onReconnect,
  isReconnecting = false,
}) => {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 📍 PASSO 1: UI - Usuário clica em enviar
  const handleSend = (): void => {
    const content = draft.trim();
    if (!content || disabled) {
      return;
    }

    // Chama callback do pai (StudentWorkspacePage ou ProfessorWorkspacePage)
    onSendMessage(content);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.headerLabel}>Chat</span>
          <span className={styles.headerSub}>{activityTitle || 'Sem atividade'}</span>
        </div>
      </div>

      {disabled ? (
        <div className={styles.disabledOverlay}>
          <WifiOff size={24} className={styles.disabledIcon} />
          <span className={styles.disabledText}>
            {disabledMessage || 'Chat indisponível'}
          </span>
          <span className={styles.disabledSubtext}>
            O chat será habilitado quando a conexão com o aluno for estabelecida e uma atividade estiver ativa.
          </span>
          {onReconnect && (
            <button
              type="button"
              className={styles.reconnectBtn}
              onClick={onReconnect}
              disabled={isReconnecting}
            >
              <RefreshCw size={13} className={isReconnecting ? styles.spinning : ''} />
              {isReconnecting ? 'Reconectando...' : 'Tentar reconectar'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.emptyChat}>
                <span className={styles.emptyChatIcon}>💬</span>
                <span className={styles.emptyChatText}>Nenhuma mensagem ainda</span>
              </div>
            ) : (
              messages
                .filter((msg) => !!msg.content && msg.content.trim() !== "")
                .map((msg, i) => (
                  <div
                    key={msg.id ? `${msg.id}-${i}` : `msg-${i}`}
                    className={`${styles.messageGroup} ${msg.isOwn ? styles.messageGroupOwn : ''}`}
                  >
                    {!msg.isOwn && (
                      <span className={styles.authorName}>{msg.authorName}</span>
                    )}
                    <div className={`${styles.bubble} ${msg.isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
                      {msg.content}
                    </div>
                    <span className={`${styles.sentAt} ${msg.isOwn ? styles.sentAtOwn : ''}`}>
                      {msg.sentAt}
                    </span>
                  </div>
                ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              placeholder="Mensagem..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!draft.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
