import api from './client';
import {
  StudentNote,
  CreateStudentNoteRequest,
  StudentActivity,
  StudentStats,
} from '@/types/studentProfile.types';

const studentProfileService = {
  getNotes: async (studentId: string): Promise<StudentNote[]> => {
    const { data } = await api.get<StudentNote[]>(`/students/${studentId}/notes`);
    return data;
  },

  createNote: async (
    studentId: string,
    payload: CreateStudentNoteRequest,
  ): Promise<StudentNote> => {
    const { data } = await api.post<StudentNote>(`/students/${studentId}/notes`, payload);
    return data;
  },

  getActivities: async (studentId: string): Promise<StudentActivity[]> => {
    const { data } = await api.get<StudentActivity[]>(`/students/${studentId}/activities`);
    return data;
  },

  getStats: async (studentId: string): Promise<StudentStats> => {
    const { data } = await api.get<StudentStats>(`/students/${studentId}/stats`);
    return data;
  },
};

export default studentProfileService;
