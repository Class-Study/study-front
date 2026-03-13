export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
