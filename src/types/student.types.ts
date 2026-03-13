export type StudentStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: StudentStatus;
  teacherId: string;
  levelProfileId?: string;
  classDays: string[];
  classTime: string;
  classDuration: number;
  classRate: number;
  meetPlatform?: string;
  meetLink?: string;
  startDate: string;
  createdAt: string;
}

export interface CreateStudentRequest {
  name: string;
  email: string;
  phone?: string;
  levelProfileId: string;
  classTime: string;
  classDays: string[];
  classDuration: number;
  classRate: number;
  meetPlatform?: string;
  meetLink?: string;
  startDate: string;
}

export interface UpdateStudentRequest {
  name?: string;
  email?: string;
  phone?: string;
  levelProfileId?: string;
  classTime?: string;
  classDays?: string[];
  classDuration?: number;
  classRate?: number;
  meetPlatform?: string;
  meetLink?: string;
  startDate?: string;
  status?: StudentStatus;
}
