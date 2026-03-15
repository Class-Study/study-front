export type StudentStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE';

export type ClassDay =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY'
  | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: StudentStatus;
  teacherId?: string;
  levelProfileId?: string;
  levelProfile?: {
    id: string;
    name: string;
    code: string;
  };
  classDays: ClassDay[];
  classTime: string;
  classDuration: number;
  classRate: number;
  meetPlatform?: string;
  meetLink?: string;
  levelName?: string;
  levelCode?: string;
  levelProfileName?: string;
  levelProfileCode?: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherPhone?: string;
  teacher?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  startDate: string;
  createdAt: string;
}

export interface CreateStudentRequest {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
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

export interface ListStudentsResponse {
  students: Student[];
}

export type NoteType = 'PRIVATE' | 'PUBLIC';

export interface StudentNote {
  id?: string;
  type: NoteType;
  content: string;
  createdAt?: string;
}

export interface UpdateStudentNoteRequest {
  type: NoteType;
  content: string;
}
