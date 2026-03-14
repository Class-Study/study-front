import React, { useEffect, useMemo, useState } from 'react';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import levelProfileService from '@/services/api/levelProfile.service';
import {
  CreateLevelProfileRequest,
  LevelFolder,
  LevelProfile,
} from '@/types/levelProfile.types';
import styles from './NiveisTab.module.css';

type TemplateType = 'EXERCISE' | 'WORKSPACE';

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

interface ActivityTemplate {
  tempId: string;
  title: string;
  type: TemplateType;
  fileName?: string;
}

interface AddTemplateForm {
  title: string;
  type: TemplateType;
  file: File | null;
}

const createTempId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const DEFAULT_FOLDERS = (): NewFolderRow[] => [
  { tempId: createTempId(), name: '1 - TO DO', initialFiles: 3 },
  { tempId: createTempId(), name: '2 - IN PROGRESS', initialFiles: 0 },
  { tempId: createTempId(), name: '3 - DONE', initialFiles: 0 },
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
  folder.name?.trim() || `${index + 1} - Pasta`;

const getTemplateTypeLabel = (type: TemplateType): string =>
  type === 'EXERCISE' ? 'Exercício' : 'Workspace';

export const NiveisTab: React.FC = () => {
  const { levelProfiles, loading, error, fetchLevelProfiles } = useLevelProfiles();
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<NewLevelForm>(createInitialForm);
  const [expandedLevelId, setExpandedLevelId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, ActivityTemplate[]>>({});
  const [templateForms, setTemplateForms] = useState<Record<string, AddTemplateForm>>({});

  useEffect(() => {
    fetchLevelProfiles();
  }, [fetchLevelProfiles]);

  const existingCodes = useMemo(
    () => new Set(levelProfiles.map((profile) => profile.code.toLowerCase())),
    [levelProfiles],
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
            name: `${nextIndex} - NOVA PASTA`,
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

  const toggleExpanded = (levelId: string): void => {
    setExpandedLevelId((prev) => (prev === levelId ? null : levelId));
  };

  const openTemplateForm = (folderKey: string): void => {
    setTemplateForms((prev) => ({
      ...prev,
      [folderKey]: prev[folderKey] ?? {
        title: '',
        type: 'EXERCISE',
        file: null,
      },
    }));
  };

  const closeTemplateForm = (folderKey: string): void => {
    setTemplateForms((prev) => {
      const next = { ...prev };
      delete next[folderKey];
      return next;
    });
  };

  const updateTemplateForm = (folderKey: string, patch: Partial<AddTemplateForm>): void => {
    setTemplateForms((prev) => ({
      ...prev,
      [folderKey]: {
        title: prev[folderKey]?.title ?? '',
        type: prev[folderKey]?.type ?? 'EXERCISE',
        file: prev[folderKey]?.file ?? null,
        ...patch,
      },
    }));
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
    const folderKey = getFolderKey(level.id, folder.id);
    const templateForm = templateForms[folderKey];

    if (!templateForm || !templateForm.title.trim()) {
      return;
    }

    addTemplate(folderKey, {
      tempId: createTempId(),
      title: templateForm.title.trim(),
      type: templateForm.type,
      fileName: templateForm.file?.name,
    });

    console.log('Template criado:', {
      levelId: level.id,
      folderId: folder.id,
      title: templateForm.title.trim(),
      type: templateForm.type,
      fileName: templateForm.file?.name,
    });

    closeTemplateForm(folderKey);
  };

  return (
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
          const isExpanded = expandedLevelId === level.id;

          return (
            <article key={level.id} className={styles.levelCard}>
              <div className={styles.levelCardHeader}>
                <div className={styles.levelIcon}>{level.icon || '⭐'}</div>
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
                  title={level.isSystem ? 'Perfil de sistema' : 'Edição disponível em breve'}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.viewActivitiesBtn}
                  onClick={() => toggleExpanded(level.id)}
                >
                  {isExpanded ? 'Ocultar atividades' : 'Ver atividades'}
                </button>
              </div>

              {isExpanded && (
                <div className={styles.expandedSection}>
                  {folders.map((folder, index) => {
                    const folderKey = getFolderKey(level.id, folder.id);
                    const folderTemplates = templates[folderKey] ?? [];
                    const templateForm = templateForms[folderKey];

                    return (
                      <div key={folder.id} className={styles.expandedFolder}>
                        <div className={styles.expandedFolderHeader}>
                          <div className={styles.expandedFolderName}>📁 {getFolderName(folder, index)}</div>
                          <button
                            type="button"
                            className={styles.addTemplateBtn}
                            onClick={() => openTemplateForm(folderKey)}
                          >
                            + Template
                          </button>
                        </div>

                        {folderTemplates.length === 0 ? (
                          <div className={styles.emptyTemplates}>(vazio)</div>
                        ) : (
                          folderTemplates.map((template) => (
                            <div key={template.tempId} className={styles.templateItem}>
                              <div>
                                <div className={styles.templateTitle}>📄 {template.title}</div>
                                <div className={styles.templateType}>
                                  {getTemplateTypeLabel(template.type)}
                                  {template.fileName ? ` • ${template.fileName}` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                className={styles.removeTemplateBtn}
                                onClick={() => removeTemplate(folderKey, template.tempId)}
                                aria-label="Remover template"
                              >
                                🗑
                              </button>
                            </div>
                          ))
                        )}

                        {templateForm && (
                          <div className={styles.templateForm}>
                            <div className={styles.templateFormRow}>
                              <input
                                className={styles.templateInput}
                                type="text"
                                placeholder="Título da atividade"
                                value={templateForm.title}
                                onChange={(event) =>
                                  updateTemplateForm(folderKey, { title: event.target.value })
                                }
                              />
                              <select
                                className={styles.templateSelect}
                                value={templateForm.type}
                                onChange={(event) =>
                                  updateTemplateForm(folderKey, {
                                    type: event.target.value as TemplateType,
                                  })
                                }
                              >
                                <option value="EXERCISE">Exercício</option>
                                <option value="WORKSPACE">Workspace</option>
                              </select>
                              <label className={styles.fileUploadLabel}>
                                Arquivo .docx
                                <input
                                  className={styles.fileInput}
                                  type="file"
                                  accept=".docx"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null;
                                    updateTemplateForm(folderKey, { file });
                                  }}
                                />
                              </label>
                            </div>

                            {templateForm.file && (
                              <div className={styles.templateType}>{templateForm.file.name}</div>
                            )}

                            <div className={styles.templateFormActions}>
                              <button
                                type="button"
                                className={styles.templateCancelBtn}
                                onClick={() => closeTemplateForm(folderKey)}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.templateSaveBtn}
                                onClick={() => handleSaveTemplate(level, folder)}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
