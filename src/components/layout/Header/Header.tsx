import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumb?: string;
  breadcrumbItems?: BreadcrumbItem[];
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

export const Header: React.FC<HeaderProps> = ({ breadcrumb, breadcrumbItems }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hasBreadcrumbItems = (breadcrumbItems?.length ?? 0) > 0;

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
          {(hasBreadcrumbItems || breadcrumb) && <span className={styles.separator}>›</span>}
        </div>
        {hasBreadcrumbItems && (
          <div className={styles.breadcrumbWrapper}>
            {breadcrumbItems?.map((item, idx) => {
              const path = item.path;

              return (
                <React.Fragment key={`${item.label}-${idx}`}>
                  {idx > 0 && <span className={styles.separator}>›</span>}
                  {path ? (
                    <button
                      className={styles.breadcrumbLink}
                      onClick={() => navigate(path)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className={styles.breadcrumbCurrent}>{item.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
        {!hasBreadcrumbItems && breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      </div>

      <div className={styles.right}>

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
