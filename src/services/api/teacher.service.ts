import api from './client';
import {
  Teacher,
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from '@/types/teacher.types';
import { PageResponse } from '@/types/api.types';

const teacherService = {
  listAll: async (): Promise<Teacher[]> => {
    const { data } = await api.get<Teacher[]>('/teachers');
    return data;
  },

  listPaginated: async (
    page: number = 0,
    size: number = 10,
  ): Promise<PageResponse<Teacher>> => {
    const { data } = await api.get<PageResponse<Teacher>>(
      `/teachers?page=${page}&size=${size}`,
    );
    return data;
  },

  getById: async (id: string): Promise<Teacher> => {
    const { data } = await api.get<Teacher>(`/teachers/${id}`);
    return data;
  },

  create: async (payload: CreateTeacherRequest): Promise<Teacher> => {
    const { data } = await api.post<Teacher>('/teachers', payload);
    return data;
  },

  update: async (
    id: string,
    payload: UpdateTeacherRequest,
  ): Promise<Teacher> => {
    const { data } = await api.patch<Teacher>(
      `/teachers/${id}`,
      payload,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teachers/${id}`);
  },
};

export default teacherService;
