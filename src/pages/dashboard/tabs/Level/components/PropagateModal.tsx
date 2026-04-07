import React from 'react';
import styles from '../LevelTab.module.css';

interface PropagateModalProps {
  isPropagateModalOpen: boolean;
  savingTemplate: boolean;
  setIsPropagateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveTemplate: (propagate: boolean) => Promise<void>;
}

export const PropagateModal: React.FC<PropagateModalProps> = ({
  isPropagateModalOpen,
  savingTemplate,
  setIsPropagateModalOpen,
  handleSaveTemplate,
}) => {
  if (!isPropagateModalOpen) return null;

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
          Deseja atribuir esta nova atividade a todos os alunos atuais deste nível?
        </h3>

        <p className={styles.propagateModalText}>
          Você pode salvar apenas no nível (válido para novos alunos) ou propagar também para os
          workspaces dos alunos já matriculados.
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
            Apenas no Nível
          </button>

          <button
            type="button"
            className={styles.propagateModalPrimaryBtn}
            onClick={() => void handleSaveTemplate(true)}
            disabled={savingTemplate}
          >
            {savingTemplate ? 'Salvando...' : 'Atribuir a Todos'}
          </button>
        </div>
      </div>
    </div>
  );
};

