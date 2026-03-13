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
    const accessToken = response.headers['x-access-token']?.replace('Bearer ', '') || '';
    const refreshToken = response.headers['x-refresh-token'] || '';
    return { user: response.data, accessToken, refreshToken };
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },
};

export default authService;
