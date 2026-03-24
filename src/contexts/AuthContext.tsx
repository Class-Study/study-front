import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '@/types/auth.types';
import authService from '@/services/api/auth.service';

export interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginLoading: boolean;
  login: (email: string, password: string, role: 'teacher' | 'student') => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      // Valida que tem os campos necessários
      if (parsed?.id && parsed?.role) return parsed as AuthUser;
      return null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(user));
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const login = async (email: string, password: string, role: 'teacher' | 'student') => {
    setIsLoginLoading(true);
    let result: Awaited<ReturnType<typeof authService.loginTeacher>> | null = null;
    try {
      const credentials = { email, password };
      result = role === 'student'
        ? await authService.loginStudent(credentials)
        : await authService.loginTeacher(credentials);
    } finally {
      setIsLoginLoading(false);
    }

    const { user, accessToken, refreshToken } = result!;

    if (!accessToken?.trim()) {
      throw new Error('Token não recebido do servidor');
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    setIsAuthenticated(true);

    if (user.role === 'STUDENT') {
      navigate('/me');
    } else {
      navigate('/dashboard');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      // Preserva preferências do usuário (tema) ao limpar a sessão
      const theme = localStorage.getItem('eduspace-theme');
      localStorage.clear();
      if (theme) localStorage.setItem('eduspace-theme', theme);

      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading: false,
        isLoginLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
