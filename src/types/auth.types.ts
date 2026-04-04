export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type UserTheme = 'light' | 'dark';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  preferenceTheme?: UserTheme;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Estrutura real que a API retorna
export interface LoginApiResponse {
  message: string;
  user: AuthUser;
}

// Alias para compatibilidade
export type LoginResponse = LoginApiResponse;
