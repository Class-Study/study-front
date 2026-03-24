import api from './client';
import { LoginRequest, LoginApiResponse, AuthUser } from '@/types/auth.types';

interface AuthServiceLogin {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const parseTokens = (headers: Record<string, string>): { accessToken: string; refreshToken: string } => {
  // Backend envia X-Access-Token e X-Refresh-Token (axios normaliza para lowercase)
  const accessToken = (headers['x-access-token'] ?? headers['authorization'] ?? '')
    .replace('Bearer ', '')
    .trim();
  const refreshToken = (headers['x-refresh-token'] ?? '').trim();
  return { accessToken, refreshToken };
};

const authService = {
  loginTeacher: async (data: LoginRequest): Promise<AuthServiceLogin> => {
    const response = await api.post<LoginApiResponse>('/auth/login/teacher', data);
    const { accessToken, refreshToken } = parseTokens(response.headers as Record<string, string>);
    return { user: response.data.user, accessToken, refreshToken };
  },

  loginStudent: async (data: LoginRequest): Promise<AuthServiceLogin> => {
    const response = await api.post<LoginApiResponse>('/auth/login/student', data);
    const { accessToken, refreshToken } = parseTokens(response.headers as Record<string, string>);
    return { user: response.data.user, accessToken, refreshToken };
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },
};

export default authService;
