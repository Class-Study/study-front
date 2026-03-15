import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { useAuth } from '@/hooks/useAuth';
import studentService from '@/services/api/student.service';
import { NoteType, StudentNote } from '@/types/student.types';
import styles from './NotesHistoryModal.module.css';

interface NotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

function formatDate(raw?: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const NotesHistoryModal: React.FC<NotesHistoryModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<NoteType>(isTeacher ? 'PRIVATE' : 'PUBLIC');
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!isTeacher && !user) return;
    if (isTeacher && !studentId) return;

    setLoading(true);
    const request = isTeacher
      ? studentService.getNotes(studentId)
      : studentService.getMyNotes();

    request
      .then((data) => setNotes(data))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [isOpen, isTeacher, studentId, user]);

  const filteredNotes = notes.filter((n) => n.type === activeTab);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Notas" size="md">
      <div className={styles.container}>
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

        <div className={styles.list}>
          {loading && (
            <div className={styles.emptyState}>Carregando...</div>
          )}

          {!loading && filteredNotes.length === 0 && (
            <div className={styles.emptyState}>
              Nenhuma nota {activeTab === 'PRIVATE' ? 'privada' : 'pública'} registrada.
            </div>
          )}

          {!loading && filteredNotes.map((note, index) => (
            <div
              key={note.id ?? `${note.type}-${index}`}
              className={`${styles.noteCard} ${activeTab === 'PRIVATE' ? styles.noteCardPrivate : styles.noteCardPublic}`}
            >
              {note.createdAt && (
                <div className={styles.noteDate}>{formatDate(note.createdAt)}</div>
              )}
              <p className={styles.noteContent}>{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
