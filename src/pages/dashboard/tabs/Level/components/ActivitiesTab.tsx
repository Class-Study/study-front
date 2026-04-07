import React from 'react';
import type { LevelFolderTemplate, LevelProfile } from '@/types/levelProfile.types.ts';
import type { PendingMaterial, PendingTemplateExtended, PreviewState } from '../../../../../types/levelTab.types.ts';
import { getFolderName } from '@/utils/levelTab.utils.ts';
import { SubfolderCard } from './SubfolderCard.tsx';
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
  editingSubfolderId: string | null;
  setEditingSubfolderId: React.Dispatch<React.SetStateAction<string | null>>;
  editingSubfolderName: string;
  setEditingSubfolderName: React.Dispatch<React.SetStateAction<string>>;
  handleRenameSubfolder: (folderId: string, subfolderId: string) => Promise<void>;
  handleDeleteSubfolder: (folderId: string, subfolderId: string, name: string) => Promise<void>;

  // Handlers
  handleFileConvert: (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material') => Promise<void>;
  handleViewSavedTemplate: (template: LevelFolderTemplate, folderId: string, subfolderId: string) => void;
  removePendingTemplate: (subfolderId: string, tempId: string) => void;
  handleDeleteTemplate: (profileId: string, folderId: string, subfolderId: string, templateId: string) => Promise<void>;
  handleDeleteMaterial: (profileId: string, folderId: string, subfolderId: string, materialId: string) => Promise<void>;

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
  editingSubfolderId,
  setEditingSubfolderId,
  editingSubfolderName,
  setEditingSubfolderName,
  handleRenameSubfolder,
  handleDeleteSubfolder,
  handleFileConvert,
  handleViewSavedTemplate,
  removePendingTemplate,
  handleDeleteTemplate,
  handleDeleteMaterial,
  setPreview,
}) => (
  <div className={styles.managementBody}>
    {saveSuccess && <div className={styles.successBanner}>{saveSuccessMessage}</div>}
    {saveError && <div className={styles.errorBanner}>{saveError}</div>}

    {selectedLevel.folders.map((folder, index) => {
      const subfolders = folder.subfolders ?? [];

      return (
        <section key={folder.id} className={styles.modalFolderCard}>
          <div className={styles.modalFolderHeader}>
            <div className={styles.modalFolderName}>📁 {getFolderName(folder, index)}</div>
          </div>

          {/* Criar subpasta */}
          <div style={{ display: 'flex', gap: '6px', padding: '0 12px 8px', alignItems: 'center' }}>
            <input
              className={styles.folderNameInput}
              type="text"
              placeholder="Nome da nova subpasta..."
              value={newSubfolderName[folder.id] ?? ''}
              onChange={(e) =>
                setNewSubfolderName((prev) => ({ ...prev, [folder.id]: e.target.value }))
              }
              style={{ flex: 1, fontSize: '13px', padding: '4px 8px' }}
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

          {subfolders.length === 0 && (
            <div className={styles.emptyTemplates}>Nenhuma subpasta ainda. Crie uma acima.</div>
          )}

          {subfolders.map((subfolder) => (
            <SubfolderCard
              key={subfolder.id}
              subfolder={subfolder}
              folderId={folder.id}
              selectedLevelId={selectedLevel.id}
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
              isEditing={editingSubfolderId === subfolder.id}
              editingSubfolderName={editingSubfolderName}
              setEditingSubfolderId={setEditingSubfolderId}
              setEditingSubfolderName={setEditingSubfolderName}
              handleRenameSubfolder={handleRenameSubfolder}
              handleDeleteSubfolder={handleDeleteSubfolder}
              handleFileConvert={handleFileConvert}
              handleViewSavedTemplate={handleViewSavedTemplate}
              removePendingTemplate={removePendingTemplate}
              handleDeleteTemplate={handleDeleteTemplate}
              handleDeleteMaterial={handleDeleteMaterial}
              setPreview={setPreview}
              setPendingMaterials={setPendingMaterials}
            />
          ))}
        </section>
      );
    })}
  </div>
);

