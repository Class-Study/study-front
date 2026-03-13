import api from './client';
import { LoginRequest, LoginResponse } from '@/types/auth.types';

interface AuthServiceLogin {
  user: LoginResponse;
  accessToken: string;
  refreshToken: string;
}

const authService = {
  login: async (data: LoginRequest): Promise<AuthServiceLogin> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    // Axios normaliza headers de response para lowercase
    const accessToken = (response.headers['authorization'] ?? '')
      .replace('Bearer ', '')
      .trim();
    const refreshToken = (response.headers['x-refresh-token'] ?? '').trim();
    console.log('Auth token extracted:', { accessToken: accessToken ? 'SET' : 'EMPTY', refreshToken: refreshToken ? 'SET' : 'EMPTY' });
    return { user: response.data, accessToken, refreshToken };
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },
};

export default authService;
