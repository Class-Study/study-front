import React from 'react';
import styles from '../LevelTab.module.css';

interface PropagateModalProps {
  isPropagateModalOpen: boolean;
  savingTemplate: boolean;
  setIsPropagateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveTemplate: (propagate: boolean) => Promise<void>;
  mode?: 'save' | 'edit';
}

export const PropagateModal: React.FC<PropagateModalProps> = ({
  isPropagateModalOpen,
  savingTemplate,
  setIsPropagateModalOpen,
  handleSaveTemplate,
  mode = 'save',
}) => {
  if (!isPropagateModalOpen) return null;

  const isEdit = mode === 'edit';

  const title = isEdit
    ? 'Deseja propagar as alterações?'
    : 'Atenção';

  const description = isEdit
    ? 'As alterações serão refletidas para os alunos já matriculados neste nível. Obs: a exclusão de conteúdos não será propagada.'
    : 'Os conteúdos adicionados serão propagados para os alunos já matriculados neste nível.';

  const secondaryLabel = isEdit ? 'Apenas Salvar' : 'Apenas no Nível';
  const primaryLabel = isEdit ? 'Salvar e Propagar' : 'Salvar e Atribuir a Todos';

  return (
    <div
      className={styles.propagateModalOverlay}
      role="presentation"
      onClick={() => {
        if (!savingTemplate) setIsPropagateModalOpen(false);
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
          {title}
        </h3>

        <p className={styles.propagateModalText}>
          {description}
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
            onClick={() => void handleSaveTemplate(false)}
            disabled={savingTemplate}
          >
            {secondaryLabel}
          </button>

          <button
            type="button"
            className={styles.propagateModalPrimaryBtn}
            onClick={() => void handleSaveTemplate(true)}
            disabled={savingTemplate}
          >
            {savingTemplate ? 'Salvando...' : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
