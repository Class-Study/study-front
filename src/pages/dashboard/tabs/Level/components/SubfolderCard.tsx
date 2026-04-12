import React, {useState, useEffect} from 'react';
import type {LevelFolderExercise, LevelSubfolder} from '@/types/levelProfile.types.ts';
import type {PendingMaterial, PendingTemplateExtended, PreviewState} from '@/types/levelTab.types.ts';
import {convertMaterialType, getMaterialTypeLabel} from '@/utils/levelTab.utils.ts';
import {
    ChevronDown,
    Link,
    Video,
    Eye,
    Check,
    X,
    FolderOpen,
    FolderClosed,
    Edit2,
    Trash2,
    ClipboardList,
    BookOpen
} from 'lucide-react';
import Swal from 'sweetalert2';
import {PropagateModal} from './PropagateModal.tsx';
import styles from '../LevelTab.module.css';

interface SubfolderCardProps {
    subfolder: LevelSubfolder;
    folderId: string;
    isFolderOpen: boolean;

    // Pending items
    sfPendingTemplates: PendingTemplateExtended[];
    sfPendingMaterials: PendingMaterial[];

    // Inner tab
    activeTab: 'exercises' | 'materials';
    setSubfolderInnerTab: React.Dispatch<React.SetStateAction<Record<string, 'exercises' | 'materials'>>>;

    // Upload state
    isSubfolderUploadOpen: boolean;
    setActiveUploadSubfolder: React.Dispatch<React.SetStateAction<string | null>>;
    isConverting: boolean;
    isDragging: boolean;
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement> | React.MutableRefObject<HTMLInputElement | null>;

    // Subfolder edit state
    handleRenameSubfolder: (folderId: string, subfolderId: string, newName: string) => Promise<void>;
    handleDeleteSubfolder: (folderId: string, subfolderId: string, name: string) => Promise<void>;

    // Pending subfolder support
    isPending?: boolean;
    onDeletePending?: () => void;
    onRenamePending?: (newName: string) => void;
    propagateToStudents?: boolean;
    onTogglePropagate?: () => void;

    // Handlers
    handleFileConvert: (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material') => Promise<void>;
    handleViewSavedTemplate: (exercise: LevelFolderExercise, folderId: string, subfolderId: string) => void;
    removePendingTemplate: (subfolderId: string, tempId: string) => void;
    handleDeleteTemplate: (folderId: string, subfolderId: string, templateId: string, templateTitle: string) => Promise<void>;
    handleDeleteMaterial: (folderId: string, subfolderId: string, materialId: string, materialTitle: string) => Promise<void>;

    // Preview
    setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
    setPendingMaterials: React.Dispatch<React.SetStateAction<Record<string, PendingMaterial[]>>>;

    // Edição inline de subpasta salva
    handleSaveSubfolderEdits: (folderId: string, subfolderId: string, newName: string, originalName: string, propagateToStudents?: boolean, deletedExerciseIds?: string[], deletedMaterialIds?: string[]) => Promise<void>;
    clearPendingForSubfolder: (subfolderId: string) => void;
}

export const SubfolderCard: React.FC<SubfolderCardProps> = ({
                                                                subfolder,
                                                                folderId,
                                                                isFolderOpen,
                                                                sfPendingTemplates,
                                                                sfPendingMaterials,
                                                                activeTab,
                                                                setSubfolderInnerTab,
                                                                isSubfolderUploadOpen,
                                                                setActiveUploadSubfolder,
                                                                isConverting,
                                                                isDragging,
                                                                setIsDragging,
                                                                fileInputRef,
                                                                handleRenameSubfolder,
                                                                handleDeleteSubfolder,
                                                                isPending = false,
                                                                onDeletePending,
                                                                onRenamePending,
                                                                handleFileConvert,
                                                                handleViewSavedTemplate,
                                                                removePendingTemplate,
                                                                setPreview,
                                                                setPendingMaterials,
                                                                handleSaveSubfolderEdits,
                                                                clearPendingForSubfolder,
                                                            }) => {
    const savedExercises = subfolder.exercises ?? [];
    const savedMaterials = subfolder.studyMaterials ?? [];
    const [isOpen, setIsOpen] = useState(false);
    const [displayName, setDisplayName] = useState(subfolder.name);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isPropagateModalOpen, setIsPropagateModalOpen] = useState(false);
    const [deletedExerciseIds, setDeletedExerciseIds] = useState<Set<string>>(new Set());
    const [deletedMaterialIds, setDeletedMaterialIds] = useState<Set<string>>(new Set());

    // Fecha a subpasta automaticamente quando a pasta pai fecha (exceto se estiver editando)
    useEffect(() => {
        if (!isFolderOpen && !isEditing) {
            setIsOpen(false);
        }
    }, [isFolderOpen, isEditing]);

    // Função para abrir modal de renomeação
    const handleOpenRenameModal = async () => {
        const confirmButtonColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#0066cc';
        const cancelButtonColor = getComputedStyle(document.documentElement).getPropertyValue('--color-blue').trim() || '#6b7280';
        const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-card').trim() || '#fff';
        const colorText = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim() || '#000';

        const {value: newName} = await Swal.fire({
            title: 'Renomear subpasta',
            input: 'text',
            inputValue: displayName,
            inputPlaceholder: 'Digite o novo nome',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor,
            cancelButtonColor,
            confirmButtonText: 'Confirmar',
            color: colorText,
            cancelButtonText: 'Cancelar',
            background: backgroundColor,
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'O nome não pode estar vazio';
                }
                return null;
            },
        });

        if (newName && newName.trim() !== displayName) {
            const trimmedName = newName.trim();
            const previousName = displayName;
            setDisplayName(trimmedName);

            if (isPending) {
                onRenamePending?.(trimmedName);
            } else {
                try {
                    await handleRenameSubfolder(folderId, subfolder.id, trimmedName);
                } catch (error) {
                    setDisplayName(previousName);
                }
            }
        }
    };

    const handleConfirmEdit = () => {
        if (!editName.trim()) return;
        setIsPropagateModalOpen(true);
    };

    const handleSaveEditWithPropagation = async (propagate: boolean): Promise<void> => {
        if (!editName.trim()) return;
        setIsSavingEdit(true);
        try {
            await handleSaveSubfolderEdits(
                folderId,
                subfolder.id,
                editName.trim(),
                subfolder.name,
                propagate,
                Array.from(deletedExerciseIds),
                Array.from(deletedMaterialIds),
            );
            setDisplayName(editName.trim());
            setIsEditing(false);
            setDeletedExerciseIds(new Set());
            setDeletedMaterialIds(new Set());
            setActiveUploadSubfolder(null);
        } finally {
            setIsSavingEdit(false);
            setIsPropagateModalOpen(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName(displayName);
        setDeletedExerciseIds(new Set());
        setDeletedMaterialIds(new Set());
        clearPendingForSubfolder(subfolder.id);
        setActiveUploadSubfolder(null);
    };

    return (
        <div className={`${styles.subfolderCard} ${isPending ? styles.subfolderCardPending : ''}`}>
            {/* Accordion Header */}
            {isEditing && !isPending ? (
                /* ── Modo Edição ─────────────────────────────────────────────── */
                <div className={styles.subfolderAccordionHeader} style={{cursor: 'default'}}>
                    <div className={styles.subfolderAccordionHeaderContent}>
                        <ChevronDown
                            size={20}
                            className={`${styles.chevronIcon} ${isOpen ? styles.chevronIconOpen : ''}`}
                        />
                        <input
                            type="text"
                            className={`${styles.folderNameInput} inputEdit`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className={styles.subfolderHeaderActions}>

                        <button
                            type="button"
                            className={styles.viewTemplateBtn}
                            title="Confirmar edição"
                            disabled={isSavingEdit || !editName.trim()}
                            onClick={() => void handleConfirmEdit()}
                        >
                            {isSavingEdit ? '…' : <Check size={16}/>}
                        </button>
                        <button
                            type="button"
                            className={styles.removeTemplateBtn}
                            title="Cancelar edição"
                            disabled={isSavingEdit}
                            onClick={handleCancelEdit}
                        >
                            <X size={16}/>
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Modo Normal ─────────────────────────────────────────────── */
                <button
                    type="button"
                    className={styles.subfolderAccordionHeader}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className={styles.subfolderAccordionHeaderContent}>
                        <ChevronDown
                            size={20}
                            className={`${styles.chevronIcon} ${isOpen ? styles.chevronIconOpen : ''}`}
                        />
                        <div className={styles.subfolderName}>
                            {isOpen ? (
                                <FolderOpen size={20}
                                            className={`folderIconAnimated ${isOpen ? 'folderIconOpen' : ''}`}/>
                            ) : (
                                <FolderClosed size={20} className="folderIconAnimated"/>
                            )}
                            {displayName}
                            {isPending && <span className={styles.pendingBadge}>Pendente</span>}
                        </div>
                    </div>
                    <div className={styles.subfolderHeaderActions}>

                        <button
                            type="button"
                            className={styles.viewTemplateBtn}
                            title={isPending ? 'Renomear' : 'Editar subpasta'}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPending) {
                                    void handleOpenRenameModal();
                                } else {
                                    setEditName(displayName);
                                    setIsEditing(true);
                                    setIsOpen(true);
                                    setDeletedExerciseIds(new Set());
                                    setDeletedMaterialIds(new Set());
                                    setActiveUploadSubfolder(subfolder.id);
                                }
                            }}
                        >
                            <Edit2 size={16}/>
                        </button>
                        <button
                            type="button"
                            className={styles.removeTemplateBtn}
                            title="Deletar subpasta"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPending) {
                                    onDeletePending?.();
                                } else {
                                    void handleDeleteSubfolder(folderId, subfolder.id, subfolder.name);
                                }
                            }}
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                </button>
            )}

            {/* Accordion Content */}
            <div
                className={`${styles.subfolderAccordionContent} ${(isOpen || isEditing) ? styles.subfolderAccordionContentOpen : ''}`}>

                {/* Inner tabs: Exercícios | Material de Estudos */}
                <div className={styles.managementTabs} style={{padding: '0 8px', marginBottom: '4px'}}>
                    <button
                        type="button"
                        className={`${styles.managementTab} ${activeTab === 'exercises' ? styles.managementTabActive : ''} tabButton`}
                        onClick={() => setSubfolderInnerTab((prev) => ({...prev, [subfolder.id]: 'exercises'}))}
                    >
                        <ClipboardList size={18} className="iconInline"/>
                        Exercícios ({savedExercises.length + sfPendingTemplates.length})
                    </button>
                    <button
                        type="button"
                        className={`${styles.managementTab} ${activeTab === 'materials' ? styles.managementTabActive : ''} tabButton`}
                        onClick={() => setSubfolderInnerTab((prev) => ({...prev, [subfolder.id]: 'materials'}))}
                    >
                        <BookOpen size={18} className="iconInline"/>
                        Materiais ({savedMaterials.length + sfPendingMaterials.length})
                    </button>
                    {(isPending || isEditing) && (
                        <button
                            type="button"
                            className={`${styles.addSubfolderBtn} addButton`}
                            onClick={() => setActiveUploadSubfolder(isSubfolderUploadOpen ? null : subfolder.id)}
                        >
                            {isSubfolderUploadOpen ? 'Fechar' : '+ Adicionar'}
                        </button>
                    )}
                </div>

                {/* Exercises tab content */}
                {activeTab === 'exercises' && (
                    <>
                        {savedExercises.length === 0 && sfPendingTemplates.length === 0 && !isSubfolderUploadOpen && (
                            <div className={styles.emptyTemplates}>Nenhum exercício ainda.</div>
                        )}
                        {savedExercises
                            .filter((ex) => !deletedExerciseIds.has(ex.id))
                            .map((exercise) => (
                                <div key={exercise.id} className={styles.templateItem}>
                                    <div className={styles.templateInfo}>
                                        <span className={styles.templateTitle}>{exercise.title}</span>
                                    </div>
                                    <div className={styles.templateActions}>
                                        <button
                                            type="button"
                                            className={styles.viewTemplateBtn}
                                            title="Visualizar"
                                            onClick={() => handleViewSavedTemplate(exercise, folderId, subfolder.id)}
                                        >
                                            <Eye size={16}/>
                                        </button>
                                        {isEditing && !isPending && (
                                            <button
                                                type="button"
                                                className={styles.removeTemplateBtn}
                                                title="Remover exercício"
                                                onClick={() =>
                                                    setDeletedExerciseIds((prev) => new Set([...prev, exercise.id]))
                                                }
                                            >
                                                <X size={16}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        {sfPendingTemplates.map((template) => (
                            <div key={template.tempId} className={`${styles.templateItem} ${styles.templatePending}`}>
                                <div className={styles.templateInfo}>
                                    <span className={styles.templateTitle}>{template.title}</span>
                                    <span className={styles.pendingBadge}>Não salvo</span>
                                </div>
                                <div className={styles.templateActions}>
                                    <button
                                        type="button"
                                        className={styles.viewTemplateBtn}
                                        onClick={() => {
                                            setPreview({
                                                isOpen: true,
                                                html: template.convertedHtml,
                                                fileName: template.fileName,
                                                folderId,
                                                subfolderId: subfolder.id,
                                                title: template.title,
                                                type: template.type,
                                                mode: 'view',
                                            });
                                        }}
                                    >
                                        <Eye size={16}/>
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.removeTemplateBtn}
                                        onClick={() => removePendingTemplate(subfolder.id, template.tempId)}
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {isSubfolderUploadOpen && (
                            <div className={styles.uploadSection}>
                                <div
                                    className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const f = e.dataTransfer.files[0];
                                        if (f) void handleFileConvert(f, folderId, subfolder.id, 'exercise');
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
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) void handleFileConvert(f, folderId, subfolder.id, 'exercise');
                                        e.target.value = '';
                                    }}
                                />
                                <div className={styles.freeTextDivider}>
                                    <span className={styles.freeTextDividerLine}/>
                                    <span className={styles.freeTextDividerText}>ou</span>
                                    <span className={styles.freeTextDividerLine}/>
                                </div>
                                <button
                                    type="button"
                                    className={styles.btnFreeText}
                                    onClick={() => {
                                        setActiveUploadSubfolder(null);
                                        setPreview({
                                            isOpen: true,
                                            html: '<p></p>',
                                            fileName: '',
                                            folderId,
                                            subfolderId: subfolder.id,
                                            title: '',
                                            type: 'EXERCISE',
                                            mode: 'freetext_exercise',
                                        });
                                    }}
                                >
                                    <Edit2 size={16} className="iconInline"/>
                                    Criar atividade manualmente (texto livre)
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Materials tab content */}
                {activeTab === 'materials' && (
                    <>
                        {savedMaterials.length === 0 && sfPendingMaterials.length === 0 && !isSubfolderUploadOpen && (
                            <div className={styles.emptyTemplates}>Nenhum material ainda.</div>
                        )}
                        {savedMaterials
                            .filter((m) => !deletedMaterialIds.has(m.id))
                            .map((material) => (
                                <div key={material.id} className={styles.materialItem}>
                                    <div className={styles.materialInfo}>
                                        <span className={styles.materialTitle}>{material.title}</span>
                                        <span className={styles.materialType}>
                                        {getMaterialTypeLabel(convertMaterialType(material.type))}
                                    </span>
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
                                                title="Visualizar"
                                                onClick={() => {
                                                    setPreview({
                                                        isOpen: true,
                                                        html: material.convertedHtml ?? '',
                                                        fileName: material.originalFilename ?? material.title,
                                                        folderId,
                                                        subfolderId: subfolder.id,
                                                        title: material.title,
                                                        type: 'EXERCISE',
                                                        mode: 'view',
                                                    });
                                                }}
                                            >
                                                <Eye size={16}/>
                                            </button>
                                        )}
                                        {material.url && (
                                            <a
                                                href={material.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.viewMaterialBtn}
                                            >
                                                {convertMaterialType(material.type) === 'VIDEO' ? <Video size={16}/> :
                                                    <Link size={16}/>}
                                            </a>
                                        )}
                                        {isEditing && !isPending && (
                                            <button
                                                type="button"
                                                className={styles.removeMaterialBtn}
                                                title="Remover material"
                                                onClick={() =>
                                                    setDeletedMaterialIds((prev) => new Set([...prev, material.id]))
                                                }
                                            >
                                                <X size={16}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        {sfPendingMaterials.map((material) => (
                            <div key={material.tempId} className={`${styles.materialItem} ${styles.materialPending}`}>
                                <div className={styles.materialInfo}>
                                    <span className={styles.materialTitle}>{material.title}</span>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                                        <span
                                            className={styles.materialType}>{getMaterialTypeLabel(material.type)}</span>
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
                                            onClick={() => {
                                                setPreview({
                                                    isOpen: true,
                                                    html: material.convertedHtml ?? '',
                                                    fileName: material.originalFilename ?? material.title,
                                                    folderId,
                                                    subfolderId: subfolder.id,
                                                    title: material.title,
                                                    type: 'EXERCISE',
                                                    mode: 'view',
                                                });
                                            }}
                                        >
                                            <Eye size={16}/>
                                        </button>
                                    )}
                                    {material.url && (
                                        <a
                                            href={material.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewMaterialBtn}
                                        >
                                            {material.type === 'VIDEO' ? <Video size={16}/> : <Link size={16}/>}
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        className={styles.removeMaterialBtn}
                                        onClick={() => {
                                            setPendingMaterials((prev) => ({
                                                ...prev,
                                                [subfolder.id]: (prev[subfolder.id] ?? []).filter((m) => m.tempId !== material.tempId),
                                            }));
                                        }}
                                    >
                                        <X size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {isSubfolderUploadOpen && (
                            <div className={styles.uploadSection}>
                                <div className={styles.materialUploadOptions}>
                                    <button
                                        type="button"
                                        className={styles.btnUploadMaterial}
                                        onClick={() => {
                                            setActiveUploadSubfolder(null);
                                            setPreview({
                                                isOpen: true,
                                                html: '',
                                                fileName: '',
                                                folderId,
                                                subfolderId: subfolder.id,
                                                title: '',
                                                type: 'EXERCISE',
                                                materialType: 'LINK',
                                                url: '',
                                                description: '',
                                                mode: 'link_material',
                                            });
                                        }}
                                    >
                                        <Link size={16} className="iconInline"/>
                                        Adicionar Link
                                    </button>
                                    <div className={styles.freeTextDivider}>
                                        <span className={styles.freeTextDividerLine}/>
                                        <span className={styles.freeTextDividerText}>ou</span>
                                        <span className={styles.freeTextDividerLine}/>
                                    </div>
                                    <div
                                        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            const f = e.dataTransfer.files[0];
                                            if (f) void handleFileConvert(f, folderId, subfolder.id, 'material');
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                        role="presentation"
                                    >
                                        {isConverting ? (
                                            <span className={styles.dropzoneConverting}>Convertendo documento...</span>
                                        ) : (
                                            <>
                                                <span
                                                    className={styles.dropzoneText}>Arraste um documento .docx aqui</span>
                                                <span
                                                    className={styles.dropzoneSubtext}>ou clique para selecionar</span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        className={styles.fileInput}
                                        type="file"
                                        accept=".docx"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) void handleFileConvert(f, folderId, subfolder.id, 'material');
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <PropagateModal
                isPropagateModalOpen={isPropagateModalOpen}
                savingTemplate={isSavingEdit}
                setIsPropagateModalOpen={setIsPropagateModalOpen}
                handleSaveTemplate={handleSaveEditWithPropagation}
                mode="edit"
            />
        </div>
    );
};





