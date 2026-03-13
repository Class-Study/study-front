import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>{theme === 'dark' ? '🌙' : '☀️'}</span>
      <button
        className={styles.switch}
        onClick={toggleTheme}
        aria-label="Alternar tema"
        type="button"
      >
        <span className={`${styles.thumb} ${theme === 'dark' ? styles.thumbDark : ''}`} />
      </button>
    </div>
  );
};
