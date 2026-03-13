import api from './client';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  ListStudentsResponse,
} from '@/types/student.types';
import { PageResponse } from '@/types/api.types';

const studentService = {
  listAll: async (): Promise<Student[]> => {
    const { data } = await api.get<ListStudentsResponse>('/students');
    return data.students;
  },

  listPaginated: async (
    page: number = 0,
    size: number = 10,
  ): Promise<PageResponse<Student>> => {
    const { data } = await api.get<PageResponse<Student>>(
      `/students?page=${page}&size=${size}`,
    );
    return data;
  },

  getById: async (id: string): Promise<Student> => {
    const { data } = await api.get<Student>(`/students/${id}`);
    return data;
  },

  create: async (payload: CreateStudentRequest): Promise<void> => {
    await api.post('/students', payload);
  },

  update: async (
    id: string,
    payload: UpdateStudentRequest,
  ): Promise<Student> => {
    const { data } = await api.patch<Student>(
      `/students/${id}`,
      payload,
    );
    return data;
  },

  block: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },
};

export default studentService;
