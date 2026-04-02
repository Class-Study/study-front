import api from './client';
import {WeekScheduleResponse, CreateExtraClassRequest, RescheduleOptionResponse} from '@/types/schedule.types';

const scheduleService = {
    // Matches backend contract: GET /schedule/week?weekStart=...&weekEnd=...&teacherId=...
    getWeek: async (weekStart: string, weekEnd: string, teacherId: string): Promise<WeekScheduleResponse> => {
        const {data} = await api.get<WeekScheduleResponse>('/schedule/week', {
            params: {weekStart, weekEnd, teacherId},
        });
        return data;
    },

    // POST /schedule/extra-class
    createExtraClass: async (payload: CreateExtraClassRequest | any): Promise<void> => {
        await api.post('/schedule/extra-class', payload);
    },

    getRescheduleOptions: async (scheduleId: string, date: string, scheduleType: string): Promise<RescheduleOptionResponse> => {
        const {data} = await api.get<RescheduleOptionResponse>(`/schedule/${scheduleId}/reschedule-options`, {
            params: {date, scheduleType}
        })
        return data;
    },

    reschedule: async (scheduleId: string, newDate: string, newTime: string): Promise<void> => {
        await api.patch(`/schedule/${scheduleId}/reschedule`, {newDate, newTime});
    },
}

export default scheduleService;

