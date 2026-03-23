import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import { StudentExerciseFolder } from '@/types/studentProfile.types';
import styles from '@/components/ui/CreateExerciseModal/CreateExerciseModal.module.css';

interface FreeTextExerciseModalProps {
  isOpen: boolean;
  folders: StudentExerciseFolder[];
  selectedFolderId: string | null;
  onClose: () => void;
  onSave: (payload: {
    folderId: string;
    title: string;
    type: 'EXERCISE';
    convertedHtml: string;
    originalFilename: string;
  }) => Promise<void>;
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, '').trim();

export const FreeTextExerciseModal: React.FC<FreeTextExerciseModalProps> = ({
  isOpen,
  folders,
  selectedFolderId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setFolderId(selectedFolderId ?? folders[0]?.id ?? '');
    setContent('<p></p>');
    setIsSaving(false);
    setError('');
  }, [isOpen, folders, selectedFolderId]);

  const hasContent = stripHtml(content).length > 0;
  const canSave = !!folderId && !!title.trim() && hasContent && !isSaving;

  const handleSave = async (): Promise<void> => {
    if (!canSave) return;

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        folderId,
        title: title.trim(),
        type: 'EXERCISE',
        convertedHtml: content,
        originalFilename: '',
      });
    } catch {
      setError('Erro ao salvar exercício. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Exercício Livre" size="lg">
      <div className={styles.shell}>
        <div className={styles.headerCopy}>
          <p className={styles.subtitle}>
            Escreva o título e o conteúdo do exercício diretamente no editor abaixo.
          </p>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="free-exercise-folder">Pasta</label>
            <select
              id="free-exercise-folder"
              className={styles.input}
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="free-exercise-title">Título</label>
            <input
              id="free-exercise-title"
              className={styles.input}
              type="text"
              placeholder="Ex: Exercício de Gramática — Tempos Verbais"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Conteúdo</span>
          <div className={styles.previewPanel}>
            <DocxPreviewEditor html={content} editable onChange={setContent} />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? 'Salvando...' : 'Salvar Exercício'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
