import React from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${styles[variant]}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
