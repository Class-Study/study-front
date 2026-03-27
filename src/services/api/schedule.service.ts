import api from './client';
import { WeekScheduleResponse, CreateExtraClassRequest } from '@/types/schedule.types';

const scheduleService = {
  // Matches backend contract: GET /schedule/week?weekStart=...&weekEnd=...&teacherId=...
  getWeek: async (weekStart: string, weekEnd: string, teacherId: string): Promise<WeekScheduleResponse> => {
    const { data } = await api.get<WeekScheduleResponse>('/schedule/week', {
      params: { weekStart, weekEnd, teacherId },
    });
    return data;
  },

  // POST /schedule/extra-class
  createExtraClass: async (payload: CreateExtraClassRequest | any): Promise<void> => {
    await api.post('/schedule/extra-class', payload);
  },
};

export default scheduleService;

