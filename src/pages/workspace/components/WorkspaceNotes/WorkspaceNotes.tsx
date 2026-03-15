import React, { useState } from 'react';
import styles from './WorkspaceNotes.module.css';

interface WorkspaceNotesProps {
  activityTitle: string;
}

export const WorkspaceNotes: React.FC<WorkspaceNotesProps> = ({ activityTitle }) => {
  const [notes, setNotes] = useState('');

  const handleEdit = (): void => {
    console.log('Editar notas:', notes);
  };

  return (
    <div className={styles.notes}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Notas</span>
        <span className={styles.activityTitle}>{activityTitle}</span>
      </div>

      <div className={styles.noteBody}>
        <textarea
          className={styles.textarea}
          placeholder="Anotações desta atividade..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.editBtn} onClick={handleEdit}>
          Salvar notas
        </button>
      </div>
    </div>
  );
};
