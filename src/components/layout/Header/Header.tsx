import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import { Button } from '@/components/ui/Button/Button';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  breadcrumb?: string;
  onNewStudent?: () => void;
}

const getInitials = (name?: string | null): string => {
  if (!name || name.trim() === '') return '?';
  return name
    .trim()
    .split(' ')
    .filter((n) => n.length > 0)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getAvatarTone = (name?: string | null): number => {
  if (!name || name.trim() === '') return 0;
  return name.charCodeAt(0) % 6;
};

export const Header: React.FC<HeaderProps> = ({ title, breadcrumb, onNewStudent }) => {
  const { user, logout } = useAuth();

  const initials = getInitials(user?.name);
  const userName = user?.name ?? 'Usuário';
  const userRole = user?.role?.toLowerCase() ?? 'admin';
  const avatarToneClass = styles[`avatarTone${getAvatarTone(user?.name)}` as keyof typeof styles] ?? '';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.platformName}>EduSpace</span>
          <span className={styles.badge}>{userRole}</span>
          <span className={styles.separator}>›</span>
        </div>
        <div className={styles.breadcrumb}>
          {breadcrumb || title}
        </div>
      </div>

      <div className={styles.right}>
        {onNewStudent && (
          <Button
            variant="primary"
            size="md"
            onClick={onNewStudent}
            className={styles.newStudentBtn}
          >
            + Novo aluno
          </Button>
        )}

        <ThemeToggle />

        <div className={`${styles.avatar} ${avatarToneClass}`} title={userName}>
          {initials}
        </div>

        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
          <button
            className={styles.logoutBtn}
            onClick={logout}
            type="button"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};
