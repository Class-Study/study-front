export type EventType = 'RECURRING' | 'EXTRA';

export interface CalendarEvent {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  startTime: string;
  durationMin: number;
  type: EventType;
  title: string;
  meetLink?: string;
  meetPlatform?: string;
  studentStatus: string;
  levelCode?: string;
}

// ── Request / Response dos endpoints (documentação para o backend) ────────────

/**
 * GET /api/v1/schedule/week
 * Query params:
 *   weekStart : "2026-03-23"  (ISO, segunda-feira da semana)
 *   timezone  : "America/Sao_Paulo"
 */
export interface WeekScheduleResponse {
  weekStart: string;
  weekEnd: string;
  events: CalendarEvent[];
}

/**
 * POST /api/v1/schedule/extra-class
 * Body: CreateExtraClassRequest
 * Response 201: CalendarEvent
 */
export interface CreateExtraClassRequest {
  studentId: string;
  date: string;
  startTime: string;
  durationMin: number;
  title: string;
  type: EventType
}