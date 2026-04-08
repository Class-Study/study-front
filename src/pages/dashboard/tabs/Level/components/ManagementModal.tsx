import React from 'react';
import { Modal } from '@/components/ui/Modal/Modal.tsx';
import type { LevelFolderTemplate, LevelProfile } from '@/types/levelProfile.types.ts';
import type {
  ModalTab,
  NewLevelForm,
  PendingMaterial,
  PendingTemplateExtended,
  PreviewState,
} from '@/types/levelTab.types.ts';
import { ActivitiesTab } from './ActivitiesTab.tsx';
import { EditLevelTab } from './EditLevelTab.tsx';
import styles from '../LevelTab.module.css';

interface ManagementModalProps {
  selectedLevel: LevelProfile | null;
  selectedLevelToneClass: string;
  managementTab: ModalTab;
  setManagementTab: React.Dispatch<React.SetStateAction<ModalTab>>;
  closeManagementModal: () => void;

  // Save all
  hasPendingContent: boolean;
  hasPendingPropagation: boolean;
  totalPending: number;
  saving: boolean;
  handleSaveAll: () => Promise<void>;

  // Activities tab props
  saveSuccess: boolean;
  saveSuccessMessage: string;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  pendingTemplates: Record<string, PendingTemplateExtended[]>;
  pendingMaterials: Record<string, PendingMaterial[]>;
  setPendingMaterials: React.Dispatch<React.SetStateAction<Record<string, PendingMaterial[]>>>;
  subfolderInnerTab: Record<string, 'exercises' | 'materials'>;
  setSubfolderInnerTab: React.Dispatch<React.SetStateAction<Record<string, 'exercises' | 'materials'>>>;
  activeUploadSubfolder: string | null;
  setActiveUploadSubfolder: React.Dispatch<React.SetStateAction<string | null>>;
  isConverting: boolean;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  newSubfolderName: Record<string, string>;
  setNewSubfolderName: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  creatingSubfolder: string | null;
  handleCreateSubfolder: (folderId: string) => Promise<void>;
  editingSubfolderId: string | null;
  setEditingSubfolderId: React.Dispatch<React.SetStateAction<string | null>>;
  editingSubfolderName: string;
  setEditingSubfolderName: React.Dispatch<React.SetStateAction<string>>;
  handleRenameSubfolder: (folderId: string, subfolderId: string, newName: string) => Promise<void>;
  handleDeleteSubfolder: (folderId: string, subfolderId: string, name: string) => Promise<void>;
  handleFileConvert: (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material') => Promise<void>;
  handleViewSavedTemplate: (template: LevelFolderTemplate, folderId: string, subfolderId: string) => void;
  removePendingTemplate: (subfolderId: string, tempId: string) => void;
  handleDeleteTemplate: (profileId: string, folderId: string, subfolderId: string, templateId: string) => Promise<void>;
  handleDeleteMaterial: (profileId: string, folderId: string, subfolderId: string, materialId: string) => Promise<void>;
  setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;

  // Edit tab props
  editForm: NewLevelForm;
  editError: string;
  savingEdit: boolean;
  updateEditField: (field: Exclude<keyof NewLevelForm, 'folders'>, value: string) => void;
  updateEditFolder: (tempId: string, value: string) => void;
  addEditFolder: () => void;
  removeEditFolder: (tempId: string) => void;
  handleSaveLevelChanges: () => Promise<void>;
}

export const ManagementModal: React.FC<ManagementModalProps> = (props) => {
  const { selectedLevel, closeManagementModal } = props;

  const modalTitle = selectedLevel ? (
    <div className={`${styles.modalTitleWrap} ${styles.modalTitleWithActions}`}>
      <div className={styles.modalTitleWrap}>
        <span className={`${styles.levelDot} ${props.selectedLevelToneClass}`} />
        <div className={styles.modalTitleInfo}>
          <div className={styles.modalTitleMain}>{selectedLevel.name}</div>
          <div className={styles.modalTitleSub}>
            {selectedLevel.description || 'Sem descrição'}
            {selectedLevel.isSystem ? <span className={styles.systemBadge}>Sistema</span> : null}
          </div>
        </div>
      </div>

      {props.hasPendingContent && (
        <button
          type="button"
          className={styles.saveAllBtn}
          onClick={() => void props.handleSaveAll()}
          disabled={props.saving}
        >
          {props.saving
            ? props.hasPendingPropagation
              ? 'Salvando e atribuindo...'
              : 'Salvando...'
            : `Salvar tudo (${props.totalPending})`}
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <Modal isOpen={selectedLevel !== null} onClose={closeManagementModal} size="lg" title={modalTitle}>
      {selectedLevel && (
        <div className={styles.managementContent}>
          <div className={styles.managementTabs}>
            <button
              type="button"
              className={`${styles.managementTab} ${props.managementTab === 'activities' ? styles.managementTabActive : ''}`}
              onClick={() => props.setManagementTab('activities')}
            >
              Atividades
            </button>
            <button
              type="button"
              className={`${styles.managementTab} ${props.managementTab === 'edit' ? styles.managementTabActive : ''}`}
              onClick={() => props.setManagementTab('edit')}
              disabled={selectedLevel.isSystem}
            >
              Editar nível
            </button>
          </div>

          {props.managementTab === 'activities' && (
            <ActivitiesTab
              selectedLevel={selectedLevel}
              saveSuccess={props.saveSuccess}
              saveSuccessMessage={props.saveSuccessMessage}
              saveError={props.saveError}
              pendingTemplates={props.pendingTemplates}
              pendingMaterials={props.pendingMaterials}
              setPendingMaterials={props.setPendingMaterials}
              subfolderInnerTab={props.subfolderInnerTab}
              setSubfolderInnerTab={props.setSubfolderInnerTab}
              activeUploadSubfolder={props.activeUploadSubfolder}
              setActiveUploadSubfolder={props.setActiveUploadSubfolder}
              isConverting={props.isConverting}
              isDragging={props.isDragging}
              setIsDragging={props.setIsDragging}
              fileInputRef={props.fileInputRef}
              newSubfolderName={props.newSubfolderName}
              setNewSubfolderName={props.setNewSubfolderName}
              creatingSubfolder={props.creatingSubfolder}
              handleCreateSubfolder={props.handleCreateSubfolder}
              handleRenameSubfolder={props.handleRenameSubfolder}
              handleDeleteSubfolder={props.handleDeleteSubfolder}
              handleFileConvert={props.handleFileConvert}
              handleViewSavedTemplate={props.handleViewSavedTemplate}
              removePendingTemplate={props.removePendingTemplate}
              handleDeleteTemplate={props.handleDeleteTemplate}
              handleDeleteMaterial={props.handleDeleteMaterial}
              setPreview={props.setPreview}
              setSaveError={props.setSaveError}
            />
          )}

          {props.managementTab === 'edit' && (
            <EditLevelTab
              selectedLevel={selectedLevel}
              editForm={props.editForm}
              editError={props.editError}
              savingEdit={props.savingEdit}
              updateEditField={props.updateEditField}
              updateEditFolder={props.updateEditFolder}
              addEditFolder={props.addEditFolder}
              removeEditFolder={props.removeEditFolder}
              handleSaveLevelChanges={props.handleSaveLevelChanges}
              closeManagementModal={closeManagementModal}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

