import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as mammoth from 'mammoth';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor.tsx';
import { Modal } from '@/components/ui/Modal/Modal.tsx';
import { useLevelProfiles } from '@/hooks/useLevelProfiles.ts';
import levelFolderTemplateService from '@/services/api/levelFolderTemplate.service.ts';
import levelProfileService from '@/services/api/levelProfile.service.ts';
import studyMaterialService from '@/services/api/studyMaterial.service.ts';
import {
  CreateLevelProfileRequest,
  LevelFolder,
  LevelFolderTemplate,
  LevelProfile,
  LevelSubfolder,
  UpdateLevelProfileRequest,
} from '@/types/levelProfile.types.ts';
import styles from './LevelTab.module.css';

type TemplateType = 'EXERCISE' | 'WORKSPACE';
type MaterialType = 'VIDEO' | 'DOCUMENT' | 'LINK';
type ModalTab = 'activities' | 'edit';

interface NewFolderRow {
  tempId: string;
  name: string;
}

interface NewLevelForm {
  name: string;
  icon: string;
  code: string;
  description: string;
  folders: NewFolderRow[];
}

interface PendingMaterial {
  tempId: string;
  subfolderId: string;
  title: string;
  type: MaterialType;
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  propagateToStudents: boolean;
}

interface PendingTemplateExtended {
  tempId: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: TemplateType;
  fileName: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}

interface PreviewState {
  isOpen: boolean;
  html: string;
  fileName: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: TemplateType;
  materialType?: MaterialType;
  url?: string;
  description?: string;
  propagateToStudents: boolean;
  mode: 'upload_exercise' | 'upload_material' | 'view' | 'freetext_exercise' | 'link_material';
}

const createTempId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Função para migrar estrutura antiga para nova (para compatibilidade)
const migrateToNewStructure = (folder: LevelFolder): LevelFolder => {
  // Se já tem subfolders e elas têm conteúdo, usar as existentes
  if (folder.subfolders && folder.subfolders.length > 0) {
    return folder;
  }

  // Criar subpastas padrão sempre
  const exercisesSubfolder: LevelSubfolder = {
    id: 'exercises', // Usar ID fixo que corresponde ao backend
    name: 'Exercícios',
    type: 'EXERCISES',
    position: 1,
    templates: folder.templates ?? [], // Migrar templates existentes
    studyMaterials: [],
  };

  const materialsSubfolder: LevelSubfolder = {
    id: 'materials', // Usar ID fixo que corresponde ao backend
    name: 'Material de Estudos', 
    type: 'STUDY_MATERIALS',
    position: 2,
    templates: [],
    studyMaterials: [], // Será preenchido pela API
  };


  return {
    ...folder,
    subfolders: [exercisesSubfolder, materialsSubfolder],
    templates: folder.templates ?? [], // Manter para compatibilidade
  };
};

const DEFAULT_FOLDERS = (): NewFolderRow[] => [
  { tempId: createTempId(), name: '1 — TO DO' },
  { tempId: createTempId(), name: '2 — IN PROGRESS' },
  { tempId: createTempId(), name: '3 — DONE' },
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

const getFolderName = (folder: LevelFolder, index: number): string => {
  return folder.name || `Pasta ${index + 1}`;
};

const getTemplateTypeLabel = (type: TemplateType): string =>
  type === 'EXERCISE' ? 'Exercício' : 'Workspace';

const getMaterialTypeLabel = (type: MaterialType): string => {
  switch (type) {
    case 'VIDEO': return 'Vídeo';
    case 'DOCUMENT': return 'Documento';
    case 'LINK': return 'Link Externo';
    default: return 'Material';
  }
};

// Função para converter tipo do backend para tipo local
const convertMaterialType = (backendType: string): MaterialType => {
  switch (backendType.toUpperCase()) {
    case 'VIDEO': return 'VIDEO';
    case 'DOCUMENT': return 'DOCUMENT';
    case 'LINK': return 'LINK';
    default: return 'LINK';
  }
};

const getSubfolderIcon = (type: 'EXERCISES' | 'STUDY_MATERIALS'): string =>
  type === 'EXERCISES' ? '📝' : '📚';

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
  })),
});

export const LevelTab: React.FC = () => {
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
  const [activeUploadFolder, setActiveUploadFolder] = useState<string | null>(null);
  const [activeUploadSubfolder, setActiveUploadSubfolder] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    html: '',
    fileName: '',
    folderId: '',
    subfolderId: '',
    title: '',
    type: 'EXERCISE',
    propagateToStudents: false,
    mode: 'upload_exercise',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchLevelProfiles();
  }, [fetchLevelProfiles]);

  useEffect(() => {
    if (!selectedLevel) return;

    const updated = levelProfiles.find((profile) => profile.id === selectedLevel.id);
    if (updated) {
      // Preservar subfolders/studyMaterials já carregados da API
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
    value: string,
  ): void => {
    setForm((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.tempId === tempId
          ? {
              ...folder,
              name: value,
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

  const openManagementModal = async (level: LevelProfile, tab: ModalTab): Promise<void> => {
    setSelectedLevel(level);
    setManagementTab(tab);
    setEditForm(createEditForm(level));
    setEditError('');
    setSaveError(null);
    setSaveSuccess(false);
    
    // Carregar materiais de estudo existentes quando abrir a aba de atividades
    if (tab === 'activities') {
      try {
        // Carregar materiais para todas as pastas
        const materialsPromises = level.folders.map(async (folder) => {
          try {
            const materials = await studyMaterialService.listBySubfolder(
              level.id, 
              folder.id, 
              'materials' // Usar ID fixo
            );
            console.log(materials)
            return { folderId: folder.id, materials };
          } catch (error) {
            console.warn(`Erro ao carregar materiais da pasta ${folder.id}:`, error);
            return { folderId: folder.id, materials: [] };
          }
        });

        const results = await Promise.all(materialsPromises);
        
        // Atualizar o estado com os materiais carregados
        setSelectedLevel((prev) => {
          if (!prev) return prev;
          
          return {
            ...prev,
            folders: prev.folders.map((folder) => {
              const folderResult = results.find(r => r.folderId === folder.id);
              if (!folderResult || folderResult.materials.length === 0) {
                return migrateToNewStructure(folder); // Usar estrutura padrão se não há materiais
              }
              console.log(folderResult)
              
              const migratedFolder = migrateToNewStructure(folder);
              const updatedSubfolders = migratedFolder.subfolders?.map((subfolder) => {
                if (subfolder.id !== 'materials') return subfolder; // Só atualizar subpasta de materiais
                
                // Converter materiais do backend para formato local
                const localMaterials = folderResult.materials.map((material) => ({
                  id: material.id,
                  levelFolderId: material.levelFolderId,
                  subfolderType: material.subfolderType,
                  title: material.title,
                  type: material.type,
                  url: material.url,
                  convertedHtml: material.convertedHtml,
                  originalFilename: material.originalFilename,
                  description: material.description,
                  createdBy: material.createdBy,
                  createdAt: material.createdAt,
                  updatedAt: material.updatedAt,
                }));
                
                return {
                  ...subfolder,
                  studyMaterials: localMaterials
                };
              }) ?? [];

              return {
                ...folder,
                subfolders: updatedSubfolders
              };
            }),
          };
        });
      } catch (error) {
        console.error('Erro ao carregar materiais de estudo:', error);
        // Não bloquear a abertura do modal por erro de carregamento
      }
    }
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

  const handleFileConvert = async (file: File, folderId: string, subfolderId: string, subfolderType?: 'EXERCISES' | 'STUDY_MATERIALS'): Promise<void> => {
    if (!isDocxFile(file)) return;

    setIsConverting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      const isMaterial = subfolderType === 'STUDY_MATERIALS';

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

    const compositeKey = `${preview.folderId}-${preview.subfolderId}`;
    setPendingTemplates((prev) => ({
      ...prev,
      [compositeKey]: [...(prev[compositeKey] ?? []), newTemplate],
    }));

    setPreview({
      isOpen: false,
      html: '',
      fileName: '',
      folderId: '',
      subfolderId: '',
      title: '',
      type: 'EXERCISE',
      propagateToStudents: false,
      mode: 'upload_exercise',
    });
    setActiveUploadFolder(null);
    setActiveUploadSubfolder(null);
    setIsPropagateModalOpen(false);
    setSavingTemplate(false);
  };

  const handleViewSavedTemplate = (
    template: LevelFolderTemplate,
    folderId: string,
    subfolderId: string,
  ): void => {
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
      [subfolderId]: (prev[subfolderId] ?? []).filter((template) => template.tempId !== tempId),
    }));
  };

  const handleDeleteMaterial = async (profileId: string, folderId: string, subfolderId: string, materialId: string): Promise<void> => {
    try {
      await studyMaterialService.delete(profileId, folderId, subfolderId, materialId);
      
      // Atualizar o estado local removendo o material
      setSelectedLevel((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          folders: prev.folders.map((folder) => {
            if (folder.id !== folderId) return folder;
            
            const migratedFolder = migrateToNewStructure(folder);
            const updatedSubfolders = migratedFolder.subfolders?.map((subfolder) => {
              if (subfolder.id !== subfolderId) return subfolder;
              
              return {
                ...subfolder,
                studyMaterials: subfolder.studyMaterials?.filter(material => material.id !== materialId) ?? []
              };
            }) ?? [];

            return {
              ...folder,
              subfolders: updatedSubfolders
            };
          }),
        };
      });

      // Refresh da lista geral
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

    // Calcular subpastas para incluir materiais pendentes
    const selectedMaterialKeys = new Set<string>();
    selectedLevel.folders.forEach(folder => {
      selectedMaterialKeys.add(`${folder.id}-materials`);
    });

    const pendingTemplateEntries = Object.entries(pendingTemplates).filter(([key]) =>
      selectedLevel.folders.some(folder => 
        key === `${folder.id}-exercises` || key === `${folder.id}-materials`
      )
    );
    
    const pendingMaterialEntries = Object.entries(pendingMaterials).filter(([key]) =>
      selectedMaterialKeys.has(key)
    );

    setSaving(true);
    setSaveError(null);

    try {
      const promises: Promise<void>[] = [];
      const savedTemplates: Array<{ folderId: string; template: LevelFolderTemplate }> = [];
      let propagatedInBatch = false;
      let totalSaved = 0;

      // Salvar templates pendentes
      pendingTemplateEntries.forEach(([subfolderId, templates]) => {
        templates.forEach((template) => {
          const promise = levelFolderTemplateService
            .create(selectedLevel.id, template.folderId, {
              title: template.title,
              type: template.type,
              ...(template.fileName ? { originalFilename: template.fileName } : {}),
              convertedHtml: template.convertedHtml,
              propagateToStudents: template.propagateToStudents,
            })
            .then((saved) => {
              if (template.propagateToStudents) {
                propagatedInBatch = true;
              }

              savedTemplates.push({
                folderId: template.folderId,
                template: {
                  ...saved,
                  convertedHtml: template.convertedHtml,
                },
              });

              setPendingTemplates((prev) => ({
                ...prev,
                [subfolderId]: (prev[subfolderId] ?? []).filter((item) => item.tempId !== template.tempId),
              }));

              totalSaved++;
            });

          promises.push(promise);
        });
      });

      // Salvar materiais pendentes
      pendingMaterialEntries.forEach(([materialKey, materials]) => {
        materials.forEach((material) => {
          // Extrair folderId da chave (formato: "folderId-materials")
          const folderId = materialKey.replace('-materials', '');
          const targetFolder = selectedLevel.folders.find(f => f.id === folderId);
          
          if (targetFolder) {
            const promise = studyMaterialService
               .create(selectedLevel.id, targetFolder.id, 'materials', {
                 title: material.title,
                 type: material.type,
                 url: material.url,
                 convertedHtml: material.convertedHtml,
                 originalFilename: material.originalFilename,
                 description: material.description,
                 propagateToStudents: material.propagateToStudents,
               })
              .then((savedMaterial) => {
                // Converter resposta do backend para formato local
                const localMaterial = {
                  id: savedMaterial.id,
                  levelFolderId: savedMaterial.levelFolderId,
                  subfolderType: savedMaterial.subfolderType,
                  title: savedMaterial.title,
                  type: savedMaterial.type,
                  url: savedMaterial.url,
                  convertedHtml: savedMaterial.convertedHtml,
                  originalFilename: savedMaterial.originalFilename,
                  description: savedMaterial.description,
                  createdBy: savedMaterial.createdBy,
                  createdAt: savedMaterial.createdAt,
                  updatedAt: savedMaterial.updatedAt,
                };
                
                // Atualizar estado local com material salvo
                setSelectedLevel((prev) => {
                  if (!prev) return prev;

                  return {
                    ...prev,
                    folders: prev.folders.map((folder) => {
                      if (folder.id !== targetFolder.id) return folder;
                      
                      const migratedFolder = migrateToNewStructure(folder);
                      const updatedSubfolders = migratedFolder.subfolders?.map((subfolder) => {
                        if (subfolder.id !== 'materials') return subfolder;
                        
                        return {
                          ...subfolder,
                          studyMaterials: [...(subfolder.studyMaterials ?? []), localMaterial]
                        };
                      }) ?? [];

                      return {
                        ...folder,
                        subfolders: updatedSubfolders
                      };
                    }),
                  };
                });

                setPendingMaterials((prev) => ({
                  ...prev,
                  [materialKey]: (prev[materialKey] ?? []).filter((item) => item.tempId !== material.tempId),
                }));

                totalSaved++;
              });

            promises.push(promise);
          } else {
            // Fallback: apenas remove do estado local se não encontrar a pasta
            setPendingMaterials((prev) => ({
              ...prev,
              [materialKey]: (prev[materialKey] ?? []).filter((item) => item.tempId !== material.tempId),
            }));
            totalSaved++;
          }
        });
      });

      await Promise.all(promises);

      setSelectedLevel((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          folders: prev.folders.map((folder) => {
            const newTemplates = savedTemplates
              .filter((saved) => saved.folderId === folder.id)
              .map((saved) => saved.template);

            return newTemplates.length > 0
              ? { ...folder, templates: [...(folder.templates ?? []), ...newTemplates] }
              : folder;
          }),
        };
      });

      void fetchLevelProfiles();

      setSaveSuccessMessage(
        propagatedInBatch
          ? `✓ ${totalSaved} itens salvos e atribuídos aos alunos atuais deste nível.`
          : `✓ ${totalSaved} itens salvos com sucesso`,
      );
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
    value: string,
  ): void => {
    setEditForm((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.tempId === tempId
          ? {
              ...folder,
              name: value,
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
  
  // Calcular subpastas para incluir materiais pendentes
  const selectedSubfolderIds = new Set<string>();
  selectedLevel?.folders.forEach((folder) => {
    selectedSubfolderIds.add(`${folder.id}-exercises`);
    selectedSubfolderIds.add(`${folder.id}-materials`);
  });
  
  const selectedPendingTemplates = Object.entries(pendingTemplates).filter(([subfolderId]) => selectedSubfolderIds.has(subfolderId));
  const selectedPendingMaterials = Object.entries(pendingMaterials).filter(([subfolderId]) => selectedSubfolderIds.has(subfolderId));
  
  const hasPendingTemplates = selectedPendingTemplates.some(([, list]) => list.length > 0);
  const hasPendingMaterials = selectedPendingMaterials.some(([, list]) => list.length > 0);
  const hasPendingContent = hasPendingTemplates || hasPendingMaterials;
  
  const hasPendingPropagation = selectedPendingTemplates.some(([, list]) =>
    list.some((template) => template.propagateToStudents),
  );
  
  const totalPendingTemplates = selectedPendingTemplates.reduce((acc, [, list]) => acc + list.length, 0);
  const totalPendingMaterials = selectedPendingMaterials.reduce((acc, [, list]) => acc + list.length, 0);
  const totalPending = totalPendingTemplates + totalPendingMaterials;


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

      {hasPendingContent && (
        <button
          type="button"
          className={styles.saveAllBtn}
          onClick={() => {
            void handleSaveAll();
          }}
          disabled={saving}
        >
          {saving
            ? hasPendingPropagation
              ? 'Salvando e atribuindo...'
              : 'Salvando...'
            : `Salvar tudo (${totalPending})`}
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
                  onChange={(event) => updateFolder(folder.tempId, event.target.value)}
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
              onClick={() => void openManagementModal(level, 'activities')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void openManagementModal(level, 'activities');
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
                {[...folders]
                  .sort((a, b) => a.position - b.position)
                  .map((folder, index) => {
                    // Migrar para nova estrutura se necessário
                    const migratedFolder = migrateToNewStructure(folder);
                    const totalTemplates = migratedFolder.subfolders?.reduce(
                      (acc, subfolder) => acc + (subfolder.templates?.length ?? 0),
                      0
                    ) ?? (folder.templates?.length ?? 0);
                    const totalMaterials = migratedFolder.subfolders?.reduce(
                      (acc, subfolder) => acc + (subfolder.studyMaterials?.length ?? 0),
                      0
                    ) ?? 0;
                    const totalContent = totalTemplates + totalMaterials;

                    return (
                      <div key={folder.id} className={styles.folderListItem}>
                        <span className={styles.folderListName}>{getFolderName(folder, index)}</span>
                        <span className={styles.folderListCount}>{totalContent > 0 ? `${totalContent} itens` : '0 itens'}</span>
                      </div>
                    );
                  })}
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  disabled={level.isSystem}
                  title={level.isSystem ? 'Perfil de sistema' : 'Editar nível'}
                  onClick={(event) => {
                    event.stopPropagation();
                    void openManagementModal(level, 'edit');
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
                <div className={styles.successBanner}>{saveSuccessMessage}</div>
              )}

              {saveError && (
                <div className={styles.errorBanner}>{saveError}</div>
              )}

              {selectedLevel.folders.map((folder, index) => {
                // Migrar para nova estrutura se necessário
                const migratedFolder = migrateToNewStructure(folder);
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
                          setActiveUploadSubfolder(null);
                        }}
                      >
                        {isUploadOpen ? 'Fechar' : '+ Adicionar'}
                      </button>
                    </div>

                        {/* Renderizar subpastas */}
                    {migratedFolder.subfolders?.map((subfolder) => {
                      const savedTemplates = subfolder.templates ?? [];
                      const savedMaterials = subfolder.studyMaterials ?? [];
                      
                      // Criar chaves para pending baseadas na pasta e tipo de subpasta  
                      const templateKey = `${folder.id}-${subfolder.id}`;
                      const materialKey = `${folder.id}-materials`;
                      
                      const subfolderPendingTemplates = pendingTemplates[templateKey] ?? [];
                      const subfolderPendingMaterials = subfolder.type === 'STUDY_MATERIALS' 
                        ? (pendingMaterials[materialKey] ?? [])
                        : [];
                        
                      const hasContent = savedTemplates.length > 0 || savedMaterials.length > 0 || 
                                       subfolderPendingTemplates.length > 0 || subfolderPendingMaterials.length > 0;
                      const subfolderCompositeKey = `${folder.id}-${subfolder.id}`;
                      const isSubfolderUploadOpen = activeUploadSubfolder === subfolderCompositeKey;

                      return (
                        <div key={subfolder.id} className={styles.subfolderCard}>
                          <div className={styles.subfolderHeader}>
                            <div className={styles.subfolderName}>
                              {getSubfolderIcon(subfolder.type)} {subfolder.name}
                            </div>
                            {isUploadOpen && (
                              <button
                                type="button"
                                className={styles.addSubfolderBtn}
                                onClick={() => {
                                  setActiveUploadSubfolder(
                                    isSubfolderUploadOpen ? null : subfolderCompositeKey
                                  );
                                }}
                              >
                                {isSubfolderUploadOpen ? 'Fechar' : '+ Adicionar'}
                              </button>
                            )}
                          </div>

                          {!hasContent && !isSubfolderUploadOpen ? (
                            <div className={styles.emptyTemplates}>
                              {subfolder.type === 'EXERCISES' ? 'Nenhum exercício ainda.' : 'Nenhum material ainda.'}
                            </div>
                          ) : (
                            <>
                              {/* Templates salvos */}
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
                                      title="Visualizar conteúdo"
                                      onClick={() => {
                                        handleViewSavedTemplate(template, folder.id, subfolder.id);
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

                              {/* Materiais de estudo salvos */}
                              {savedMaterials.map((material) => (
                                <div key={material.id} className={styles.materialItem}>
                                  <div className={styles.materialInfo}>
                                    <span className={styles.materialTitle}>{material.title}</span>
                                    <span className={styles.materialType}>{getMaterialTypeLabel(convertMaterialType(material.type))}</span>
                                    {material.originalFilename && (
                                      <span className={styles.templateFile}>{material.originalFilename}</span>
                                    )}
                                    {material.description && (
                                      <span className={styles.materialDescription}>{material.description}</span>
                                    )}
                                  </div>
                                  <div className={styles.materialActions}>
                                    {material.convertedHtml && (
                                      <button
                                        type="button"
                                        className={styles.viewTemplateBtn}
                                        title="Visualizar conteúdo"
                                        onClick={() => {
                                          setPreview({
                                            isOpen: true,
                                            html: material.convertedHtml ?? '',
                                            fileName: material.originalFilename ?? material.title,
                                            folderId: folder.id,
                                            subfolderId: subfolder.id,
                                            title: material.title,
                                            type: 'EXERCISE',
                                            propagateToStudents: false,
                                            mode: 'view',
                                          });
                                        }}
                                      >
                                        👁
                                      </button>
                                    )}
                                    {material.url && (
                                      <a
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.viewMaterialBtn}
                                        title={`Abrir ${convertMaterialType(material.type) === 'VIDEO' ? 'vídeo' : 'link'}`}
                                      >
                                        {convertMaterialType(material.type) === 'VIDEO' ? '🎥' : '🔗'}
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      className={styles.removeMaterialBtn}
                                      title="Remover material"
                                      onClick={() => {
                                        void handleDeleteMaterial(selectedLevel.id, folder.id, subfolder.id, material.id);
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Templates pendentes */}
                              {subfolderPendingTemplates.map((template) => (
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
                                      title="Visualizar conteúdo"
                                      onClick={() => {
                                        setPreview({
                                          isOpen: true,
                                          html: template.convertedHtml,
                                          fileName: template.fileName,
                                          folderId: folder.id,
                                          subfolderId: subfolder.id,
                                          title: template.title,
                                          type: template.type,
                                          propagateToStudents: template.propagateToStudents,
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
                                        removePendingTemplate(templateKey, template.tempId);
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Materiais pendentes */}
                              {subfolderPendingMaterials.map((material) => (
                                <div
                                  key={material.tempId}
                                  className={`${styles.materialItem} ${styles.materialPending}`}
                                >
                                  <div className={styles.materialInfo}>
                                    <span className={styles.materialTitle}>{material.title}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span className={styles.materialType}>{getMaterialTypeLabel(material.type)}</span>
                                      <span className={styles.pendingBadge}>Não salvo</span>
                                    </div>
                                    {material.originalFilename && (
                                      <span className={styles.templateFile}>{material.originalFilename}</span>
                                    )}
                                    {material.description && (
                                      <span className={styles.materialDescription}>{material.description}</span>
                                    )}
                                  </div>
                                  <div className={styles.materialActions}>
                                    {material.convertedHtml && (
                                      <button
                                        type="button"
                                        className={styles.viewTemplateBtn}
                                        title="Visualizar conteúdo"
                                        onClick={() => {
                                          setPreview({
                                            isOpen: true,
                                            html: material.convertedHtml ?? '',
                                            fileName: material.originalFilename ?? material.title,
                                            folderId: folder.id,
                                            subfolderId: subfolder.id,
                                            title: material.title,
                                            type: 'EXERCISE',
                                            propagateToStudents: false,
                                            mode: 'view',
                                          });
                                        }}
                                      >
                                        👁
                                      </button>
                                    )}
                                    {material.url && (
                                      <a
                                        href={material.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.viewMaterialBtn}
                                        title={`Abrir ${material.type === 'VIDEO' ? 'vídeo' : 'link'}`}
                                      >
                                        {material.type === 'VIDEO' ? '🎥' : '🔗'}
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      className={styles.removeMaterialBtn}
                                      title="Remover material"
                                      onClick={() => {
                                        const materialKey = `${folder.id}-materials`;
                                        setPendingMaterials((prev) => ({
                                          ...prev,
                                          [materialKey]: (prev[materialKey] ?? []).filter(
                                            (m) => m.tempId !== material.tempId
                                          ),
                                        }));
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Upload section para subpasta específica */}
                          {isSubfolderUploadOpen && (
                            <div className={styles.uploadSection}>
                              {subfolder.type === 'EXERCISES' ? (
                                <>
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
                                        void handleFileConvert(file, folder.id, subfolder.id, subfolder.type);
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
                                      if (file) {
                                        void handleFileConvert(file, folder.id, subfolder.id, subfolder.type);
                                      }
                                      event.target.value = '';
                                    }}
                                  />

                                  <div className={styles.freeTextDivider}>
                                    <span className={styles.freeTextDividerLine} />
                                    <span className={styles.freeTextDividerText}>ou</span>
                                    <span className={styles.freeTextDividerLine} />
                                  </div>

                                  <button
                                    type="button"
                                    className={styles.btnFreeText}
                                    onClick={() => {
                                      setActiveUploadFolder(null);
                                      setActiveUploadSubfolder(null);
                                      setPreview({
                                        isOpen: true,
                                        html: '<p></p>',
                                        fileName: '',
                                        folderId: folder.id,
                                        subfolderId: subfolder.id,
                                        title: '',
                                        type: 'EXERCISE',
                                        propagateToStudents: false,
                                        mode: 'freetext_exercise',
                                      });
                                    }}
                                  >
                                    ✏️ Criar atividade manualmente (texto livre)
                                  </button>
                                </>
                              ) : (
                                // Upload para materiais de estudo
                                <div className={styles.materialUploadOptions}>

                                  <button
                                    type="button"
                                    className={styles.btnUploadMaterial}
                                    onClick={() => {
                                      setActiveUploadFolder(null);
                                      setActiveUploadSubfolder(null);
                                      setPreview({
                                        isOpen: true,
                                        html: '',
                                        fileName: '',
                                        folderId: folder.id,
                                        subfolderId: subfolder.id,
                                        title: '',
                                        type: 'EXERCISE',
                                        materialType: 'LINK',
                                        url: '',
                                        description: '',
                                        propagateToStudents: false,
                                        mode: 'link_material',
                                      });
                                    }}
                                  >
                                    🔗 Adicionar Link
                                  </button>

                                  <div className={styles.freeTextDivider}>
                                    <span className={styles.freeTextDividerLine} />
                                    <span className={styles.freeTextDividerText}>ou</span>
                                    <span className={styles.freeTextDividerLine} />
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
                                      setIsDragging(false);
                                      const file = event.dataTransfer.files[0] ?? null;
                                      if (file) {
                                        void handleFileConvert(file, folder.id, subfolder.id, subfolder.type);
                                      }
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    role="presentation"
                                  >
                                    {isConverting ? (
                                      <span className={styles.dropzoneConverting}>Convertendo documento...</span>
                                    ) : (
                                      <>
                                        <span className={styles.dropzoneText}>Arraste um documento .docx aqui</span>
                                        <span className={styles.dropzoneSubtext}>ou clique para selecionar arquivo</span>
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
                                      if (file) {
                                        void handleFileConvert(file, folder.id, subfolder.id, subfolder.type);
                                      }
                                      event.target.value = '';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                          onChange={(event) => updateEditFolder(folder.tempId, event.target.value)}
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
      onClose={() => setPreview({
        isOpen: false,
        html: '',
        fileName: '',
        folderId: '',
        subfolderId: '',
        title: '',
        type: 'EXERCISE',
        propagateToStudents: false,
        mode: 'upload_exercise',
      })}
      size="lg"
      title={
        preview.mode === 'view' ? preview.title :
        preview.mode === 'freetext_exercise' ? 'Nova Atividade Livre' :
        preview.mode === 'link_material' ? 'Novo Material de Estudo' :
        preview.mode === 'upload_material' ? 'Upload de Material' :
        `Preview — ${preview.fileName}`
      }
    >
      <div className={styles.previewModalContent}>
        {preview.mode === 'link_material' && (
          <>
            <div className={styles.previewNote}>
              📚 <strong>Material de Estudo:</strong> Adicione links para vídeos (YouTube, Vimeo, etc.) ou outros recursos externos que complementem o aprendizado do aluno.
            </div>

            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <label className={styles.previewLabel}>Título do Material</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(event) => setPreview((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Vídeo Explicativo - Present Perfect"
                />
              </div>

              <div className={styles.previewFieldSmall}>
                <label className={styles.previewLabel}>Tipo</label>
                <select
                  className={styles.previewInput}
                  value={preview.materialType ?? 'VIDEO'}
                  onChange={(event) =>
                    setPreview((prev) => ({ ...prev, materialType: event.target.value as MaterialType }))
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
                  onChange={(event) => setPreview((prev) => ({ ...prev, url: event.target.value }))}
                  placeholder={
                    preview.materialType === 'VIDEO' 
                      ? "https://youtube.com/watch?v=... ou https://vimeo.com/..."
                      : "https://site.com/recurso ou https://exemplo.com/material"
                  }
                />
              </div>

            <div className={styles.previewField}>
              <label className={styles.previewLabel}>Descrição (opcional)</label>
              <textarea
                className={styles.previewInput}
                rows={3}
                value={preview.description ?? ''}
                onChange={(event) => setPreview((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrição breve sobre este material de estudo"
              />
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreview({
                  isOpen: false,
                  html: '',
                  fileName: '',
                  folderId: '',
                  subfolderId: '',
                  title: '',
                  type: 'EXERCISE',
                  propagateToStudents: false,
                  mode: 'upload_exercise',
                })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => {
                  // Criar chave única baseada na pasta ativa
                  const materialKey = `${preview.folderId}-materials`;
                  
                  // Criar material pendente
                  const newMaterial: PendingMaterial = {
                    tempId: createTempId(),
                    subfolderId: materialKey,
                    title: preview.title,
                    type: preview.materialType ?? 'VIDEO',
                    url: preview.url,
                    description: preview.description,
                    propagateToStudents: false,
                  };

                  setPendingMaterials((prev) => ({
                    ...prev,
                    [materialKey]: [...(prev[materialKey] ?? []), newMaterial],
                  }));

                  setPreview({
                    isOpen: false,
                    html: '',
                    fileName: '',
                    folderId: '',
                    subfolderId: '',
                    title: '',
                    type: 'EXERCISE',
                    propagateToStudents: false,
                    mode: 'upload_exercise',
                  });
                }}
                disabled={!preview.title.trim() || !preview.url?.trim()}
              >
                Salvar Material
              </button>
            </div>
          </>
        )}

        {preview.mode === 'upload_exercise' && (
          <>
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

            <div className={styles.previewEditorWrapper}>
              <DocxPreviewEditor
                html={preview.html}
                editable={false}
                onChange={(html) => setPreview((prev) => ({ ...prev, html }))}
              />
            </div>

            <div className={styles.previewNote}>
              ⚠️ Este é o visual exato que o aluno verá no workspace. O conteúdo será salvo ao clicar em "Salvar tudo".
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreview({
                  isOpen: false,
                  html: '',
                  fileName: '',
                  folderId: '',
                  subfolderId: '',
                  title: '',
                  type: 'EXERCISE',
                  propagateToStudents: false,
                  mode: 'upload_exercise',
                })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => setIsPropagateModalOpen(true)}
                disabled={!preview.title.trim() || savingTemplate}
              >
                {savingTemplate ? 'Salvando...' : 'Salvar template'}
              </button>
            </div>
          </>
        )}

        {preview.mode === 'upload_material' && (
          <>
            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <label className={styles.previewLabel}>Título do material</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(event) => setPreview((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Nome do material de estudo"
                />
              </div>
            </div>

            <div className={styles.previewField} style={{ marginBottom: '12px' }}>
              <label className={styles.previewLabel}>Descrição (opcional)</label>
              <textarea
                className={styles.previewInput}
                rows={2}
                value={preview.description ?? ''}
                onChange={(event) => setPreview((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Descrição breve sobre este material de estudo"
              />
            </div>

            <div className={styles.previewEditorWrapper}>
              <DocxPreviewEditor
                html={preview.html}
                editable
                onChange={(html) => setPreview((prev) => ({ ...prev, html }))}
              />
            </div>

            <div className={styles.previewNote}>
              ⚠️ Este é o visual exato que o aluno verá. O conteúdo será salvo ao clicar em "Salvar tudo".
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreview({
                  isOpen: false,
                  html: '',
                  fileName: '',
                  folderId: '',
                  subfolderId: '',
                  title: '',
                  type: 'EXERCISE',
                  propagateToStudents: false,
                  mode: 'upload_exercise',
                })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => {
                  const materialKey = `${preview.folderId}-materials`;

                  const newMaterial: PendingMaterial = {
                    tempId: createTempId(),
                    subfolderId: materialKey,
                    title: preview.title.trim(),
                    type: 'DOCUMENT',
                    convertedHtml: preview.html,
                    originalFilename: preview.fileName,
                    description: preview.description,
                    propagateToStudents: false,
                  };

                  setPendingMaterials((prev) => ({
                    ...prev,
                    [materialKey]: [...(prev[materialKey] ?? []), newMaterial],
                  }));

                  setPreview({
                    isOpen: false,
                    html: '',
                    fileName: '',
                    folderId: '',
                    subfolderId: '',
                    title: '',
                    type: 'EXERCISE',
                    propagateToStudents: false,
                    mode: 'upload_exercise',
                  });
                }}
                disabled={!preview.title.trim()}
              >
                Salvar Material
              </button>
            </div>
          </>
        )}

        {preview.mode === 'freetext_exercise' && (
          <>
            <div className={styles.previewFormRow}>
              <div className={styles.previewField}>
                <label className={styles.previewLabel}>Título da atividade</label>
                <input
                  type="text"
                  className={styles.previewInput}
                  value={preview.title}
                  onChange={(event) => setPreview((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex: Exercício — Tempos Verbais"
                />
              </div>

              <div className={styles.previewFieldSmall}>
                <label className={styles.previewLabel}>Tipo</label>
                <select disabled
                  className={styles.previewInput}
                  value={preview.type}
                  onChange={(event) =>
                    setPreview((prev) => ({ ...prev, type: event.target.value as TemplateType }))
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
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreview({
                  isOpen: false,
                  html: '',
                  fileName: '',
                  folderId: '',
                  subfolderId: '',
                  title: '',
                  type: 'EXERCISE',
                  propagateToStudents: false,
                  mode: 'upload_exercise',
                })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={() => setIsPropagateModalOpen(true)}
                disabled={!preview.title.trim() || savingTemplate}
              >
                {savingTemplate ? 'Salvando...' : 'Salvar template'}
              </button>
            </div>
          </>
        )}

        {preview.mode === 'view' && (
          <>
            {!preview.html ? (
              <div className={styles.noPreviewMsg}>
                Preview não disponível para este template.
              </div>
            ) : (
              <div className={styles.previewEditorWrapper}>
                <DocxPreviewEditor html={preview.html} editable={false} />
              </div>
            )}

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreview({
                  isOpen: false,
                  html: '',
                  fileName: '',
                  folderId: '',
                  subfolderId: '',
                  title: '',
                  type: 'EXERCISE',
                  propagateToStudents: false,
                  mode: 'upload_exercise',
                })}
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>

    {isPropagateModalOpen && (
      <div
        className={styles.propagateModalOverlay}
        role="presentation"
        onClick={() => {
          if (!savingTemplate) {
            setIsPropagateModalOpen(false);
          }
        }}
      >
        <div
          className={styles.propagateModalCard}
          role="dialog"
          aria-modal="true"
          aria-labelledby="propagateModalTitle"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 id="propagateModalTitle" className={styles.propagateModalTitle}>
            Deseja atribuir esta nova atividade a todos os alunos atuais deste nível?
          </h3>

          <p className={styles.propagateModalText}>
            Você pode salvar apenas no nível (válido para novos alunos) ou propagar também para os workspaces dos alunos já matriculados.
          </p>

          <div className={styles.propagateModalActions}>
            <button
              type="button"
              className={styles.propagateModalCancelBtn}
              onClick={() => setIsPropagateModalOpen(false)}
              disabled={savingTemplate}
            >
              Cancelar
            </button>

            <button
              type="button"
              className={styles.propagateModalSecondaryBtn}
              onClick={() => {
                void handleSaveTemplate(false);
              }}
              disabled={savingTemplate}
            >
              Apenas no Nível
            </button>

            <button
              type="button"
              className={styles.propagateModalPrimaryBtn}
              onClick={() => {
                void handleSaveTemplate(true);
              }}
              disabled={savingTemplate}
            >
              {savingTemplate ? 'Salvando...' : 'Atribuir a Todos'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
