import React from 'react';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor.tsx';
import { Modal } from '@/components/ui/Modal/Modal.tsx';
import type { MaterialType, PendingMaterial, PreviewState, TemplateType } from '@/types/levelTab.types.ts';
import { createTempId, EMPTY_PREVIEW } from '@/utils/levelTab.utils.ts';
import styles from '../LevelTab.module.css';

interface PreviewModalProps {
  preview: PreviewState;
  setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
  savingTemplate: boolean;
  setPendingMaterials: React.Dispatch<React.SetStateAction<Record<string, PendingMaterial[]>>>;
  handleSaveTemplate: () => Promise<void>;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  preview,
  setPreview,
  savingTemplate,
  setPendingMaterials,
  handleSaveTemplate,
}) => {

  const modalTitle =
    preview.mode === 'view'
      ? preview.title
      : preview.mode === 'freetext_exercise'
        ? 'Nova Atividade Livre'
        : preview.mode === 'link_material'
          ? 'Novo Material de Estudo'
          : preview.mode === 'upload_material'
            ? 'Upload de Material'
            : `Preview — ${preview.fileName}`;

  const closeModal = () => setPreview({ ...EMPTY_PREVIEW });

  return (
    <Modal isOpen={preview.isOpen} onClose={closeModal} size="lg" title={modalTitle}>
      <div className={styles.previewModalContent}>
        {/* ── Link Material ──────────────────────────────────────── */}
        {preview.mode === 'link_material' && (
          <>
            <div className={styles.previewNote}>
              📚 <strong>Material de Estudo:</strong> Adicione links para vídeos (YouTube, Vimeo,
              etc.) ou outros recursos externos que complementem o aprendizado do aluno.
            </div>

            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <label className={styles.previewLabel}>Título do Material</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(e) => setPreview((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Vídeo Explicativo - Present Perfect"
                />
              </div>

              <div className={styles.previewFieldSmall}>
                <label className={styles.previewLabel}>Tipo</label>
                <select
                  className={styles.previewInput}
                  value={preview.materialType ?? 'VIDEO'}
                  onChange={(e) =>
                    setPreview((prev) => ({
                      ...prev,
                      materialType: e.target.value as MaterialType,
                    }))
                  }
                >
                  <option value="VIDEO">Vídeo</option>
                  <option value="LINK">Link Externo</option>
                </select>
              </div>
            </div>

            <div className={styles.previewField}>
              <label className={styles.previewLabel}>URL</label>
              <input
                type="url"
                className={styles.previewInput}
                value={preview.url ?? ''}
                onChange={(e) => setPreview((prev) => ({ ...prev, url: e.target.value }))}
                placeholder={
                  preview.materialType === 'VIDEO'
                    ? 'https://youtube.com/watch?v=... ou https://vimeo.com/...'
                    : 'https://site.com/recurso ou https://exemplo.com/material'
                }
              />
            </div>

            <div className={styles.previewField}>
              <label className={styles.previewLabel}>Descrição (opcional)</label>
              <textarea
                className={styles.previewInput}
                rows={3}
                value={preview.description ?? ''}
                onChange={(e) => setPreview((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição breve sobre este material de estudo"
              />
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => {
                  const sfKey = preview.subfolderId;
                  const newMaterial: PendingMaterial = {
                    tempId: createTempId(),
                    subfolderId: sfKey,
                    title: preview.title,
                    type: preview.materialType ?? 'VIDEO',
                    url: preview.url,
                    description: preview.description,
                  };
                  setPendingMaterials((prev) => ({
                    ...prev,
                    [sfKey]: [...(prev[sfKey] ?? []), newMaterial],
                  }));
                  setPreview((prev) => ({ ...prev, isOpen: false }));
                }}
                disabled={!preview.title.trim() || !preview.url?.trim()}
              >
                Salvar Material
              </button>
            </div>
          </>
        )}

        {/* ── Upload Exercise ────────────────────────────────────── */}
        {preview.mode === 'upload_exercise' && (
          <>
            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>

                <div className={styles.previewActions}>
                  <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                    Cancelar
                  </button>
                  <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={() => void handleSaveTemplate()}
                      disabled={!preview.title.trim() || savingTemplate}
                  >
                    {savingTemplate ? 'Salvando...' : 'Salvar template'}
                  </button>
                </div>
                <label className={styles.previewLabel}>Título da atividade</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(e) => setPreview((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da atividade"
                />
              </div>
            </div>
            <div className={styles.previewNote}>
              ⚠️ Este é o visual exato que o aluno verá no workspace. O conteúdo será salvo ao
              clicar em "Salvar tudo".
            </div>
            <div className={styles.previewEditorWrapper}>
              <DocxPreviewEditor
                html={preview.html}
                editable={false}
                onChange={(html) => setPreview((prev) => ({ ...prev, html }))}
              />
            </div>
          </>
        )}

        {/* ── Upload Material ────────────────────────────────────── */}
        {preview.mode === 'upload_material' && (
          <>
            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <div className={styles.previewActions}>
                  <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={() => {
                        const sfKey = preview.subfolderId;
                        const newMaterial: PendingMaterial = {
                          tempId: createTempId(),
                          subfolderId: sfKey,
                          title: preview.title.trim(),
                          type: 'DOCUMENT',
                          convertedHtml: preview.html,
                          originalFilename: preview.fileName,
                          description: preview.description,
                        };
                        setPendingMaterials((prev) => ({
                          ...prev,
                          [sfKey]: [...(prev[sfKey] ?? []), newMaterial],
                        }));
                        setPreview((prev) => ({ ...prev, isOpen: false }));
                      }}
                      disabled={!preview.title.trim()}
                  >
                    Salvar Material
                  </button>
                </div>
                <label className={styles.previewLabel}>Título do material</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(e) => setPreview((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome do material de estudo"
                />
              </div>
            </div>

            <div className={styles.previewField}>
              <label className={styles.previewLabel}>Descrição (opcional)</label>
              <textarea
                className={styles.previewInput}
                rows={2}
                value={preview.description ?? ''}
                onChange={(e) => setPreview((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição breve sobre este material de estudo"
              />
            </div>
            <div className={styles.previewNote}>
              ⚠️ Este é o visual exato que o aluno verá. O conteúdo será salvo ao clicar em "Salvar
              tudo".
            </div>

            <div className={styles.previewEditorWrapper}>
              <DocxPreviewEditor
                html={preview.html}
                editable
                onChange={(html) => setPreview((prev) => ({ ...prev, html }))}
              />
            </div>
          </>
        )}

        {/* ── Freetext Exercise ──────────────────────────────────── */}
        {preview.mode === 'freetext_exercise' && (
          <>
            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <label className={styles.previewLabel}>Título da atividade</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(e) => setPreview((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Exercício — Tempos Verbais"
                />
              </div>

              <div className={styles.previewFieldSmall}>
                <label className={styles.previewLabel}>Tipo</label>
                <select
                  disabled
                  className={styles.previewInput}
                  value={preview.type}
                  onChange={(e) =>
                    setPreview((prev) => ({ ...prev, type: e.target.value as TemplateType }))
                  }
                >
                  <option value="EXERCISE">Exercício</option>
                </select>
              </div>
            </div>

            <div className={styles.previewEditorWrapper}>
              <DocxPreviewEditor
                html={preview.html}
                editable
                onChange={(html) => setPreview((prev) => ({ ...prev, html }))}
              />
            </div>

            <div className={styles.previewActions}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => void handleSaveTemplate()}
                disabled={!preview.title.trim() || savingTemplate}
              >
                {savingTemplate ? 'Salvando...' : 'Salvar template'}
              </button>
            </div>
          </>
        )}

        {/* ── View ───────────────────────────────────────────────── */}
        {preview.mode === 'view' && (
          <>
            {!preview.html ? (
              <div className={styles.noPreviewMsg}>Preview não disponível para este template.</div>
            ) : (
              <div className={styles.previewEditorWrapper}>
                <DocxPreviewEditor html={preview.html} editable={false} />
              </div>
            )}

            <div className={styles.previewActions}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

