import api from './client';
import { LoginRequest, LoginApiResponse, AuthUser } from '@/types/auth.types';

interface AuthServiceLogin {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const authService = {
  login: async (data: LoginRequest): Promise<AuthServiceLogin> => {
    const response = await api.post<LoginApiResponse>('/auth/login', data);
    // Axios normaliza headers de response para lowercase
    const accessToken = (response.headers['authorization'] ?? '')
      .replace('Bearer ', '')
      .trim();
    const refreshToken = (response.headers['x-refresh-token'] ?? '').trim();

    // user está dentro de response.data.user
    const user = response.data.user;

    return { user, accessToken, refreshToken };
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },
};

export default authService;
