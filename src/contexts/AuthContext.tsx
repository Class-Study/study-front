import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthUser } from '@/types/auth.types';
import authService from '@/services/api/auth.service';

export interface AuthContextData {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Finaliza hidratação inicial do contexto
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authService.login({
        email,
        password,
      });

      // Validar que o token foi recebido corretamente
      if (!accessToken || !accessToken.trim()) {
        throw new Error('Token não recebido do servidor');
      }

      // Salva no localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Atualiza estado
      setUser(user);
      setIsAuthenticated(true);

      // Redireciona conforme role
      if (user.role === 'STUDENT') {
        navigate('/me');
      } else {
        navigate('/dashboard'); // TEACHER e ADMIN
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      localStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
