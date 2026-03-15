import api from './client';
import { Student } from '@/types/student.types';
import {
  StudentNote,
  StudentActivity,
  StudentStats,
  StudentExerciseFolder,
} from '@/types/studentProfile.types';

interface WorkspaceResponse {
  studentId: string;
  folders: StudentExerciseFolder[];
}

const meService = {
  getProfile: async (): Promise<Student> => {
    const { data } = await api.get<Student>('/me/profile');
    return data;
  },

  getNotes: async (): Promise<StudentNote[]> => {
    const { data } = await api.get<StudentNote[]>('/me/notes');
    return data;
  },

  getActivities: async (): Promise<StudentActivity[]> => {
    const { data } = await api.get<StudentActivity[]>('/me/activities');
    return data;
  },

  getFolders: async (): Promise<StudentExerciseFolder[]> => {
    const { data } = await api.get<WorkspaceResponse>('/me/workspace');
    return [...data.folders].sort((a, b) => a.position - b.position);
  },

  getStats: async (): Promise<StudentStats> => {
    const { data } = await api.get<StudentStats>('/me/stats');
    return data;
  },
};

export default meService;
