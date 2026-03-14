import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import { Modal } from '@/components/ui/Modal/Modal';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import levelFolderTemplateService from '@/services/api/levelFolderTemplate.service';
import levelProfileService from '@/services/api/levelProfile.service';
import {
  CreateLevelProfileRequest,
  LevelFolder,
  LevelFolderTemplate,
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

interface PendingTemplate {
  tempId: string;
  folderId: string;
  title: string;
  type: TemplateType;
  fileName: string;
  convertedHtml: string;
}

interface PreviewState {
  isOpen: boolean;
  html: string;
  fileName: string;
  folderId: string;
  title: string;
  type: TemplateType;
  mode: 'upload' | 'view';
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
  const [pendingTemplates, setPendingTemplates] = useState<Record<string, PendingTemplate[]>>({});
  const [selectedLevel, setSelectedLevel] = useState<LevelProfile | null>(null);
  const [managementTab, setManagementTab] = useState<ModalTab>('activities');
  const [editForm, setEditForm] = useState<NewLevelForm>(createInitialForm);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeUploadFolder, setActiveUploadFolder] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    html: '',
    fileName: '',
    folderId: '',
    title: '',
    type: 'EXERCISE',
    mode: 'upload',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setSaveError(null);
    setSaveSuccess(false);
  };

  const closeManagementModal = (): void => {
    setSelectedLevel(null);
    setManagementTab('activities');
    setEditError('');
    setSaveError(null);
    setSaveSuccess(false);
    setActiveUploadFolder(null);
    setIsConverting(false);
    setIsDragging(false);
  };

  const handleFileConvert = async (file: File, folderId: string): Promise<void> => {
    if (!isDocxFile(file)) return;

    setIsConverting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      setPreview({
        isOpen: true,
        html: result.value,
        fileName: file.name,
        folderId,
        title: file.name.replace(/\.docx$/i, '').replace(/_/g, ' '),
        type: 'EXERCISE',
        mode: 'upload',
      });
    } catch (err) {
      console.error('Erro ao converter .docx:', err);
    } finally {
      setIsConverting(false);
      setIsDragging(false);
    }
  };

  const handleSaveToQueue = (): void => {
    if (!preview.title.trim()) return;

    const newTemplate: PendingTemplate = {
      tempId: createTempId(),
      folderId: preview.folderId,
      title: preview.title.trim(),
      type: preview.type,
      fileName: preview.fileName,
      convertedHtml: preview.html,
    };

    setPendingTemplates((prev) => ({
      ...prev,
      [preview.folderId]: [...(prev[preview.folderId] ?? []), newTemplate],
    }));

    setPreview({
      isOpen: false,
      html: '',
      fileName: '',
      folderId: '',
      title: '',
      type: 'EXERCISE',
      mode: 'upload',
    });
    setActiveUploadFolder(null);
  };

  const handleViewSavedTemplate = async (
    template: LevelFolderTemplate,
    folderId: string,
  ): Promise<void> => {
    if (template.convertedHtml) {
      setPreview({
        isOpen: true,
        html: template.convertedHtml,
        fileName: template.originalFilename ?? template.title,
        folderId,
        title: template.title,
        type: template.type,
        mode: 'view',
      });
      return;
    }

    setPreview({
      isOpen: true,
      html: '<p>Conteudo nao disponivel para visualizacao. O HTML sera incluido em uma proxima atualizacao da API.</p>',
      fileName: template.originalFilename ?? template.title,
      folderId,
      title: template.title,
      type: template.type,
      mode: 'view',
    });
  };

  const removePendingTemplate = (folderId: string, tempId: string): void => {
    setPendingTemplates((prev) => ({
      ...prev,
      [folderId]: (prev[folderId] ?? []).filter((template) => template.tempId !== tempId),
    }));
  };

  const handleDeleteTemplate = async (
    profileId: string,
    folderId: string,
    templateId: string,
  ): Promise<void> => {
    try {
      await levelFolderTemplateService.delete(profileId, folderId, templateId);
      await fetchLevelProfiles();
    } catch {
      console.error('Erro ao deletar template');
    }
  };

  const handleSaveAll = async (): Promise<void> => {
    if (!selectedLevel) return;

    const selectedFolderIds = new Set(selectedLevel.folders.map((folder) => folder.id));
    const pendingEntries = Object.entries(pendingTemplates).filter(([folderId]) =>
      selectedFolderIds.has(folderId),
    );

    setSaving(true);
    setSaveError(null);

    try {
      const promises: Promise<void>[] = [];

      pendingEntries.forEach(([folderId, templates]) => {
        templates.forEach((template) => {
          const promise = levelFolderTemplateService
            .create(selectedLevel.id, folderId, {
              title: template.title,
              type: template.type,
              originalFilename: template.fileName,
              convertedHtml: template.convertedHtml,
            })
            .then(() => {
              setPendingTemplates((prev) => ({
                ...prev,
                [folderId]: (prev[folderId] ?? []).filter((item) => item.tempId !== template.tempId),
              }));
            });

          promises.push(promise);
        });
      });

      await Promise.all(promises);
      await fetchLevelProfiles();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Erro ao salvar alguns templates. Tente novamente.');
    } finally {
      setSaving(false);
    }
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
  const selectedFolderIds = new Set((selectedLevel?.folders ?? []).map((folder) => folder.id));
  const selectedPendingEntries = Object.entries(pendingTemplates).filter(([folderId]) => selectedFolderIds.has(folderId));
  const hasPendingTemplates = selectedPendingEntries.some(([, list]) => list.length > 0);
  const totalPending = selectedPendingEntries.reduce((acc, [, list]) => acc + list.length, 0);

  const modalTitle = selectedLevel ? (
    <div className={`${styles.modalTitleWrap} ${styles.modalTitleWithActions}`}>
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

      {hasPendingTemplates && (
        <button
          type="button"
          className={styles.saveAllBtn}
          onClick={() => {
            void handleSaveAll();
          }}
          disabled={saving}
        >
          {saving ? 'Salvando...' : `Salvar tudo (${totalPending})`}
        </button>
      )}
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
              {saveSuccess && (
                <div className={styles.successBanner}>✓ Templates salvos com sucesso</div>
              )}

              {saveError && (
                <div className={styles.errorBanner}>{saveError}</div>
              )}

              {selectedLevel.folders.map((folder, index) => {
                const savedTemplates = folder.templates ?? [];
                const folderPendingTemplates = pendingTemplates[folder.id] ?? [];
                const isUploadOpen = activeUploadFolder === folder.id;

                return (
                  <section key={folder.id} className={styles.modalFolderCard}>
                    <div className={styles.modalFolderHeader}>
                      <div className={styles.modalFolderName}>📁 {getFolderName(folder, index)}</div>
                      <button
                        type="button"
                        className={styles.addTemplateBtn}
                        onClick={() => {
                          setActiveUploadFolder((prev) => (prev === folder.id ? null : folder.id));
                        }}
                      >
                        {isUploadOpen ? 'Fechar' : '+ Adicionar'}
                      </button>
                    </div>

                    {savedTemplates.length === 0 && folderPendingTemplates.length === 0 ? (
                      <div className={styles.emptyTemplates}>Nenhum template ainda.</div>
                    ) : (
                      <>
                        {savedTemplates.map((template) => (
                          <div key={template.id} className={styles.templateItem}>
                            <div className={styles.templateInfo}>
                              <span className={styles.templateTitle}>{template.title}</span>
                              <span className={styles.templateType}>{getTemplateTypeLabel(template.type)}</span>
                              {template.originalFilename && (
                                <span className={styles.templateFile}>{template.originalFilename}</span>
                              )}
                            </div>
                            <div className={styles.templateActions}>
                              <button
                                type="button"
                                className={styles.viewTemplateBtn}
                                title="Visualizar conteudo"
                                onClick={() => {
                                  void handleViewSavedTemplate(template, folder.id);
                                }}
                              >
                                👁
                              </button>
                              <button
                                type="button"
                                className={styles.removeTemplateBtn}
                                onClick={() => {
                                  void handleDeleteTemplate(selectedLevel.id, folder.id, template.id);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}

                        {folderPendingTemplates.map((template) => (
                          <div
                            key={template.tempId}
                            className={`${styles.templateItem} ${styles.templatePending}`}
                          >
                            <div className={styles.templateInfo}>
                              <span className={styles.templateTitle}>{template.title}</span>
                              <span className={styles.templateType}>{getTemplateTypeLabel(template.type)}</span>
                              <span className={styles.pendingBadge}>Não salvo</span>
                            </div>
                            <div className={styles.templateActions}>
                              <button
                                type="button"
                                className={styles.viewTemplateBtn}
                                title="Visualizar conteudo"
                                onClick={() => {
                                  setPreview({
                                    isOpen: true,
                                    html: template.convertedHtml,
                                    fileName: template.fileName,
                                    folderId: folder.id,
                                    title: template.title,
                                    type: template.type,
                                    mode: 'view',
                                  });
                                }}
                              >
                                👁
                              </button>
                              <button
                                type="button"
                                className={styles.removeTemplateBtn}
                                onClick={() => {
                                  removePendingTemplate(folder.id, template.tempId);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {isUploadOpen && (
                      <div className={styles.uploadSection}>
                        <div
                          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setIsDragging(false);
                            const file = event.dataTransfer.files[0] ?? null;
                            if (file) {
                              void handleFileConvert(file, folder.id);
                            }
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          role="presentation"
                        >
                          {isConverting ? (
                            <span className={styles.dropzoneConverting}>Convertendo...</span>
                          ) : (
                            <>
                              <span className={styles.dropzoneText}>Arraste um arquivo .docx aqui</span>
                              <span className={styles.dropzoneSubtext}>ou clique para selecionar</span>
                            </>
                          )}
                        </div>

                        <input
                          ref={fileInputRef}
                          className={styles.fileInput}
                          type="file"
                          accept=".docx"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file && activeUploadFolder) {
                              void handleFileConvert(file, activeUploadFolder);
                            }
                            event.target.value = '';
                          }}
                        />
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
      isOpen={preview.isOpen}
      onClose={() => setPreview((prev) => ({ ...prev, isOpen: false }))}
      size="lg"
      title={preview.mode === 'view' ? preview.title : `Preview — ${preview.fileName}`}
    >
      <div className={styles.previewModalContent}>
        {preview.mode === 'upload' && (
          <div className={styles.previewFormRow}>
            <div className={styles.previewField}>
              <label className={styles.previewLabel}>Título da atividade</label>
              <input
                type="text"
                className={styles.previewInput}
                value={preview.title}
                onChange={(event) => setPreview((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Nome da atividade"
              />
            </div>

            <div className={styles.previewFieldSmall}>
              <label className={styles.previewLabel}>Tipo</label>
              <select
                className={styles.previewInput}
                value={preview.type}
                onChange={(event) =>
                  setPreview((prev) => ({ ...prev, type: event.target.value as TemplateType }))
                }
              >
                <option value="EXERCISE">Exercício</option>
                <option value="WORKSPACE">Workspace</option>
              </select>
            </div>
          </div>
        )}

        <div className={styles.previewEditorWrapper}>
          <DocxPreviewEditor html={preview.html} editable={false} />
        </div>

        <div className={styles.previewNote}>
          ⚠️ Este é o visual exato que o aluno verá no workspace. O conteúdo será salvo ao clicar em "Salvar tudo".
        </div>

        {preview.mode === 'upload' && (
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setPreview((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSaveToQueue}
              disabled={!preview.title.trim()}
            >
              Salvar template
            </button>
          </div>
        )}

        {preview.mode === 'view' && (
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setPreview((prev) => ({ ...prev, isOpen: false }))}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </Modal>
    </>
  );
};
