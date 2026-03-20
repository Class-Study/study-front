// src/pages/workspace/components/ActiveFileBar/ActiveFileBar.tsx
import React from "react";
import { FileText } from "lucide-react";
import styles from "./ActiveFileBar.module.css";

interface Props {
  activityTitle: string | null;
  isLive?: boolean; // true quando é feed em tempo real do aluno
}

export const ActiveFileBar: React.FC<Props> = ({ activityTitle, isLive = false }) => {
  if (!activityTitle) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <FileText size={13} className={styles.icon} />
        <span className={styles.title}>{activityTitle}</span>
      </div>
      {isLive && (
        <div className={styles.liveTag}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>ao vivo</span>
        </div>
      )}
    </div>
  );
};