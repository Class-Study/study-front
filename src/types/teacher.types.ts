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

// Updated to match backend structure
export interface UpdateTeacherRequest {
  name?: string;
  phone?: string;
  email?: string;
  pixKey?: string;
  pixKeyType?: string;
  preferenceTheme?: string;
  workHour?: WorkHourRequest;
}

export interface WorkHourRequest {
  startTimeMorning: string; // Format: "HH:mm:ss"
  endTimeMorning: string;
  startTimeAfternoon: string;
  endTimeAfternoon: string;
}

// Teacher Configuration Types for GET config endpoint
export interface TeacherWorkHour {
  startTimeMorning: string;
  endTimeMorning: string;
  startTimeAfternoon: string;
  endTimeAfternoon: string;
}

export interface TeacherConfigResponse {
  pixKey: string | null;
  pixKeyType?: string | null;
  workHour: TeacherWorkHour;
}


