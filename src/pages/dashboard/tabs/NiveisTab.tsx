import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import { Modal } from '@/components/ui/Modal/Modal';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import levelProfileService from '@/services/api/levelProfile.service';
import {
  ActivityTemplate,
  CreateLevelProfileRequest,
  LevelFolder,
  LevelProfile,
  UpdateLevelProfileRequest,
} from '@/types/levelProfile.types';
import styles from './NiveisTab.module.css';

type TemplateType = 'EXERCISE' | 'WORKSPACE';
type ModalTab = 'activities' | 'edit';

interface NewFolderRow {
  tempId: string;
  name: string;
  initialFiles: number;
}

interface NewLevelForm {
  name: string;
  icon: string;
  code: string;
  description: string;
  folders: NewFolderRow[];
}

interface AddTemplateForm {
  title: string;
  type: TemplateType;
  file: File | null;
  previewHtml?: string;
}

const createTempId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const DEFAULT_FOLDERS = (): NewFolderRow[] => [
  { tempId: createTempId(), name: '1 — TO DO', initialFiles: 3 },
  { tempId: createTempId(), name: '2 — IN PROGRESS', initialFiles: 0 },
  { tempId: createTempId(), name: '3 — DONE', initialFiles: 0 },
];

const createInitialForm = (): NewLevelForm => ({
  name: '',
  icon: '⭐',
  code: '',
  description: '',
  folders: DEFAULT_FOLDERS(),
});

const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const getFolderKey = (levelId: string, folderId: string): string => `${levelId}:${folderId}`;

const getFolderName = (folder: LevelFolder, index: number): string =>
  folder.name?.trim() || `${index + 1} — Pasta`;

const getTemplateTypeLabel = (type: TemplateType): string =>
  type === 'EXERCISE' ? 'Exercício' : 'Workspace';

const getLevelTone = (code: string): 'basic' | 'intermediate' | 'advanced' | 'custom' => {
  if (code === 'basic') return 'basic';
  if (code === 'intermediate') return 'intermediate';
  if (code === 'advanced') return 'advanced';
  return 'custom';
};

const getLevelToneClass = (tone: 'basic' | 'intermediate' | 'advanced' | 'custom'): string => {
  switch (tone) {
    case 'basic':
      return styles.levelDotBasic;
    case 'intermediate':
      return styles.levelDotIntermediate;
    case 'advanced':
      return styles.levelDotAdvanced;
    default:
      return styles.levelDotCustom;
  }
};

const isDocxFile = (file: File): boolean => file.name.toLowerCase().endsWith('.docx');

const createEditForm = (level: LevelProfile): NewLevelForm => ({
  name: level.name,
  icon: level.icon,
  code: level.code,
  description: level.description ?? '',
  folders: (level.folders ?? []).map((folder) => ({
    tempId: folder.id,
    name: folder.name,
    initialFiles: folder.initialFiles,
  })),
});

export const NiveisTab: React.FC = () => {
  const { levelProfiles, loading, error, fetchLevelProfiles } = useLevelProfiles();
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<NewLevelForm>(createInitialForm);
  const [templates, setTemplates] = useState<Record<string, ActivityTemplate[]>>({});
  const [selectedLevel, setSelectedLevel] = useState<LevelProfile | null>(null);
  const [managementTab, setManagementTab] = useState<ModalTab>('activities');
  const [editForm, setEditForm] = useState<NewLevelForm>(createInitialForm);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState<Record<string, boolean>>({});
  const [uploadDrafts, setUploadDrafts] = useState<Record<string, AddTemplateForm>>({});
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{ fileName: string; html: string } | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchLevelProfiles();
  }, [fetchLevelProfiles]);

  const existingCodes = useMemo(
    () => new Set(levelProfiles.map((profile) => profile.code.toLowerCase())),
    [levelProfiles],
  );

  const editableCodes = useMemo(
    () => new Set(levelProfiles.filter((profile) => profile.id !== selectedLevel?.id).map((profile) => profile.code.toLowerCase())),
    [levelProfiles, selectedLevel?.id],
  );

  const resetForm = (): void => {
    setForm(createInitialForm());
    setFormError('');
  };

  const toggleForm = (): void => {
    if (showForm) {
      resetForm();
    }
    setShowForm((prev) => !prev);
  };

  const handleNameChange = (value: string): void => {
    setForm((prev) => ({
      ...prev,
      name: value,
      code: toSlug(value),
    }));
  };

  const handleFieldChange = (
    field: Exclude<keyof NewLevelForm, 'folders'>,
    value: string,
  ): void => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateFolder = (
    tempId: string,
    field: keyof Omit<NewFolderRow, 'tempId'>,
    value: string | number,
  ): void => {
    setForm((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.tempId === tempId
          ? {
              ...folder,
              [field]: value,
            }
          : folder,
      ),
    }));
  };

  const addFolder = (): void => {
    setForm((prev) => {
      const nextIndex = prev.folders.length + 1;
      return {
        ...prev,
        folders: [
          ...prev.folders,
          {
            tempId: createTempId(),
            name: `${nextIndex} — NOVA PASTA`,
            initialFiles: 0,
          },
        ],
      };
    });
  };

  const removeFolder = (tempId: string): void => {
    setForm((prev) => ({
      ...prev,
      folders: prev.folders.filter((folder) => folder.tempId !== tempId),
    }));
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório.');
      return false;
    }

    if (!form.code.trim()) {
      setFormError('Código é obrigatório.');
      return false;
    }

    if (existingCodes.has(form.code.toLowerCase())) {
      setFormError('Já existe um perfil com esse código.');
      return false;
    }

    if (form.folders.length === 0) {
      setFormError('Adicione ao menos uma pasta.');
      return false;
    }

    if (form.folders.some((folder) => !folder.name.trim())) {
      setFormError('Todas as pastas precisam ter nome.');
      return false;
    }

    setFormError('');
    return true;
  };

  const handleCreateLevel = async (): Promise<void> => {
    if (!validateForm()) return;

    setCreating(true);
    try {
      const payload: CreateLevelProfileRequest = {
        name: form.name,
        code: form.code,
        icon: form.icon || '⭐',
        description: form.description || undefined,
        folders: form.folders.map((folder, idx) => ({
          name: folder.name,
          position: idx + 1,
          initialFiles: folder.initialFiles,
        })),
      };

      await levelProfileService.create(payload);
      await fetchLevelProfiles();
      setShowForm(false);
      resetForm();
    } catch {
      setFormError('Erro ao criar perfil. Verifique os dados.');
    } finally {
      setCreating(false);
    }
  };

  const openManagementModal = (level: LevelProfile, tab: ModalTab): void => {
    setSelectedLevel(level);
    setManagementTab(tab);
    setEditForm(createEditForm(level));
    setEditError('');
  };

  const closeManagementModal = (): void => {
    setSelectedLevel(null);
    setManagementTab('activities');
    setEditError('');
  };

  const openUploadZone = (folderId: string): void => {
    setShowUploadZone((prev) => ({
      ...prev,
      [folderId]: true,
    }));
    setUploadDrafts((prev) => ({
      ...prev,
      [folderId]: prev[folderId] ?? {
        title: '',
        type: 'EXERCISE',
        file: null,
      },
    }));
  };

  const closeUploadZone = (folderId: string): void => {
    setShowUploadZone((prev) => ({
      ...prev,
      [folderId]: false,
    }));
    setUploadDrafts((prev) => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    setDraggingFolderId((prev) => (prev === folderId ? null : prev));
  };

  const updateUploadDraft = (folderId: string, patch: Partial<AddTemplateForm>): void => {
    setUploadDrafts((prev) => ({
      ...prev,
      [folderId]: {
        title: prev[folderId]?.title ?? '',
        type: prev[folderId]?.type ?? 'EXERCISE',
        file: prev[folderId]?.file ?? null,
        previewHtml: prev[folderId]?.previewHtml,
        ...patch,
      },
    }));
  };

  const handleFileSelected = (folderId: string, file: File | null): void => {
    if (!file) return;
    if (!isDocxFile(file)) return;

    openUploadZone(folderId);
    updateUploadDraft(folderId, {
      file,
      title: file.name.replace(/\.docx$/i, ''),
      previewHtml: undefined,
    });
  };

  const addTemplate = (folderKey: string, template: ActivityTemplate): void => {
    setTemplates((prev) => ({
      ...prev,
      [folderKey]: [...(prev[folderKey] ?? []), template],
    }));
  };

  const removeTemplate = (folderKey: string, tempId: string): void => {
    setTemplates((prev) => ({
      ...prev,
      [folderKey]: (prev[folderKey] ?? []).filter((item) => item.tempId !== tempId),
    }));
  };

  const handleSaveTemplate = (level: LevelProfile, folder: LevelFolder): void => {
    const draft = uploadDrafts[folder.id];
    const folderKey = getFolderKey(level.id, folder.id);

    if (!draft?.file || !draft.title.trim()) {
      return;
    }

    const template: ActivityTemplate = {
      tempId: createTempId(),
      folderId: folder.id,
      title: draft.title.trim(),
      type: draft.type,
      file: draft.file,
      fileName: draft.file.name,
      previewHtml: draft.previewHtml,
    };

    addTemplate(folderKey, template);
    console.log('Template salvo:', { folderId: folder.id, template });
    closeUploadZone(folder.id);
  };

  const handlePreviewHtml = async (folderId: string): Promise<void> => {
    const draft = uploadDrafts[folderId];

    if (!draft?.file) {
      return;
    }

    const arrayBuffer = await draft.file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    updateUploadDraft(folderId, { previewHtml: result.value });
    setPreviewState({
      fileName: draft.file.name,
      html: result.value,
    });
  };

  const validateEditForm = (): boolean => {
    if (!editForm.name.trim()) {
      setEditError('Nome é obrigatório.');
      return false;
    }

    if (editForm.folders.length === 0) {
      setEditError('Adicione ao menos uma pasta.');
      return false;
    }

    if (editableCodes.has(editForm.code.toLowerCase())) {
      setEditError('Já existe outro perfil com esse código.');
      return false;
    }

    if (editForm.folders.some((folder) => !folder.name.trim())) {
      setEditError('Todas as pastas precisam ter nome.');
      return false;
    }

    setEditError('');
    return true;
  };

  const updateEditField = (
    field: Exclude<keyof NewLevelForm, 'folders'>,
    value: string,
  ): void => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEditFolder = (
    tempId: string,
    field: keyof Omit<NewFolderRow, 'tempId'>,
    value: string | number,
  ): void => {
    setEditForm((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.tempId === tempId
          ? {
              ...folder,
              [field]: value,
            }
          : folder,
      ),
    }));
  };

  const addEditFolder = (): void => {
    setEditForm((prev) => {
      const nextIndex = prev.folders.length + 1;
      return {
        ...prev,
        folders: [
          ...prev.folders,
          {
            tempId: createTempId(),
            name: `${nextIndex} — NOVA PASTA`,
            initialFiles: 0,
          },
        ],
      };
    });
  };

  const removeEditFolder = (tempId: string): void => {
    setEditForm((prev) => ({
      ...prev,
      folders: prev.folders.filter((folder) => folder.tempId !== tempId),
    }));
  };

  const handleSaveLevelChanges = async (): Promise<void> => {
    if (!selectedLevel || selectedLevel.isSystem || !validateEditForm()) {
      return;
    }

    setSavingEdit(true);
    try {
      const payload: UpdateLevelProfileRequest = {
        name: editForm.name,
        icon: editForm.icon || '⭐',
        description: editForm.description || undefined,
        folders: editForm.folders.map((folder, index) => ({
          name: folder.name,
          position: index + 1,
          initialFiles: folder.initialFiles,
        })),
      };

      await levelProfileService.update(selectedLevel.id, payload);
      await fetchLevelProfiles();
      closeManagementModal();
    } catch {
      setEditError('Erro ao salvar alterações do nível.');
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedLevelToneClass = selectedLevel ? getLevelToneClass(getLevelTone(selectedLevel.code)) : '';

  const modalTitle = selectedLevel ? (
    <div className={styles.modalTitleWrap}>
      <span className={`${styles.levelDot} ${selectedLevelToneClass}`} />
      <div className={styles.modalTitleInfo}>
        <div className={styles.modalTitleMain}>{selectedLevel.name}</div>
        <div className={styles.modalTitleSub}>
          {selectedLevel.description || 'Sem descrição'}
          {selectedLevel.isSystem ? <span className={styles.systemBadge}>Sistema</span> : null}
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Perfis de Nível</h2>
          <span className={styles.counter}>{levelProfiles.length} perfis</span>
        </div>

        <button type="button" className={styles.createBtn} onClick={toggleForm}>
          + Criar nível
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formTitle}>Novo perfil de nível</div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Nome do nível</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="Ex: Business English"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Emoji / Ícone</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="⭐"
                maxLength={4}
                value={form.icon}
                onChange={(event) => handleFieldChange('icon', event.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Código de referência</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="business-english"
                value={form.code}
                onChange={(event) => handleFieldChange('code', toSlug(event.target.value))}
              />
            </div>
          </div>

          <div className={`${styles.formGrid} ${styles.formGridFull}`}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Descrição</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="Descrição do nível para exibição..."
                value={form.description}
                onChange={(event) => handleFieldChange('description', event.target.value)}
              />
            </div>
          </div>

          <div className={styles.foldersSection}>
            <div className={styles.foldersSectionTitle}>📁 Pastas</div>

            {form.folders.map((folder) => (
              <div key={folder.tempId} className={styles.folderRow}>
                <input
                  className={styles.folderNameInput}
                  type="text"
                  value={folder.name}
                  onChange={(event) => updateFolder(folder.tempId, 'name', event.target.value)}
                />
                <input
                  className={styles.folderFilesInput}
                  type="number"
                  min={0}
                  value={folder.initialFiles}
                  onChange={(event) => updateFolder(folder.tempId, 'initialFiles', Number(event.target.value))}
                />
                <button
                  type="button"
                  className={styles.removeFolderBtn}
                  onClick={() => removeFolder(folder.tempId)}
                  aria-label="Remover pasta"
                >
                  ✕
                </button>
              </div>
            ))}

            <button type="button" className={styles.addFolderBtn} onClick={addFolder}>
              + Adicionar pasta
            </button>
          </div>

          {formError && <div className={styles.formError}>{formError}</div>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleCreateLevel}
              disabled={creating}
            >
              {creating ? 'Criando...' : 'Criar perfil de nível'}
            </button>
          </div>
        </div>
      )}

      {loading && <div className={styles.counter}>Carregando perfis...</div>}
      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.levelsGrid}>
        {levelProfiles.map((level) => {
          const folders = level.folders ?? [];
          const tone = getLevelTone(level.code);
          const toneClass = getLevelToneClass(tone);

          return (
            <article
              key={level.id}
              className={styles.levelCard}
              onClick={() => openManagementModal(level, 'activities')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openManagementModal(level, 'activities');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Abrir atividades do nível ${level.name}`}
            >
              <div className={styles.levelCardHeader}>
                <div className={styles.levelMarkerWrap}>
                  <span className={`${styles.levelDot} ${toneClass}`} />
                  <div className={styles.levelIcon}>{level.icon || '⭐'}</div>
                </div>
                <div className={styles.levelInfo}>
                  <div className={styles.levelName}>{level.name}</div>
                  <div className={styles.levelDesc}>{level.description || 'Sem descrição cadastrada.'}</div>
                </div>
                {level.isSystem ? <span className={styles.systemBadge}>Sistema</span> : null}
              </div>

              <div className={styles.divider} />

              <div className={styles.folderList}>
                {folders.map((folder, index) => (
                  <div key={folder.id} className={styles.folderListItem}>
                    <span className={styles.folderListName}>{getFolderName(folder, index)}</span>
                    <span className={styles.folderListCount}>{folder.initialFiles} arqs</span>
                  </div>
                ))}
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  disabled={level.isSystem}
                  title={level.isSystem ? 'Perfil de sistema' : 'Editar nível'}
                  onClick={(event) => {
                    event.stopPropagation();
                    openManagementModal(level, 'edit');
                  }}
                >
                  Editar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>

    <Modal isOpen={selectedLevel !== null} onClose={closeManagementModal} size="lg" title={modalTitle}>
      {selectedLevel && (
        <div className={styles.managementContent}>
          <div className={styles.managementTabs}>
            <button
              type="button"
              className={`${styles.managementTab} ${managementTab === 'activities' ? styles.managementTabActive : ''}`}
              onClick={() => setManagementTab('activities')}
            >
              Atividades
            </button>
            <button
              type="button"
              className={`${styles.managementTab} ${managementTab === 'edit' ? styles.managementTabActive : ''}`}
              onClick={() => setManagementTab('edit')}
              disabled={selectedLevel.isSystem}
            >
              Editar nível
            </button>
          </div>

          {managementTab === 'activities' && (
            <div className={styles.managementBody}>
              {selectedLevel.folders.map((folder, index) => {
                const folderKey = getFolderKey(selectedLevel.id, folder.id);
                const folderTemplates = templates[folderKey] ?? [];
                const uploadDraft = uploadDrafts[folder.id];
                const isDragging = draggingFolderId === folder.id;
                const isUploadOpen = Boolean(showUploadZone[folder.id]);

                return (
                  <section key={folder.id} className={styles.modalFolderCard}>
                    <div className={styles.modalFolderHeader}>
                      <div className={styles.modalFolderName}>📁 {getFolderName(folder, index)}</div>
                      <button
                        type="button"
                        className={styles.addTemplateBtn}
                        onClick={() => {
                          if (isUploadOpen) {
                            closeUploadZone(folder.id);
                            return;
                          }
                          openUploadZone(folder.id);
                        }}
                      >
                        {isUploadOpen ? 'Fechar' : '+ Adicionar'}
                      </button>
                    </div>

                    {folderTemplates.length === 0 ? (
                      <div className={styles.emptyTemplates}>Nenhum template ainda.</div>
                    ) : (
                      folderTemplates.map((template) => (
                        <div key={template.tempId} className={styles.templateRow}>
                          <div className={styles.templateMeta}>
                            <span className={styles.templateFileIcon}>📄</span>
                            <div>
                              <div className={styles.templateTitle}>{template.title}</div>
                              <div className={styles.templateType}>{getTemplateTypeLabel(template.type)}</div>
                            </div>
                          </div>
                          <div className={styles.templateActions}>
                            <button
                              type="button"
                              className={styles.templateActionBtn}
                              onClick={() => {
                                if (template.previewHtml) {
                                  setPreviewState({ fileName: template.fileName, html: template.previewHtml });
                                }
                              }}
                              disabled={!template.previewHtml}
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              className={styles.templateActionBtn}
                              onClick={() => removeTemplate(folderKey, template.tempId)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {isUploadOpen && (
                      <div className={styles.uploadSection}>
                        <div
                          className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneActive : ''}`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDraggingFolderId(folder.id);
                          }}
                          onDragLeave={() => setDraggingFolderId((prev) => (prev === folder.id ? null : prev))}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDraggingFolderId(null);
                            const file = event.dataTransfer.files[0] ?? null;
                            handleFileSelected(folder.id, file);
                          }}
                          onClick={() => fileInputsRef.current[folder.id]?.click()}
                          role="presentation"
                        >
                          <div className={styles.uploadZoneText}>Arraste um arquivo .docx aqui</div>
                          <div className={styles.uploadZoneSubtext}>ou clique para selecionar</div>
                          <input
                            ref={(element) => {
                              fileInputsRef.current[folder.id] = element;
                            }}
                            className={styles.fileInput}
                            type="file"
                            accept=".docx"
                            onChange={(event) => handleFileSelected(folder.id, event.target.files?.[0] ?? null)}
                          />
                        </div>

                        {uploadDraft?.file && (
                          <div className={styles.templateFormCard}>
                            <div className={styles.selectedFileName}>📄 {uploadDraft.file.name}</div>

                            <div className={styles.templateFormField}>
                              <label className={styles.formLabel}>Título da atividade</label>
                              <input
                                className={styles.templateInput}
                                type="text"
                                value={uploadDraft.title}
                                onChange={(event) => updateUploadDraft(folder.id, { title: event.target.value })}
                              />
                            </div>

                            <div className={styles.templateFormField}>
                              <label className={styles.formLabel}>Tipo</label>
                              <select
                                className={styles.templateSelect}
                                value={uploadDraft.type}
                                onChange={(event) =>
                                  updateUploadDraft(folder.id, { type: event.target.value as TemplateType })
                                }
                              >
                                <option value="EXERCISE">Exercício</option>
                                <option value="WORKSPACE">Workspace</option>
                              </select>
                            </div>

                            <div className={styles.templateFormActions}>
                              <button
                                type="button"
                                className={styles.templatePreviewBtn}
                                onClick={() => {
                                  void handlePreviewHtml(folder.id);
                                }}
                              >
                                👁 Preview HTML
                              </button>
                              <button
                                type="button"
                                className={styles.templateCancelBtn}
                                onClick={() => closeUploadZone(folder.id)}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.templateSaveBtn}
                                onClick={() => handleSaveTemplate(selectedLevel, folder)}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {managementTab === 'edit' && (
            <div className={styles.managementBody}>
              {selectedLevel.isSystem ? (
                <div className={styles.systemMessage}>Perfis de sistema não podem ser editados.</div>
              ) : (
                <div className={styles.editCard}>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Nome do nível</label>
                      <input
                        className={styles.formInput}
                        type="text"
                        value={editForm.name}
                        onChange={(event) => updateEditField('name', event.target.value)}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Emoji / Ícone</label>
                      <input
                        className={styles.formInput}
                        type="text"
                        maxLength={4}
                        value={editForm.icon}
                        onChange={(event) => updateEditField('icon', event.target.value)}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Código</label>
                      <input className={styles.formInput} type="text" value={editForm.code} disabled />
                    </div>
                  </div>

                  <div className={`${styles.formGrid} ${styles.formGridFull}`}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Descrição</label>
                      <input
                        className={styles.formInput}
                        type="text"
                        value={editForm.description}
                        onChange={(event) => updateEditField('description', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.foldersSection}>
                    <div className={styles.foldersSectionTitle}>📁 Pastas</div>

                    {editForm.folders.map((folder) => (
                      <div key={folder.tempId} className={styles.folderRow}>
                        <input
                          className={styles.folderNameInput}
                          type="text"
                          value={folder.name}
                          onChange={(event) => updateEditFolder(folder.tempId, 'name', event.target.value)}
                        />
                        <input
                          className={styles.folderFilesInput}
                          type="number"
                          min={0}
                          value={folder.initialFiles}
                          onChange={(event) => updateEditFolder(folder.tempId, 'initialFiles', Number(event.target.value))}
                        />
                        <button
                          type="button"
                          className={styles.removeFolderBtn}
                          onClick={() => removeEditFolder(folder.tempId)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button type="button" className={styles.addFolderBtn} onClick={addEditFolder}>
                      + Adicionar pasta
                    </button>
                  </div>

                  {editError && <div className={styles.formError}>{editError}</div>}

                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelBtn} onClick={closeManagementModal}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={() => {
                        void handleSaveLevelChanges();
                      }}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>

    <Modal
      isOpen={previewState !== null}
      onClose={() => setPreviewState(null)}
      size="full"
      title={previewState ? `Preview — ${previewState.fileName}` : undefined}
    >
      {previewState && (
        <div className={styles.previewBody}>
          <div className={styles.previewNote}>⚠️ O arquivo será convertido definitivamente ao salvar</div>
          <div className={styles.previewHtml} dangerouslySetInnerHTML={{ __html: previewState.html }} />
          <div className={styles.previewActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setPreviewState(null)}>
              Fechar preview
            </button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};
