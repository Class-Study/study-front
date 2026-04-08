import {useEffect, useMemo, useRef, useState} from 'react';
import * as mammoth from 'mammoth';
import {useLevelProfiles} from '@/hooks/useLevelProfiles.ts';
import levelProfileService from '@/services/api/levelProfile.service.ts';
import levelSubfolderService from '@/services/api/levelSubfolder.service.ts';
import type {
    CreateLevelProfileRequest,
    CreateSubfoldersBatchRequest,
    LevelFolderTemplate,
    LevelProfile,
    UpdateLevelProfileRequest,
    UpdateSubfolderWithContentsRequest,
    UpdateSubfolderExercisePayload,
    UpdateSubfolderMaterialPayload,
} from '@/types/levelProfile.types.ts';
import type {
    ModalTab,
    NewLevelForm,
    PendingMaterial,
    PendingSubfolder,
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
import Swal from 'sweetalert2';

export function useLevelTabState() {
    const {levelProfiles, loading, error, fetchLevelProfiles} = useLevelProfiles();
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
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [activeUploadSubfolder, setActiveUploadSubfolder] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // Subfolder CRUD state
    const [newSubfolderName, setNewSubfolderName] = useState<Record<string, string>>({});
    const [pendingSubfolders, setPendingSubfolders] = useState<Record<string, PendingSubfolder[]>>({});
    // Inner tab per subfolder
    const [subfolderInnerTab, setSubfolderInnerTab] = useState<Record<string, 'exercises' | 'materials'>>({});
    const [preview, setPreview] = useState<PreviewState>({...EMPTY_PREVIEW});
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ── Utility functions ──────────────────────────────────────────────────
    const getSwalColors = () => ({
        confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim() || '#d33',
        cancelButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--color-blue').trim() || '#3085d6',
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-bg-card').trim() || '#fff',
        colorText: getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#000',
    });

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
                            return {...folder, subfolders: prevFolder.subfolders};
                        }
                        return folder;
                    }),
                };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [levelProfiles]);


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
        setForm((prev) => ({...prev, name: value, code: toSlug(value)}));
    };

    const handleFieldChange = (field: Exclude<keyof NewLevelForm, 'folders'>, value: string): void => {
        setForm((prev) => ({...prev, [field]: value}));
    };

    const updateFolder = (tempId: string, value: string): void => {
        setForm((prev) => ({
            ...prev,
            folders: prev.folders.map((f) => (f.tempId === tempId ? {...f, name: value} : f)),
        }));
    };

    const addFolder = (): void => {
        setForm((prev) => {
            const nextIndex = prev.folders.length + 1;
            return {...prev, folders: [...prev.folders, {tempId: createTempId(), name: `${nextIndex} — NOVA PASTA`}]};
        });
    };

    const removeFolder = (tempId: string): void => {
        setForm((prev) => ({...prev, folders: prev.folders.filter((f) => f.tempId !== tempId)}));
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
        if (form.folders.some((f) => !f.name.trim())) {
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
                folders: form.folders.map((f, idx) => ({name: f.name, position: idx + 1})),
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
            const result = await mammoth.convertToHtml({arrayBuffer});
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
    const handleSaveTemplate = async (): Promise<void> => {
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
        };
        const compositeKey = preview.subfolderId;

        setPendingTemplates((prev) => ({
            ...prev,
            [compositeKey]: [...(prev[compositeKey] ?? []), newTemplate],
        }));

        setPreview({...EMPTY_PREVIEW});
        setActiveUploadSubfolder(null);
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
            mode: 'view',
        });
    };

    const removePendingTemplate = (subfolderId: string, tempId: string): void => {
        setPendingTemplates((prev) => ({
            ...prev,
            [subfolderId]: (prev[subfolderId] ?? []).filter((t) => t.tempId !== tempId),
        }));
    };


    // ── Save all ────────────────────────────────────────────────────────
    const handleSaveAll = async (): Promise<void> => {
        if (!selectedLevel) return;

        setSaving(true);
        setSaveError(null);

        try {
            let totalSaved = 0;
            let propagatedInBatch = false;

            // ── 1. Batch-create pending subfolders with their content ────────
            const pendingSubfolderEntries = Object.entries(pendingSubfolders).filter(
                ([, subs]) => subs.length > 0,
            );

            for (const [folderId, subs] of pendingSubfolderEntries) {
                const payload: CreateSubfoldersBatchRequest = {
                    subfolders: subs.map((sf, idx) => {
                        if (sf.propagateToStudents) propagatedInBatch = true;
                        return {
                            name: sf.name,
                            position: idx + 1,
                            propagateToStudents: sf.propagateToStudents,
                            exercises: (pendingTemplates[sf.tempId] ?? []).map((t) => ({
                                title: t.title,
                                type: 'EXERCISE' as const,
                                originalFilename: t.fileName ?? null,
                                convertedHtml: t.convertedHtml ?? null,
                            })),
                            materials: (pendingMaterials[sf.tempId] ?? []).map((m) => ({
                                title: m.title,
                                type: m.type,
                                url: m.url ?? null,
                                convertedHtml: m.convertedHtml ?? null,
                                originalFilename: m.originalFilename ?? null,
                                description: m.description ?? null,
                            })),
                        };
                    }),
                };

                // eslint-disable-next-line no-await-in-loop
                const response = await levelSubfolderService.createBatch(selectedLevel.id, folderId, payload);

                // Atualiza selectedLevel com as subpastas criadas
                if (response?.subfolders && Array.isArray(response.subfolders)) {
                    setSelectedLevel((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            folders: prev.folders.map((f) => {
                                if (f.id !== folderId) return f;
                                return {...f, subfolders: [...(f.subfolders ?? []), ...response.subfolders]};
                            }),
                        };
                    });
                }

                totalSaved += subs.length;

                // Limpa pendentes do batch
                const tempIds = subs.map((sf) => sf.tempId);
                setPendingSubfolders((prev) => ({...prev, [folderId]: []}));
                setPendingTemplates((prev) => {
                    const next = {...prev};
                    tempIds.forEach((id) => {
                        delete next[id];
                    });
                    return next;
                });
                setPendingMaterials((prev) => {
                    const next = {...prev};
                    tempIds.forEach((id) => {
                        delete next[id];
                    });
                    return next;
                });
            }

            void fetchLevelProfiles();

            setSaveSuccessMessage(
                propagatedInBatch
                    ? `✓ ${totalSaved} subpastas salvas e atribuídas aos alunos deste nível.`
                    : `✓ ${totalSaved} subpastas salvas com sucesso`,
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
        if (editForm.folders.some((f) => !f.name.trim())) {
            setEditError('Todas as pastas precisam ter nome.');
            return false;
        }
        setEditError('');
        return true;
    };

    const updateEditField = (field: Exclude<keyof NewLevelForm, 'folders'>, value: string): void => {
        setEditForm((prev) => ({...prev, [field]: value}));
    };

    const updateEditFolder = (tempId: string, value: string): void => {
        setEditForm((prev) => ({
            ...prev,
            folders: prev.folders.map((f) => (f.tempId === tempId ? {...f, name: value} : f)),
        }));
    };

    const addEditFolder = (): void => {
        setEditForm((prev) => {
            const nextIndex = prev.folders.length + 1;
            return {...prev, folders: [...prev.folders, {tempId: createTempId(), name: `${nextIndex} — NOVA PASTA`}]};
        });
    };

    const removeEditFolder = (tempId: string): void => {
        setEditForm((prev) => ({...prev, folders: prev.folders.filter((f) => f.tempId !== tempId)}));
    };

    const handleSaveLevelChanges = async (): Promise<void> => {
        if (!selectedLevel || selectedLevel.isSystem || !validateEditForm()) return;
        setSavingEdit(true);
        try {
            const payload: UpdateLevelProfileRequest = {
                name: editForm.name,
                icon: editForm.icon || '⭐',
                description: editForm.description || undefined,
                folders: editForm.folders.map((f, index) => ({name: f.name, position: index + 1})),
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
        if (!name) return;

        const tempId = createTempId();
        const newPending: PendingSubfolder = {tempId, folderId, name, propagateToStudents: false};

        setPendingSubfolders((prev) => ({
            ...prev,
            [folderId]: [...(prev[folderId] ?? []), newPending],
        }));
        setNewSubfolderName((prev) => ({...prev, [folderId]: ''}));
    };

    const handleDeletePendingSubfolder = (folderId: string, tempId: string): void => {
        setPendingSubfolders((prev) => ({
            ...prev,
            [folderId]: (prev[folderId] ?? []).filter((sf) => sf.tempId !== tempId),
        }));
        setPendingTemplates((prev) => {
            const next = {...prev};
            delete next[tempId];
            return next;
        });
        setPendingMaterials((prev) => {
            const next = {...prev};
            delete next[tempId];
            return next;
        });
    };

    const handleRenamePendingSubfolder = (folderId: string, tempId: string, newName: string): void => {
        setPendingSubfolders((prev) => ({
            ...prev,
            [folderId]: (prev[folderId] ?? []).map((sf) =>
                sf.tempId === tempId ? {...sf, name: newName} : sf,
            ),
        }));
    };

    const handleTogglePropagateSubfolder = (folderId: string, tempId: string): void => {
        setPendingSubfolders((prev) => ({
            ...prev,
            [folderId]: (prev[folderId] ?? []).map((sf) =>
                sf.tempId === tempId ? {...sf, propagateToStudents: !sf.propagateToStudents} : sf,
            ),
        }));
    };


    const handleRenameSubfolder = async (folderId: string, subfolderId: string, newName: string): Promise<void> => {
        if (!selectedLevel || !newName.trim()) return;

        try {
            await levelSubfolderService.update(selectedLevel.id, folderId, subfolderId, {name: newName.trim()});
            await fetchLevelProfiles();
        } catch {
            setSaveError('Erro ao renomear.');
        }
    };

    const handleDeleteSubfolder = async (folderId: string, subfolderId: string, subfolderName: string): Promise<void> => {
        if (!selectedLevel) return;

        const {confirmButtonColor, cancelButtonColor, backgroundColor, colorText} = getSwalColors();

        const result = await Swal.fire({
            title: `Deletar "${subfolderName}"?`,
            text: 'Todo o conteúdo dentro será removido. Esta ação não pode ser desfeita!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor,
            cancelButtonColor,
            confirmButtonText: 'Sim, deletar',
            color: colorText,
            cancelButtonText: 'Cancelar',
            background: backgroundColor,
            focusCancel: true,
        });
        if (!result.isConfirmed) return;
        try {
            // Optimistic update: remove a subpasta imediatamente do state
            setSelectedLevel((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    folders: prev.folders.map((folder) => {
                        if (folder.id !== folderId) return folder;
                        return {
                            ...folder,
                            subfolders: (folder.subfolders ?? []).filter((sf) => sf.id !== subfolderId),
                        };
                    }),
                };
            });
            // Faz a requisição de delete
            await levelSubfolderService.delete(selectedLevel.id, folderId, subfolderId);
            // Sincroniza com o servidor
            await fetchLevelProfiles();
            // Feedback de sucesso
            setSaveSuccessMessage('✓ Subpasta removida com sucesso');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSaveError('Erro ao deletar subpasta. Tente novamente.');
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    const handleDeleteTemplate = async (folderId: string, subfolderId: string, templateId: string, templateTitle: string): Promise<void> => {
        if (!selectedLevel) return;

        const {confirmButtonColor, cancelButtonColor, backgroundColor, colorText} = getSwalColors();
        const result = await Swal.fire({
            title: `Deletar exercício?`,
            text: `"${templateTitle}" será removido permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor,
            cancelButtonColor,
            confirmButtonText: 'Sim, deletar',
            color: colorText,
            cancelButtonText: 'Cancelar',
            background: backgroundColor,
            focusCancel: true,
        });
        if (!result.isConfirmed) return;

        const currentSubfolder = selectedLevel.folders
            .find((f) => f.id === folderId)
            ?.subfolders?.find((sf) => sf.id === subfolderId);

        const exercises: UpdateSubfolderExercisePayload[] = (currentSubfolder?.templates ?? [])
            .filter((t) => t.id !== templateId)
            .map((t) => ({ id: t.id, title: t.title, type: t.type }));

        const materials: UpdateSubfolderMaterialPayload[] = (currentSubfolder?.studyMaterials ?? [])
            .map((m) => ({ id: m.id, title: m.title, type: m.type }));

        const payload: UpdateSubfolderWithContentsRequest = {
            name: currentSubfolder?.name ?? '',
            propagateToStudents: false,
            exercises,
            materials,
            deletedExerciseIds: [templateId],
            deletedMaterialIds: [],
        };

        // Optimistic update
        setSelectedLevel((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                folders: prev.folders.map((folder) => {
                    if (folder.id !== folderId) return folder;
                    return {
                        ...folder,
                        subfolders: (folder.subfolders ?? []).map((sf) => {
                            if (sf.id !== subfolderId) return sf;
                            return {...sf, templates: (sf.templates ?? []).filter((t) => t.id !== templateId)};
                        }),
                    };
                }),
            };
        });

        try {
            await levelSubfolderService.updateWithContents(selectedLevel.id, folderId, subfolderId, payload);
            setSelectedLevel((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    folders: prev.folders.map((f) =>
                        f.id === folderId ? {...f, subfolders: []} : f,
                    ),
                };
            });
            await fetchLevelProfiles();
            setSaveSuccessMessage('✓ Exercício removido com sucesso');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            await fetchLevelProfiles();
            setSaveError('Erro ao remover exercício. Tente novamente.');
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    const handleDeleteMaterial = async (folderId: string, subfolderId: string, materialId: string, materialTitle: string): Promise<void> => {
        if (!selectedLevel) return;

        const {confirmButtonColor, cancelButtonColor, backgroundColor, colorText} = getSwalColors();
        const result = await Swal.fire({
            title: `Deletar material?`,
            text: `"${materialTitle}" será removido permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor,
            cancelButtonColor,
            confirmButtonText: 'Sim, deletar',
            color: colorText,
            cancelButtonText: 'Cancelar',
            background: backgroundColor,
            focusCancel: true,
        });
        if (!result.isConfirmed) return;

        const currentSubfolder = selectedLevel.folders
            .find((f) => f.id === folderId)
            ?.subfolders?.find((sf) => sf.id === subfolderId);

        const exercises: UpdateSubfolderExercisePayload[] = (currentSubfolder?.templates ?? [])
            .map((t) => ({ id: t.id, title: t.title, type: t.type }));

        const materials: UpdateSubfolderMaterialPayload[] = (currentSubfolder?.studyMaterials ?? [])
            .filter((m) => m.id !== materialId)
            .map((m) => ({ id: m.id, title: m.title, type: m.type }));

        const payload: UpdateSubfolderWithContentsRequest = {
            name: currentSubfolder?.name ?? '',
            propagateToStudents: false,
            exercises,
            materials,
            deletedExerciseIds: [],
            deletedMaterialIds: [materialId],
        };

        // Optimistic update
        setSelectedLevel((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                folders: prev.folders.map((folder) => {
                    if (folder.id !== folderId) return folder;
                    return {
                        ...folder,
                        subfolders: (folder.subfolders ?? []).map((sf) => {
                            if (sf.id !== subfolderId) return sf;
                            return {...sf, studyMaterials: (sf.studyMaterials ?? []).filter((m) => m.id !== materialId)};
                        }),
                    };
                }),
            };
        });

        try {
            await levelSubfolderService.updateWithContents(selectedLevel.id, folderId, subfolderId, payload);
            setSelectedLevel((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    folders: prev.folders.map((f) =>
                        f.id === folderId ? {...f, subfolders: []} : f,
                    ),
                };
            });
            await fetchLevelProfiles();
            setSaveSuccessMessage('✓ Material removido com sucesso');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            await fetchLevelProfiles();
            setSaveError('Erro ao remover material. Tente novamente.');
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    const clearPendingForSubfolder = (subfolderId: string): void => {
        setPendingTemplates((prev) => {
            const next = {...prev};
            delete next[subfolderId];
            return next;
        });
        setPendingMaterials((prev) => {
            const next = {...prev};
            delete next[subfolderId];
            return next;
        });
    };

    const handleSaveSubfolderEdits = async (
        folderId: string,
        subfolderId: string,
        newName: string,
        originalName: string,
        propagateToStudents: boolean = false,
        deletedExerciseIds: string[] = [],
        deletedMaterialIds: string[] = [],
    ): Promise<void> => {
        if (!selectedLevel) return;

        const currentFolder = selectedLevel.folders.find((f) => f.id === folderId);
        const currentSubfolder = currentFolder?.subfolders?.find((sf) => sf.id === subfolderId);
        const existingTemplates = currentSubfolder?.templates ?? [];
        const existingMaterials = currentSubfolder?.studyMaterials ?? [];

        const exercises: UpdateSubfolderExercisePayload[] = [
            ...existingTemplates
                .filter((t) => !deletedExerciseIds.includes(t.id))
                .map((t) => ({ id: t.id, title: t.title, type: t.type })),
            ...(pendingTemplates[subfolderId] ?? []).map((t) => ({
                title: t.title,
                type: t.type,
                originalFilename: t.fileName ?? null,
                convertedHtml: t.convertedHtml ?? null,
            })),
        ];

        const materials: UpdateSubfolderMaterialPayload[] = [
            ...existingMaterials
                .filter((m) => !deletedMaterialIds.includes(m.id))
                .map((m) => ({ id: m.id, title: m.title, type: m.type })),
            ...(pendingMaterials[subfolderId] ?? []).map((m) => ({
                title: m.title,
                type: m.type,
                url: m.url ?? null,
                convertedHtml: m.convertedHtml ?? null,
                originalFilename: m.originalFilename ?? null,
                description: m.description ?? null,
            })),
        ];

        const payload: UpdateSubfolderWithContentsRequest = {
            name: newName.trim() || originalName,
            propagateToStudents,
            exercises,
            materials,
            deletedExerciseIds,
            deletedMaterialIds,
        };

        try {
            await levelSubfolderService.updateWithContents(
                selectedLevel.id,
                folderId,
                subfolderId,
                payload,
            );

            // Zera as subpastas da pasta afetada para forçar o useEffect
            // a usar os dados frescos do servidor (evita que o cache preserve itens deletados)
            setSelectedLevel((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    folders: prev.folders.map((f) =>
                        f.id === folderId ? {...f, subfolders: []} : f,
                    ),
                };
            });

            clearPendingForSubfolder(subfolderId);
            await fetchLevelProfiles();
            setSaveSuccessMessage('✓ Subpasta atualizada com sucesso');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch {
            setSaveError('Erro ao salvar alterações da subpasta. Tente novamente.');
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    // ── Derived values ──────────────────────────────────────────────────
    const selectedLevelToneClass = selectedLevel ? getLevelToneClass(getLevelTone(selectedLevel.code)) : '';

    const hasPendingContent = Object.values(pendingSubfolders).some((list) => list.length > 0);

    const hasPendingPropagation = Object.values(pendingSubfolders).some((list) =>
        list.some((sf) => sf.propagateToStudents),
    );

    const totalPending = Object.values(pendingSubfolders).reduce((acc, list) => acc + list.length, 0);

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
        handleDeleteTemplate,
        handleDeleteMaterial,
        handleSaveSubfolderEdits,
        clearPendingForSubfolder,

        // Preview
        preview,
        setPreview,
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
        handleCreateSubfolder,
        pendingSubfolders,
        handleDeletePendingSubfolder,
        handleRenamePendingSubfolder,
        handleTogglePropagateSubfolder,
        handleRenameSubfolder,
        handleDeleteSubfolder,

        // Subfolder inner tab
        subfolderInnerTab,
        setSubfolderInnerTab,

        // Utils exposed for convenience
        toSlug,
    };
}
