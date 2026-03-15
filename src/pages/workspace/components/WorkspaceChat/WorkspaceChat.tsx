import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '@/types/workspace.types';
import styles from './WorkspaceChat.module.css';

interface WorkspaceChatProps {
  activityTitle: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({
  activityTitle,
  messages,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (): void => {
    const content = draft.trim();
    if (!content) return;
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
          <span className={styles.headerSub}>{activityTitle}</span>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <span className={styles.emptyChatIcon}>💬</span>
            <span className={styles.emptyChatText}>Nenhuma mensagem ainda</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
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
    </div>
  );
};
