import React, { useEffect, useRef, useState } from 'react';
import { ClockIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { NoteType } from '@/types/student.types';
import { NotesHistoryModal } from '../NotesHistoryModal/NotesHistoryModal';
import styles from './WorkspaceNotes.module.css';

interface WorkspaceNotesProps {
  activityTitle?: string;
  studentId: string;
}

const SUCCESS_DISPLAY_MS = 3000;

export const WorkspaceNotes: React.FC<WorkspaceNotesProps> = ({ studentId }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const { saving, submitNote } = useNotes(studentId);

  const [activeTab, setActiveTab] = useState<NoteType>(isTeacher ? 'PRIVATE' : 'PUBLIC');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when switching tabs
  useEffect(() => {
    setText('');
    setFeedback(null);
  }, [activeTab]);

  const handleSave = async (): Promise<void> => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    const ok = await submitNote(activeTab, text);
    if (ok) {
      setText('');
      setFeedback('success');
    } else {
      setFeedback('error');
    }
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), SUCCESS_DISPLAY_MS);
  };

  return (
    <>
      <div className={styles.notes}>
        <div className={styles.header}>
          <span className={styles.headerLabel}>Notas</span>
          <button
            type="button"
            className={styles.historyBtn}
            onClick={() => setHistoryOpen(true)}
            title="Ver todas as notas"
          >
            <ClockIcon size={12} />
            Ver todas
          </button>
        </div>

        {isTeacher && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'PRIVATE' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('PRIVATE')}
            >
              Privadas
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'PUBLIC' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('PUBLIC')}
            >
              Públicas
            </button>
          </div>
        )}

        <div className={styles.noteBody}>
          <textarea
            className={styles.textarea}
            placeholder={
              activeTab === 'PRIVATE'
                ? 'Digite uma nova nota privada...'
                : 'Digite uma nova nota pública...'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className={styles.footer}>
          {feedback === 'success' && (
            <span className={styles.feedbackSuccess}>Nota salva com sucesso!</span>
          )}
          {feedback === 'error' && (
            <span className={styles.feedbackError}>Erro ao salvar. Tente novamente.</span>
          )}
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => { void handleSave(); }}
            disabled={saving || !text.trim()}
          >
            {saving ? 'Salvando...' : 'Salvar Nota'}
          </button>
        </div>
      </div>

      <NotesHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        studentId={studentId}
      />
    </>
  );
};
