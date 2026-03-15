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

type ListPayload<T> = T[] | { items?: T[]; data?: T[]; activities?: T[]; notes?: T[] };

const extractList = <T>(payload: ListPayload<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.activities)) return payload.activities;
  if (Array.isArray(payload.notes)) return payload.notes;
  return [];
};

const studentProfileService = {
  getNotes: async (studentId: string): Promise<StudentNote[]> => {
    const { data } = await api.get<ListPayload<StudentNote>>(`/students/${studentId}/notes`);
    return extractList(data);
  },

  getMyNotes: async (): Promise<StudentNote[]> => {
    const { data } = await api.get<ListPayload<StudentNote>>('/students/me/notes');
    return extractList(data);
  },

  createNote: async (
    studentId: string,
    payload: CreateStudentNoteRequest,
  ): Promise<StudentNote> => {
    const { data } = await api.post<StudentNote>(`/students/${studentId}/notes`, payload);
    return data;
  },

  getActivities: async (studentId: string): Promise<StudentActivity[]> => {
    const { data } = await api.get<ListPayload<StudentActivity>>(`/students/${studentId}/activities`);
    return extractList(data);
  },

  getMyActivities: async (): Promise<StudentActivity[]> => {
    const { data } = await api.get<ListPayload<StudentActivity>>('/students/me/activities');
    return extractList(data);
  },

  getExerciseFolders: async (studentId: string): Promise<StudentExerciseFolder[]> => {
    const { data } = await api.get<StudentWorkspaceResponse>(`/students/${studentId}/workspace`);
    return [...data.folders].sort((a, b) => a.position - b.position);
  },

  getMyExerciseFolders: async (): Promise<StudentExerciseFolder[]> => {
    const { data } = await api.get<StudentWorkspaceResponse>('/students/me/workspace');
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

  getMyStats: async (): Promise<StudentStats> => {
    const { data } = await api.get<StudentStats>('/students/me/stats');
    return data;
  },
};

export default studentProfileService;
