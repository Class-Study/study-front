import React, { useMemo, useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import { Modal } from '@/components/ui/Modal/Modal';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import { WorkspaceFolder } from '@/types/workspace.types';
import styles from './UploadActivityModal.module.css';

interface UploadActivityModalProps {
  isOpen: boolean;
  folders: WorkspaceFolder[];
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

const isDocx = (file: File): boolean => file.name.toLowerCase().endsWith('.docx');

const titleFromFilename = (name: string): string =>
  name.replace(/\.docx$/i, '').replace(/_/g, ' ').trim();

export const UploadActivityModal: React.FC<UploadActivityModalProps> = ({
  isOpen,
  folders,
  selectedFolderId,
  onClose,
  onSave,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [convertedHtml, setConvertedHtml] = useState('');
  const [error, setError] = useState('');
  const [folderId, setFolderId] = useState<string>('');

  const hasPreview = useMemo(() => convertedHtml.trim().length > 0, [convertedHtml]);

  React.useEffect(() => {
    if (!isOpen) return;

    setIsDragging(false);
    setIsConverting(false);
    setIsSaving(false);
    setFileName('');
    setTitle('');
    setConvertedHtml('');
    setError('');
    setFolderId(selectedFolderId ?? folders[0]?.id ?? '');
  }, [isOpen, folders, selectedFolderId]);

  const handleFile = async (file: File): Promise<void> => {
    if (!isDocx(file)) {
      setError('Arquivo inválido. Envie um arquivo .docx.');
      return;
    }

    setError('');
    setIsConverting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      setFileName(file.name);
      setTitle(titleFromFilename(file.name));
      setConvertedHtml(result.value);
    } catch {
      setError('Não foi possível converter o .docx. Verifique se o arquivo está válido.');
    } finally {
      setIsConverting(false);
      setIsDragging(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!folderId || !fileName || !title.trim() || !convertedHtml) return;

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        folderId,
        title: title.trim(),
        type: 'EXERCISE',
        convertedHtml,
        originalFilename: fileName,
      });
      onClose();
    } catch {
      setError('Erro ao salvar atividade. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Arquivo" size="lg">
      <div className={styles.content}>
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) {
              void handleFile(file);
            }
          }}
          onClick={() => inputRef.current?.click()}
          role="presentation"
        >
          {isConverting ? (
            <span className={styles.dropzoneLoading}>Convertendo arquivo...</span>
          ) : (
            <>
              <span className={styles.dropzoneTitle}>Arraste seu arquivo .docx aqui para gerar um novo exercício</span>
              <span className={styles.dropzoneSubtitle}>ou clique para selecionar</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          className={styles.hiddenInput}
          type="file"
          accept=".docx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
            event.target.value = '';
          }}
        />

        <div className={styles.field}>
          <label className={styles.label}>Pasta</label>
          <select
            className={styles.input}
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Título</label>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título da atividade"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {hasPreview && (
          <div className={styles.previewWrap}>
            <DocxPreviewEditor html={convertedHtml} editable={false} />
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving || !hasPreview || !title.trim() || !folderId}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
