import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import appConfig from '@/config/app.config';
import styles from './LoginPage.module.css';

type UserMode = 'teacher' | 'student';

interface LoginFormData {
  email: string;
  password: string;
}

const modeConfig = {
  teacher: {
    icon: '🎓',
    title: 'Professor',
    subtitle: 'Painel administrativo completo',
    buttonText: 'Entrar como professor',
  },
  student: {
    icon: '👤',
    title: 'Aluno',
    subtitle: 'Acesse seu espaço de estudo',
    buttonText: 'Entrar como aluno',
  },
};

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [mode, setMode] = useState<UserMode>('teacher');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const currentConfig = modeConfig[mode];

  const handleModeChange = (newMode: UserMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      setFormData({ email: '', password: '' });
      setError(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(formData.email, formData.password);
      // Navigation is handled by the auth context based on user role
    } catch {
      setError('Email ou senha inválidos');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.platformName}>{appConfig.platformName}</h1>
          <p className={styles.platformTagline}>{appConfig.platformTagline}</p>
        </div>

        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeButton} ${mode === 'teacher' ? styles.active : ''}`}
            onClick={() => handleModeChange('teacher')}
          >
            Professor
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'student' ? styles.active : ''}`}
            onClick={() => handleModeChange('student')}
          >
            Aluno
          </button>
        </div>

        <div className={styles.modeContent}>
          <div className={styles.modeIcon}>{currentConfig.icon}</div>
          <h2 className={styles.modeTitle}>{currentConfig.title}</h2>
          <p className={styles.modeSubtitle}>{currentConfig.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="email"
            name="email"
            label="E-mail"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <Input
            type="password"
            name="password"
            label="Senha"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            required
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className={`${styles.submitButton} ${styles[mode]}`}
          >
            {currentConfig.buttonText}
          </Button>
        </form>
      </div>
    </div>
  );
};
