// src/components/ui/PresenceCard/PresenceCard.tsx
import React from "react";
import styles from "./PresenceCard.module.css";

interface PresenceCardProps {
  name: string;
  label: string;       // "Professor" ou "Aluno"
  connected: boolean;  // vem do useWebRTC().connected
}

export const PresenceCard: React.FC<PresenceCardProps> = ({
  name,
  label,
  connected,
}) => {
  return (
    <div className={styles.section}>
      <span className={styles.label}>{label}</span>
      <div className={styles.card}>
        <span
          className={`${styles.dot} ${connected ? styles.dotOnline : styles.dotOffline}`}
          aria-hidden="true"
        />
        <div className={styles.info}>
          <span className={styles.name}>{name}</span>
          <span className={styles.status}>
            {connected ? "Online agora" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
};