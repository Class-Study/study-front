import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import * as mammoth from 'mammoth';
import { Modal } from '@/components/ui/Modal/Modal';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import { StudentExerciseFolder } from '@/types/studentProfile.types';
import styles from './CreateExerciseModal.module.css';

interface CreateExerciseModalProps {
  isOpen: boolean;
  folders: StudentExerciseFolder[];
  selectedFolderId: string | null;
  onClose: () => void;
  onSave: (payload: {
    folderId: string;
    title: string;
    type: 'EXERCISE';
    contentHtml: string;
    originalFilename: string;
  }) => Promise<void>;
}

const isDocxFile = (file: File): boolean => file.name.toLowerCase().endsWith('.docx');

const titleFromFilename = (name: string): string => (
  name.replace(/\.docx$/i, '').replace(/[_-]/g, ' ').trim()
);

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  isOpen,
  folders,
  selectedFolderId,
  onClose,
  onSave,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [convertedHtml, setConvertedHtml] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isTitleDirty, setIsTitleDirty] = useState(false);

  const hasPreview = useMemo(() => convertedHtml.trim().length > 0, [convertedHtml]);
  const resolvedTitle = title.trim() || (file ? titleFromFilename(file.name) : '');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle('');
    setFolderId(selectedFolderId ?? folders[0]?.id ?? '');
    setFile(null);
    setConvertedHtml('');
    setIsPreviewOpen(false);
    setIsDragging(false);
    setIsConverting(false);
    setIsSaving(false);
    setError('');
    setIsTitleDirty(false);
  }, [isOpen, folders, selectedFolderId]);

  const handleFileSelection = async (selectedFile: File): Promise<void> => {
    if (!isDocxFile(selectedFile)) {
      setError('Arquivo inválido. Envie um arquivo .docx.');
      return;
    }

    setError('');
    setIsConverting(true);
    setIsPreviewOpen(false);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      setFile(selectedFile);
      setConvertedHtml(result.value);
      if (!isTitleDirty) {
        setTitle(titleFromFilename(selectedFile.name));
      }
    } catch {
      setError('Não foi possível processar o arquivo. Verifique se o .docx está válido.');
      setConvertedHtml('');
      setFile(null);
    } finally {
      setIsConverting(false);
      setIsDragging(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!folderId || !file || !hasPreview) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        folderId,
        title: resolvedTitle,
        type: 'EXERCISE',
        contentHtml: convertedHtml,
        originalFilename: file.name,
      });
      onClose();
    } catch {
      setError('Erro ao criar exercício. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPreviewOpen ? 'Preview do Exercício' : 'Novo Exercício'}
      size={isPreviewOpen ? 'full' : 'lg'}
    >
      <div className={styles.shell}>
        {!isPreviewOpen ? (
          <>
            <div className={styles.headerCopy}>
              <p className={styles.title}>Configure o exercício antes de enviar para o aluno.</p>
              <p className={styles.subtitle}>Faça upload do .docx, ajuste os metadados e visualize o resultado da conversão antes de criar.</p>
            </div>

            <div className={styles.fieldGrid}>
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
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setIsTitleDirty(event.target.value.trim().length > 0);
                  }}
                  placeholder="Título do exercício"
                />
              </div>
            </div>

            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                const droppedFile = event.dataTransfer.files[0];
                if (droppedFile) {
                  void handleFileSelection(droppedFile);
                }
              }}
              onClick={() => inputRef.current?.click()}
              role="presentation"
            >
              {isConverting ? (
                <span className={styles.dropzoneLoading}>Processando arquivo...</span>
              ) : (
                <>
                  <span className={styles.dropzoneTitle}>Arraste um arquivo .docx aqui</span>
                  <span className={styles.dropzoneSubtitle}>ou clique para selecionar o exercício que será convertido</span>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              className={styles.hiddenInput}
              type="file"
              accept=".docx"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) {
                  void handleFileSelection(selectedFile);
                }
                event.target.value = '';
              }}
            />

            {file && (
              <div className={styles.fileCard}>
                <div>
                  <span className={styles.fileLabel}>Arquivo carregado</span>
                  <strong className={styles.fileName}>{file.name}</strong>
                </div>
                <button
                  type="button"
                  className={styles.fileAction}
                  onClick={() => inputRef.current?.click()}
                >
                  Trocar arquivo
                </button>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

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
                className={styles.previewBtn}
                onClick={() => setIsPreviewOpen(true)}
                disabled={!hasPreview || isConverting || isSaving}
              >
                <Eye size={16} />
                Visualizar
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  void handleSave();
                }}
                disabled={!folderId || !file || !hasPreview || isConverting || isSaving}
              >
                {isSaving ? 'Criando...' : 'Criar Exercício'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.previewTopBar}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setIsPreviewOpen(false)}
              >
                <ArrowLeft size={16} />
                Voltar para edição
              </button>

              <div className={styles.previewMeta}>
                <span className={styles.previewTitle}>{resolvedTitle || 'Exercício sem título'}</span>
                {file && <span className={styles.previewFile}>{file.name}</span>}
              </div>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  void handleSave();
                }}
                disabled={!folderId || !file || !hasPreview || isConverting || isSaving}
              >
                {isSaving ? 'Criando...' : 'Criar Exercício'}
              </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.previewNotice}>
              Confira abaixo exatamente como o aluno verá o exercício antes de salvar.
            </div>

            <div className={styles.previewPanel}>
              <DocxPreviewEditor html={convertedHtml} editable={false} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CreateExerciseModal;