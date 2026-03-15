import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AccountInactivePage.module.css';

export const AccountInactivePage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Conta Inativa</h1>
        <p className={styles.subtitle}>
          Sua conta esta inativa. Entre em contato com seu professor.
        </p>
        <Link className={styles.action} to="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  );
};
