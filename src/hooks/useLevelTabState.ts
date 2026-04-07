import { useEffect, useMemo, useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import { useLevelProfiles } from '@/hooks/useLevelProfiles.ts';
import levelFolderTemplateService from '@/services/api/levelFolderTemplate.service.ts';
import levelProfileService from '@/services/api/levelProfile.service.ts';
import levelSubfolderService from '@/services/api/levelSubfolder.service.ts';
import studyMaterialService from '@/services/api/studyMaterial.service.ts';
import type {
  CreateLevelProfileRequest,
  LevelFolderTemplate,
  LevelProfile,
  UpdateLevelProfileRequest,
} from '@/types/levelProfile.types.ts';
import type {
  ModalTab,
  NewLevelForm,
  PendingMaterial,
  PendingTemplateExtended,
  PreviewState,
} from '../types/levelTab.types.ts';
import {
  createEditForm,
  createInitialForm,
  createTempId,
  EMPTY_PREVIEW,
  getLevelTone,
  getLevelToneClass,
  isDocxFile,
  toSlug,
} from '../utils/levelTab.utils.ts';

export function useLevelTabState() {
  const { levelProfiles, loading, error, fetchLevelProfiles } = useLevelProfiles();
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<NewLevelForm>(createInitialForm);
  const [pendingTemplates, setPendingTemplates] = useState<Record<string, PendingTemplateExtended[]>>({});
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, PendingMaterial[]>>({});
  const [selectedLevel, setSelectedLevel] = useState<LevelProfile | null>(null);
  const [managementTab, setManagementTab] = useState<ModalTab>('activities');
  const [editForm, setEditForm] = useState<NewLevelForm>(createInitialForm);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isPropagateModalOpen, setIsPropagateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activeUploadSubfolder, setActiveUploadSubfolder] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Subfolder CRUD state
  const [newSubfolderName, setNewSubfolderName] = useState<Record<string, string>>({});
  const [creatingSubfolder, setCreatingSubfolder] = useState<string | null>(null);
  const [editingSubfolderId, setEditingSubfolderId] = useState<string | null>(null);
  const [editingSubfolderName, setEditingSubfolderName] = useState('');
  // Inner tab per subfolder
  const [subfolderInnerTab, setSubfolderInnerTab] = useState<Record<string, 'exercises' | 'materials'>>({});
  const [preview, setPreview] = useState<PreviewState>({ ...EMPTY_PREVIEW });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLevelProfiles();
  }, [fetchLevelProfiles]);

  useEffect(() => {
    if (!selectedLevel) return;
    const updated = levelProfiles.find((p) => p.id === selectedLevel.id);
    if (updated) {
      setSelectedLevel((prev) => {
        if (!prev) return updated;
        return {
          ...updated,
          folders: updated.folders.map((folder) => {
            const prevFolder = prev.folders.find((f) => f.id === folder.id);
            if (prevFolder?.subfolders && prevFolder.subfolders.length > 0) {
              return { ...folder, subfolders: prevFolder.subfolders };
            }
            return folder;
          }),
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelProfiles]);

  useEffect(() => {
    if (!isPropagateModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !savingTemplate) {
        setIsPropagateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPropagateModalOpen, savingTemplate]);

  // ── Memos ────────────────────────────────────────────────────────────
  const existingCodes = useMemo(
    () => new Set(levelProfiles.map((p) => p.code.toLowerCase())),
    [levelProfiles],
  );

  const editableCodes = useMemo(
    () => new Set(levelProfiles.filter((p) => p.id !== selectedLevel?.id).map((p) => p.code.toLowerCase())),
    [levelProfiles, selectedLevel?.id],
  );

  // ── Create form handlers ────────────────────────────────────────────
  const resetForm = (): void => {
    setForm(createInitialForm());
    setFormError('');
  };

  const toggleForm = (): void => {
    if (showForm) resetForm();
    setShowForm((prev) => !prev);
  };

  const handleNameChange = (value: string): void => {
    setForm((prev) => ({ ...prev, name: value, code: toSlug(value) }));
  };

  const handleFieldChange = (field: Exclude<keyof NewLevelForm, 'folders'>, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFolder = (tempId: string, value: string): void => {
    setForm((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.tempId === tempId ? { ...f, name: value } : f)),
    }));
  };

  const addFolder = (): void => {
    setForm((prev) => {
      const nextIndex = prev.folders.length + 1;
      return { ...prev, folders: [...prev.folders, { tempId: createTempId(), name: `${nextIndex} — NOVA PASTA` }] };
    });
  };

  const removeFolder = (tempId: string): void => {
    setForm((prev) => ({ ...prev, folders: prev.folders.filter((f) => f.tempId !== tempId) }));
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) { setFormError('Nome é obrigatório.'); return false; }
    if (!form.code.trim()) { setFormError('Código é obrigatório.'); return false; }
    if (existingCodes.has(form.code.toLowerCase())) { setFormError('Já existe um perfil com esse código.'); return false; }
    if (form.folders.length === 0) { setFormError('Adicione ao menos uma pasta.'); return false; }
    if (form.folders.some((f) => !f.name.trim())) { setFormError('Todas as pastas precisam ter nome.'); return false; }
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
        folders: form.folders.map((f, idx) => ({ name: f.name, position: idx + 1 })),
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

  // ── Management modal ────────────────────────────────────────────────
  const openManagementModal = async (level: LevelProfile, tab: ModalTab): Promise<void> => {
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
    setActiveUploadSubfolder(null);
    setIsConverting(false);
    setIsDragging(false);
  };

  // ── File convert ────────────────────────────────────────────────────
  const handleFileConvert = async (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material'): Promise<void> => {
    if (!isDocxFile(file)) return;
    setIsConverting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const isMaterial = contentMode === 'material';
      setPreview({
        isOpen: true,
        html: result.value,
        fileName: file.name,
        folderId,
        subfolderId,
        title: file.name.replace(/\.docx$/i, '').replace(/_/g, ' '),
        type: 'EXERCISE',
        materialType: isMaterial ? 'DOCUMENT' : undefined,
        propagateToStudents: false,
        mode: isMaterial ? 'upload_material' : 'upload_exercise',
      });
    } catch (err) {
      console.error('Erro ao converter .docx:', err);
    } finally {
      setIsConverting(false);
      setIsDragging(false);
    }
  };

  // ── Template save ───────────────────────────────────────────────────
  const handleSaveTemplate = async (propagate: boolean): Promise<void> => {
    if (!preview.title.trim()) return;
    setSavingTemplate(true);
    const newTemplate: PendingTemplateExtended = {
      tempId: createTempId(),
      folderId: preview.folderId,
      subfolderId: preview.subfolderId,
      title: preview.title.trim(),
      type: preview.type,
      fileName: preview.fileName,
      convertedHtml: preview.html,
      propagateToStudents: propagate,
    };
    const compositeKey = preview.subfolderId;
    setPendingTemplates((prev) => ({
      ...prev,
      [compositeKey]: [...(prev[compositeKey] ?? []), newTemplate],
    }));
    setPreview({ ...EMPTY_PREVIEW });
    setActiveUploadSubfolder(null);
    setIsPropagateModalOpen(false);
    setSavingTemplate(false);
  };

  const handleViewSavedTemplate = (template: LevelFolderTemplate, folderId: string, subfolderId: string): void => {
    setPreview({
      isOpen: true,
      html: template.convertedHtml ?? '',
      fileName: template.originalFilename ?? template.title,
      folderId,
      subfolderId,
      title: template.title,
      type: template.type,
      propagateToStudents: false,
      mode: 'view',
    });
  };

  const removePendingTemplate = (subfolderId: string, tempId: string): void => {
    setPendingTemplates((prev) => ({
      ...prev,
      [subfolderId]: (prev[subfolderId] ?? []).filter((t) => t.tempId !== tempId),
    }));
  };

  // ── Delete material / template ──────────────────────────────────────
  const handleDeleteMaterial = async (profileId: string, folderId: string, subfolderId: string, materialId: string): Promise<void> => {
    try {
      await studyMaterialService.delete(profileId, folderId, subfolderId, materialId);
      setSelectedLevel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          folders: prev.folders.map((folder) => {
            if (folder.id !== folderId) return folder;
            const updatedSubfolders = (folder.subfolders ?? []).map((sf) => {
              if (sf.id !== subfolderId) return sf;
              return { ...sf, studyMaterials: sf.studyMaterials?.filter((m) => m.id !== materialId) ?? [] };
            });
            return { ...folder, subfolders: updatedSubfolders };
          }),
        };
      });
      void fetchLevelProfiles();
      setSaveSuccessMessage('✓ Material removido com sucesso');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao deletar material:', error);
      setSaveError('Erro ao remover material. Tente novamente.');
      setTimeout(() => setSaveError(null), 5000);
    }
  };

  const handleDeleteTemplate = async (profileId: string, folderId: string, subfolderId: string, templateId: string): Promise<void> => {
    try {
      await levelFolderTemplateService.deleteFromSubfolder(profileId, folderId, subfolderId, templateId);
      await fetchLevelProfiles();
    } catch {
      console.error('Erro ao deletar template');
    }
  };

  // ── Save all ────────────────────────────────────────────────────────
  const handleSaveAll = async (): Promise<void> => {
    if (!selectedLevel) return;

    const allSubfolderIds = new Set<string>();
    selectedLevel.folders.forEach((folder) => {
      (folder.subfolders ?? []).forEach((sf) => allSubfolderIds.add(sf.id));
    });

    const pendingTemplateEntries = Object.entries(pendingTemplates).filter(([key]) => allSubfolderIds.has(key));
    const pendingMaterialEntries = Object.entries(pendingMaterials).filter(([key]) => allSubfolderIds.has(key));

    setSaving(true);
    setSaveError(null);

    try {
      const promises: Promise<void>[] = [];
      let propagatedInBatch = false;
      let totalSaved = 0;

      pendingTemplateEntries.forEach(([subfolderKey, templates]) => {
        templates.forEach((template) => {
          const promise = levelFolderTemplateService
            .createInSubfolder(selectedLevel.id, template.folderId, template.subfolderId, {
              title: template.title,
              type: template.type,
              ...(template.fileName ? { originalFilename: template.fileName } : {}),
              convertedHtml: template.convertedHtml,
              propagateToStudents: template.propagateToStudents,
            })
            .then(() => {
              if (template.propagateToStudents) propagatedInBatch = true;
              setPendingTemplates((prev) => ({
                ...prev,
                [subfolderKey]: (prev[subfolderKey] ?? []).filter((item) => item.tempId !== template.tempId),
              }));
              totalSaved++;
            });
          promises.push(promise);
        });
      });

      pendingMaterialEntries.forEach(([subfolderKey, materials]) => {
        materials.forEach((material) => {
          let targetFolderId = '';
          for (const folder of selectedLevel.folders) {
            if ((folder.subfolders ?? []).some((sf) => sf.id === subfolderKey)) {
              targetFolderId = folder.id;
              break;
            }
          }
          if (targetFolderId) {
            const promise = studyMaterialService
              .create(selectedLevel.id, targetFolderId, subfolderKey, {
                title: material.title,
                type: material.type,
                url: material.url,
                convertedHtml: material.convertedHtml,
                originalFilename: material.originalFilename,
                description: material.description,
                propagateToStudents: material.propagateToStudents,
              })
              .then(() => {
                setPendingMaterials((prev) => ({
                  ...prev,
                  [subfolderKey]: (prev[subfolderKey] ?? []).filter((item) => item.tempId !== material.tempId),
                }));
                totalSaved++;
              });
            promises.push(promise);
          }
        });
      });

      await Promise.all(promises);
      void fetchLevelProfiles();

      setSaveSuccessMessage(
        propagatedInBatch
          ? `✓ ${totalSaved} itens salvos e atribuídos aos alunos atuais deste nível.`
          : `✓ ${totalSaved} itens salvos com sucesso`,
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Erro ao salvar alguns itens. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit form handlers ──────────────────────────────────────────────
  const validateEditForm = (): boolean => {
    if (!editForm.name.trim()) { setEditError('Nome é obrigatório.'); return false; }
    if (editForm.folders.length === 0) { setEditError('Adicione ao menos uma pasta.'); return false; }
    if (editableCodes.has(editForm.code.toLowerCase())) { setEditError('Já existe outro perfil com esse código.'); return false; }
    if (editForm.folders.some((f) => !f.name.trim())) { setEditError('Todas as pastas precisam ter nome.'); return false; }
    setEditError('');
    return true;
  };

  const updateEditField = (field: Exclude<keyof NewLevelForm, 'folders'>, value: string): void => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditFolder = (tempId: string, value: string): void => {
    setEditForm((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.tempId === tempId ? { ...f, name: value } : f)),
    }));
  };

  const addEditFolder = (): void => {
    setEditForm((prev) => {
      const nextIndex = prev.folders.length + 1;
      return { ...prev, folders: [...prev.folders, { tempId: createTempId(), name: `${nextIndex} — NOVA PASTA` }] };
    });
  };

  const removeEditFolder = (tempId: string): void => {
    setEditForm((prev) => ({ ...prev, folders: prev.folders.filter((f) => f.tempId !== tempId) }));
  };

  const handleSaveLevelChanges = async (): Promise<void> => {
    if (!selectedLevel || selectedLevel.isSystem || !validateEditForm()) return;
    setSavingEdit(true);
    try {
      const payload: UpdateLevelProfileRequest = {
        name: editForm.name,
        icon: editForm.icon || '⭐',
        description: editForm.description || undefined,
        folders: editForm.folders.map((f, index) => ({ name: f.name, position: index + 1 })),
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

  // ── Subfolder CRUD handlers ─────────────────────────────────────────
  const handleCreateSubfolder = async (folderId: string): Promise<void> => {
    const name = (newSubfolderName[folderId] ?? '').trim();
    if (!name || !selectedLevel) return;
    setCreatingSubfolder(folderId);
    try {
      await levelSubfolderService.create(selectedLevel.id, folderId, { name });
      setNewSubfolderName((prev) => ({ ...prev, [folderId]: '' }));
      await fetchLevelProfiles();
    } catch {
      setSaveError('Erro ao criar subpasta.');
    } finally {
      setCreatingSubfolder(null);
    }
  };

  const handleRenameSubfolder = async (folderId: string, subfolderId: string): Promise<void> => {
    if (!selectedLevel || !editingSubfolderName.trim()) return;
    try {
      await levelSubfolderService.update(selectedLevel.id, folderId, subfolderId, { name: editingSubfolderName.trim() });
      await fetchLevelProfiles();
    } catch {
      setSaveError('Erro ao renomear.');
    }
    setEditingSubfolderId(null);
  };

  const handleDeleteSubfolder = async (folderId: string, subfolderId: string, subfolderName: string): Promise<void> => {
    if (!selectedLevel || !confirm(`Deletar "${subfolderName}" e todo o conteúdo dentro?`)) return;
    try {
      await levelSubfolderService.delete(selectedLevel.id, folderId, subfolderId);
      await fetchLevelProfiles();
    } catch {
      setSaveError('Erro ao deletar subpasta.');
    }
  };

  // ── Derived values ──────────────────────────────────────────────────
  const selectedLevelToneClass = selectedLevel ? getLevelToneClass(getLevelTone(selectedLevel.code)) : '';

  const allSubfolderIds = new Set<string>();
  selectedLevel?.folders.forEach((folder) => {
    (folder.subfolders ?? []).forEach((sf) => allSubfolderIds.add(sf.id));
  });

  const selectedPendingTemplates = Object.entries(pendingTemplates).filter(([key]) => allSubfolderIds.has(key));
  const selectedPendingMaterials = Object.entries(pendingMaterials).filter(([key]) => allSubfolderIds.has(key));

  const hasPendingTemplates = selectedPendingTemplates.some(([, list]) => list.length > 0);
  const hasPendingMaterials = selectedPendingMaterials.some(([, list]) => list.length > 0);
  const hasPendingContent = hasPendingTemplates || hasPendingMaterials;

  const hasPendingPropagation = selectedPendingTemplates.some(([, list]) =>
    list.some((t) => t.propagateToStudents),
  );

  const totalPendingTemplates = selectedPendingTemplates.reduce((acc, [, list]) => acc + list.length, 0);
  const totalPendingMaterials = selectedPendingMaterials.reduce((acc, [, list]) => acc + list.length, 0);
  const totalPending = totalPendingTemplates + totalPendingMaterials;

  return {
    // Data
    levelProfiles,
    loading,
    error,
    selectedLevel,
    selectedLevelToneClass,

    // Create form
    showForm,
    form,
    formError,
    creating,
    toggleForm,
    handleNameChange,
    handleFieldChange,
    updateFolder,
    addFolder,
    removeFolder,
    handleCreateLevel,
    resetForm,

    // Management modal
    managementTab,
    setManagementTab,
    openManagementModal,
    closeManagementModal,

    // Edit form
    editForm,
    editError,
    savingEdit,
    updateEditField,
    updateEditFolder,
    addEditFolder,
    removeEditFolder,
    handleSaveLevelChanges,

    // Activities tab
    pendingTemplates,
    pendingMaterials,
    setPendingMaterials,
    saving,
    saveError,
    saveSuccess,
    saveSuccessMessage,
    hasPendingContent,
    hasPendingPropagation,
    totalPending,
    handleSaveAll,

    // Template / material CRUD
    handleFileConvert,
    handleSaveTemplate,
    handleViewSavedTemplate,
    removePendingTemplate,
    handleDeleteMaterial,
    handleDeleteTemplate,

    // Preview
    preview,
    setPreview,
    isPropagateModalOpen,
    setIsPropagateModalOpen,
    savingTemplate,
    fileInputRef,

    // Upload state
    activeUploadSubfolder,
    setActiveUploadSubfolder,
    isConverting,
    isDragging,
    setIsDragging,

    // Subfolder CRUD
    newSubfolderName,
    setNewSubfolderName,
    creatingSubfolder,
    handleCreateSubfolder,
    editingSubfolderId,
    setEditingSubfolderId,
    editingSubfolderName,
    setEditingSubfolderName,
    handleRenameSubfolder,
    handleDeleteSubfolder,

    // Subfolder inner tab
    subfolderInnerTab,
    setSubfolderInnerTab,

    // Utils exposed for convenience
    toSlug,
  };
}

export type LevelTabState = ReturnType<typeof useLevelTabState>;


