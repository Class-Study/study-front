import React, {useState} from 'react';
import type {LevelFolderExercise, LevelProfile, LevelSubfolder} from '@/types/levelProfile.types.ts';
import type {PendingMaterial, PendingSubfolder, PendingTemplateExtended, PreviewState} from '@/types/levelTab.types.ts';
import {ChevronDown} from 'lucide-react';
import {getFolderName} from '@/utils/levelTab.utils.ts';
import {SubfolderCard} from './SubfolderCard.tsx';
import styles from '../LevelTab.module.css';

interface ActivitiesTabProps {
    selectedLevel: LevelProfile;

    // Status banners
    saveSuccess: boolean;
    saveSuccessMessage: string;
    saveError: string | null;

    // Pending items
    pendingTemplates: Record<string, PendingTemplateExtended[]>;
    pendingMaterials: Record<string, PendingMaterial[]>;
    setPendingMaterials: React.Dispatch<React.SetStateAction<Record<string, PendingMaterial[]>>>;

    // Subfolder tabs
    subfolderInnerTab: Record<string, 'exercises' | 'materials'>;
    setSubfolderInnerTab: React.Dispatch<React.SetStateAction<Record<string, 'exercises' | 'materials'>>>;

    // Upload state
    activeUploadSubfolder: string | null;
    setActiveUploadSubfolder: React.Dispatch<React.SetStateAction<string | null>>;
    isConverting: boolean;
    isDragging: boolean;
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;

    // Subfolder CRUD
    newSubfolderName: Record<string, string>;
    setNewSubfolderName: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    creatingSubfolder: string | null;
    handleCreateSubfolder: (folderId: string) => Promise<void>;
    pendingSubfolders: Record<string, PendingSubfolder[]>;
    handleDeletePendingSubfolder: (folderId: string, tempId: string) => void;
    handleRenamePendingSubfolder: (folderId: string, tempId: string, newName: string) => void;
    handleTogglePropagateSubfolder: (folderId: string, tempId: string) => void;
    handleRenameSubfolder: (folderId: string, subfolderId: string, newName: string) => Promise<void>;
    handleDeleteSubfolder: (folderId: string, subfolderId: string, name: string) => Promise<void>;

    // Handlers
    handleFileConvert: (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material') => Promise<void>;
    handleViewSavedTemplate: (exercise: LevelFolderExercise, folderId: string, subfolderId: string) => void;
    removePendingTemplate: (subfolderId: string, tempId: string) => void;
    handleDeleteTemplate: (folderId: string, subfolderId: string, templateId: string, templateTitle: string) => Promise<void>;
    handleDeleteMaterial: (folderId: string, subfolderId: string, materialId: string, materialTitle: string) => Promise<void>;
    handleSaveSubfolderEdits: (folderId: string, subfolderId: string, newName: string, originalName: string, propagateToStudents?: boolean, deletedExerciseIds?: string[], deletedMaterialIds?: string[]) => Promise<void>;
    clearPendingForSubfolder: (subfolderId: string) => void;

    // Preview
    setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
    setSaveError: (error: string | null) => void;
}

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({
                                                                selectedLevel,
                                                                saveSuccess,
                                                                saveSuccessMessage,
                                                                saveError,
                                                                pendingTemplates,
                                                                pendingMaterials,
                                                                setPendingMaterials,
                                                                subfolderInnerTab,
                                                                setSubfolderInnerTab,
                                                                activeUploadSubfolder,
                                                                setActiveUploadSubfolder,
                                                                isConverting,
                                                                isDragging,
                                                                setIsDragging,
                                                                fileInputRef,
                                                                newSubfolderName,
                                                                setNewSubfolderName,
                                                                creatingSubfolder,
                                                                handleCreateSubfolder,
                                                                pendingSubfolders,
                                                                handleDeletePendingSubfolder,
                                                                handleRenamePendingSubfolder,
                                                                handleTogglePropagateSubfolder,
                                                                handleRenameSubfolder,
                                                                handleDeleteSubfolder,
                                                                handleFileConvert,
                                                                handleViewSavedTemplate,
                                                                removePendingTemplate,
                                                                handleDeleteTemplate,
                                                                handleDeleteMaterial,
                                                                handleSaveSubfolderEdits,
                                                                clearPendingForSubfolder,
                                                                setPreview,
                                                            }) => {
    // Estado para rastrear quais pastas estão abertas
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        setOpenFolders((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    return (
        <div className={styles.managementBody}>
            {saveSuccess && <div className={styles.successBanner}>{saveSuccessMessage}</div>}
            {saveError && <div className={styles.errorBanner}>{saveError}</div>}

            {selectedLevel.folders.map((folder, index) => {
                const subfolders = folder.subfolders ?? [];
                const isFolderOpen = openFolders.has(folder.id);

                return (
                    <section key={folder.id} className={styles.modalFolderCard}>
                        {/* Folder Accordion Header */}
                        <button
                            type="button"
                            className={styles.folderAccordionHeader}
                            onClick={() => toggleFolder(folder.id)}
                        >
                            <div className={styles.folderAccordionHeaderContent}>
                                <ChevronDown
                                    size={20}
                                    className={`${styles.chevronIcon} ${isFolderOpen ? styles.chevronIconOpen : ''}`}
                                />
                                <div className={styles.modalFolderName}>📁 {getFolderName(folder, index)}</div>
                            </div>
                        </button>

                        {/* Folder Accordion Content */}
                        <div
                            className={`${styles.folderAccordionContent} ${isFolderOpen ? styles.folderAccordionContentOpen : ''}`}>

                            {/* Criar subpasta */}
                            <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                                <input
                                    className={styles.folderNameInput}
                                    type="text"
                                    placeholder="Nome da nova subpasta..."
                                    value={newSubfolderName[folder.id] ?? ''}
                                    onChange={(e) =>
                                        setNewSubfolderName((prev) => ({...prev, [folder.id]: e.target.value}))
                                    }
                                    style={{flex: 1, fontSize: '13px', padding: '4px 8px'}}
                                />
                                <button
                                    type="button"
                                    className={styles.addSubfolderBtn}
                                    disabled={
                                        creatingSubfolder === folder.id || !(newSubfolderName[folder.id] ?? '').trim()
                                    }
                                    onClick={() => void handleCreateSubfolder(folder.id)}
                                >
                                    {creatingSubfolder === folder.id ? '...' : '+ Subpasta'}
                                </button>
                            </div>

                            {subfolders.length === 0 && (pendingSubfolders[folder.id] ?? []).length === 0 && (
                                <div className={styles.emptyTemplates}>Nenhuma subpasta ainda. Crie uma acima.</div>
                            )}

                            {subfolders.map((subfolder) => (
                                <SubfolderCard
                                    key={subfolder.id}
                                    subfolder={subfolder}
                                    folderId={folder.id}
                                    isFolderOpen={isFolderOpen}
                                    sfPendingTemplates={pendingTemplates[subfolder.id] ?? []}
                                    sfPendingMaterials={pendingMaterials[subfolder.id] ?? []}
                                    activeTab={subfolderInnerTab[subfolder.id] ?? 'exercises'}
                                    setSubfolderInnerTab={setSubfolderInnerTab}
                                    isSubfolderUploadOpen={activeUploadSubfolder === subfolder.id}
                                    setActiveUploadSubfolder={setActiveUploadSubfolder}
                                    isConverting={isConverting}
                                    isDragging={isDragging}
                                    setIsDragging={setIsDragging}
                                    fileInputRef={fileInputRef}
                                    handleRenameSubfolder={handleRenameSubfolder}
                                    handleDeleteSubfolder={handleDeleteSubfolder}
                                    handleFileConvert={handleFileConvert}
                                    handleViewSavedTemplate={handleViewSavedTemplate}
                                    removePendingTemplate={removePendingTemplate}
                                    handleDeleteTemplate={handleDeleteTemplate}
                                    handleDeleteMaterial={handleDeleteMaterial}
                                    handleSaveSubfolderEdits={handleSaveSubfolderEdits}
                                    clearPendingForSubfolder={clearPendingForSubfolder}
                                    setPreview={setPreview}
                                    setPendingMaterials={setPendingMaterials}
                                />
                            ))}

                            {(pendingSubfolders[folder.id] ?? []).map((ps) => {
                                const fakeSubfolder: LevelSubfolder = {
                                    id: ps.tempId,
                                    name: ps.name,
                                    position: 0,
                                    exercises: [],
                                    studyMaterials: [],
                                };
                                return (
                                    <SubfolderCard
                                        key={ps.tempId}
                                        subfolder={fakeSubfolder}
                                        folderId={folder.id}
                                        isFolderOpen={isFolderOpen}
                                        sfPendingTemplates={pendingTemplates[ps.tempId] ?? []}
                                        sfPendingMaterials={pendingMaterials[ps.tempId] ?? []}
                                        activeTab={subfolderInnerTab[ps.tempId] ?? 'exercises'}
                                        setSubfolderInnerTab={setSubfolderInnerTab}
                                        isSubfolderUploadOpen={activeUploadSubfolder === ps.tempId}
                                        setActiveUploadSubfolder={setActiveUploadSubfolder}
                                        isConverting={isConverting}
                                        isDragging={isDragging}
                                        setIsDragging={setIsDragging}
                                        fileInputRef={fileInputRef}
                                        handleRenameSubfolder={handleRenameSubfolder}
                                        handleDeleteSubfolder={handleDeleteSubfolder}
                                        handleFileConvert={handleFileConvert}
                                        handleViewSavedTemplate={handleViewSavedTemplate}
                                        removePendingTemplate={removePendingTemplate}
                                        handleDeleteTemplate={handleDeleteTemplate}
                                        handleDeleteMaterial={handleDeleteMaterial}
                                        handleSaveSubfolderEdits={handleSaveSubfolderEdits}
                                        clearPendingForSubfolder={clearPendingForSubfolder}
                                        setPreview={setPreview}
                                        setPendingMaterials={setPendingMaterials}
                                        isPending={true}
                                        propagateToStudents={ps.propagateToStudents}
                                        onDeletePending={() => handleDeletePendingSubfolder(folder.id, ps.tempId)}
                                        onRenamePending={(newName: string) => handleRenamePendingSubfolder(folder.id, ps.tempId, newName)}
                                        onTogglePropagate={() => handleTogglePropagateSubfolder(folder.id, ps.tempId)}
                                    />
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

