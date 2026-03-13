import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'pending' | 'paid' | 'late';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className,
}) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className || ''}`}>
      {children}
    </span>
  );
};
