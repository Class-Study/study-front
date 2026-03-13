export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  language: string;
  bio?: string;
  certifications?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherRequest {
  name: string;
  email: string;
  phone?: string;
  language: string;
  bio?: string;
  certifications?: string[];
}

export interface UpdateTeacherRequest {
  name?: string;
  phone?: string;
  language?: string;
  bio?: string;
  certifications?: string[];
}
