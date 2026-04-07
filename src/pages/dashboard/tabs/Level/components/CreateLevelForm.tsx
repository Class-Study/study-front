import React from 'react';
import type { NewLevelForm } from '@/types/levelTab.types.ts';
import { toSlug } from '@/utils/levelTab.utils.ts';
import styles from '../LevelTab.module.css';

interface CreateLevelFormProps {
  form: NewLevelForm;
  formError: string;
  creating: boolean;
  handleNameChange: (value: string) => void;
  handleFieldChange: (field: Exclude<keyof NewLevelForm, 'folders'>, value: string) => void;
  updateFolder: (tempId: string, value: string) => void;
  addFolder: () => void;
  removeFolder: (tempId: string) => void;
  handleCreateLevel: () => Promise<void>;
  resetForm: () => void;
  setShowForm: (show: boolean) => void;
}

export const CreateLevelForm: React.FC<CreateLevelFormProps> = ({
  form,
  formError,
  creating,
  handleNameChange,
  handleFieldChange,
  updateFolder,
  addFolder,
  removeFolder,
  handleCreateLevel,
  resetForm,
  setShowForm,
}) => (
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
        onClick={() => void handleCreateLevel()}
        disabled={creating}
      >
        {creating ? 'Criando...' : 'Criar perfil de nível'}
      </button>
    </div>
  </div>
);

