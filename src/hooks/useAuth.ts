import { useContext } from 'react';
import { AuthContext, AuthContextData } from '@/contexts/AuthContext';

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
