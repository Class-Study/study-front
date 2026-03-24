import React, { createContext, useState, useCallback, useContext } from 'react';
import preferenceService from '@/services/api/preference.service';
import { UserTheme } from '@/types/auth.types';

type Theme = UserTheme;

export interface ThemeContextData {
  theme: Theme;
  toggleTheme: () => void;
  applyTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextData | undefined>(undefined);

const STORAGE_KEY = 'eduspace-theme';

const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage indisponível
  }
  return 'light';
};

const applyToDom = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = getInitialTheme();
    document.documentElement.setAttribute('data-theme', initial);
    return initial;
  });

  // Aplica tema localmente (sem persistir no banco — usado no login)
  const applyTheme = useCallback((next: Theme): void => {
    setTheme(next);
    applyToDom(next);
  }, []);

  // Alterna o tema e persiste no banco de forma assíncrona
  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyToDom(next);
      // Fire-and-forget: falha silenciosa — localStorage já foi atualizado
      preferenceService.updateTheme(next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextData => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
