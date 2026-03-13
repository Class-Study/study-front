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

export interface LoginResponse {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
}
