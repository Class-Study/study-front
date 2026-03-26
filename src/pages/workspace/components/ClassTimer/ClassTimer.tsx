import React from 'react';
import { ClassTimerState } from '@/hooks/useClassTimer';
import styles from './ClassTimer.module.css';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function fmtMin(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

interface ClassTimerProps {
  timer: ClassTimerState;
}

export const ClassTimer: React.FC<ClassTimerProps> = ({ timer }) => {
  if (timer.isClassTime) {
    return (
      <div className={styles.wrap}>
        <span className={`${styles.dot} ${styles.dotActive}`} />
        <div className={styles.info}>
          <span className={styles.elapsed}>{fmt(timer.elapsed)}</span>
          <span className={styles.total}>{fmtMin(timer.duration)}</span>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${timer.progress * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (timer.isEnded) {
    return (
      <div className={`${styles.wrap} ${styles.ended}`}>
        <span className={`${styles.dot} ${styles.dotEnded}`} />
        <span className={styles.label}>Aula encerrada</span>
      </div>
    );
  }

  // Grace period ou fora do horário
  return (
    <div className={`${styles.wrap} ${styles.idle}`}>
      <span className={`${styles.dot} ${styles.dotIdle}`} />
      <span className={styles.label}>{timer.nextLabel || 'Fora do horário'}</span>
    </div>
  );
};



