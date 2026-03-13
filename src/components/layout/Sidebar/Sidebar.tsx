import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Users, DollarSign, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>EduSpace</h1>
      </div>

      <nav className={styles.nav}>
        <Link to="/dashboard" className={styles.navItem}>
          <Home size={20} />
          <span>Dashboard</span>
        </Link>

        {user?.role === 'TEACHER' && (
          <>
            <Link to="/students" className={styles.navItem}>
              <Users size={20} />
              <span>Alunos</span>
            </Link>

            <Link to="/billing" className={styles.navItem}>
              <DollarSign size={20} />
              <span>Cobrança</span>
            </Link>
          </>
        )}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{user?.name}</p>
          <p className={styles.userRole}>{user?.role}</p>
        </div>
        <button
          className={styles.logoutButton}
          onClick={handleLogout}
          title="Fazer logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};
