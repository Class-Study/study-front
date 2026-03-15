import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import styles from './AccessDeniedPage.module.css';

export const AccessDeniedPage: React.FC = () => {
  const { user } = useAuth();
  const fallbackPath = user?.role === 'STUDENT' ? '/student/profile' : '/dashboard';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Acesso Negado</h1>
        <p className={styles.subtitle}>
          Voce nao tem permissao para acessar este recurso.
        </p>
        <Link className={styles.action} to={fallbackPath}>
          Voltar para pagina inicial
        </Link>
      </div>
    </div>
  );
};
