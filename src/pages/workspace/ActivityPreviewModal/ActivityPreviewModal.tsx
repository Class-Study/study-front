// src/pages/workspace/components/ActivityPreviewModal/ActivityPreviewModal.tsx
import React from "react";
import { X } from "lucide-react";
import DocxPreviewEditor from "@/components/ui/DocxPreviewEditor/DocxPreviewEditor";
import { WorkspaceActivity } from "@/types/workspace.types";
import styles from "./ActivityPreviewModal.module.css";

interface Props {
  activity: WorkspaceActivity | null;
  onClose: () => void;
}

export const ActivityPreviewModal: React.FC<Props> = ({ activity, onClose }) => {
  if (!activity) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.badge}>Visualização</span>
            <h2 className={styles.title}>{activity.title}</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          <DocxPreviewEditor
            html={activity.convertedHtml}
            editable={false}
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
};