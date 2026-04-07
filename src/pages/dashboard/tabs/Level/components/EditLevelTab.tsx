import React from 'react';
import type { LevelProfile } from '@/types/levelProfile.types.ts';
import type { NewLevelForm } from '@/types/levelTab.types.ts';
import styles from '../LevelTab.module.css';

interface EditLevelTabProps {
  selectedLevel: LevelProfile;
  editForm: NewLevelForm;
  editError: string;
  savingEdit: boolean;
  updateEditField: (field: Exclude<keyof NewLevelForm, 'folders'>, value: string) => void;
  updateEditFolder: (tempId: string, value: string) => void;
  addEditFolder: () => void;
  removeEditFolder: (tempId: string) => void;
  handleSaveLevelChanges: () => Promise<void>;
  closeManagementModal: () => void;
}

export const EditLevelTab: React.FC<EditLevelTabProps> = ({
  selectedLevel,
  editForm,
  editError,
  savingEdit,
  updateEditField,
  updateEditFolder,
  addEditFolder,
  removeEditFolder,
  handleSaveLevelChanges,
  closeManagementModal,
}) => (
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
            onClick={() => void handleSaveLevelChanges()}
            disabled={savingEdit}
          >
            {savingEdit ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    )}
  </div>
);

