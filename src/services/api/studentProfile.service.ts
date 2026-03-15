import api from './client';
import {
  StudentNote,
  CreateStudentNoteRequest,
  StudentActivity,
  StudentStats,
  StudentExerciseFolder,
  CreateStudentExerciseRequest,
} from '@/types/studentProfile.types';

interface StudentWorkspaceResponse {
  studentId: string;
  folders: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

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

  getExerciseFolders: async (studentId: string): Promise<StudentExerciseFolder[]> => {
    const { data } = await api.get<StudentWorkspaceResponse>(`/students/${studentId}/workspace`);
    return [...data.folders].sort((a, b) => a.position - b.position);
  },

  createExercise: async (
    _studentId: string,
    folderId: string,
    payload: CreateStudentExerciseRequest,
  ): Promise<StudentActivity> => {
    const { data } = await api.post<StudentActivity>(
      `/folders/${folderId}/activities`,
      payload,
    );
    return data;
  },

  getStats: async (studentId: string): Promise<StudentStats> => {
    const { data } = await api.get<StudentStats>(`/students/${studentId}/stats`);
    return data;
  },
};

export default studentProfileService;
