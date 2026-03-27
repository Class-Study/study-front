import api from './client';
import {
  CalendarEvent,
  CreateExtraClassRequest,
  WeekScheduleResponse,
} from '@/types/schedule.types';

const scheduleService = {
  /**
   * GET /api/v1/schedule/week
   * Retorna todas as aulas (recorrentes + avulsas) da semana.
   * Backend deve converter UTC → fuso do professor e retornar datas/horas locais.
   */
  getWeekSchedule: async (weekStart: string, timezone: string): Promise<WeekScheduleResponse> => {
    const { data } = await api.get<WeekScheduleResponse>('/schedule/week', {
      params: { weekStart, timezone },
    });
    return data;
  },

  /**
   * POST /api/v1/schedule/extra-class
   * Cria uma aula avulsa. Backend armazena em UTC, usando o timezone enviado.
   */
  createExtraClass: async (payload: CreateExtraClassRequest): Promise<CalendarEvent> => {
    const { data } = await api.post<CalendarEvent>('/schedule/extra-class', payload);
    return data;
  },

  /**
   * DELETE /api/v1/schedule/extra-class/{id}
   */
  deleteExtraClass: async (id: string): Promise<void> => {
    await api.delete(`/schedule/extra-class/${id}`);
  },
};

export default scheduleService;

