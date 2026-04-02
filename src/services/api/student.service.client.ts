import api from './client';

// ============================================================================
// TYPES - Student Services
// ============================================================================

// Schedule Types
export interface StudentScheduleResponse {
  studentName: string;
  classDays: string[]; // ['MONDAY', 'WEDNESDAY', 'FRIDAY']
  classTime: string; // '19:00:00'
  classDuration: number; // 60
  startDate: string; // '2026-01-15'
  endDate: string; // '2026-07-15'
  teacherName: string;
  teacherOnline: boolean;
  classes: StudentClassDate[];
}

export interface StudentClassDate {
  id: string;
  date: string; // '2026-04-02'
  time: string; // '19:00:00'
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'TODAY';
  classType: 'RECORRENTE' | 'EXTRA' | 'REMARCADA';
  isNextClass: boolean;
}

// Billing Types
export interface StudentBillingResponse {
  studentName: string;
  contractStartDate: string;
  contractEndDate: string;
  classRate: number;
  teacherName: string;
  teacherEmail: string;
  teacherPixKey: string;
  monthlyBilling: StudentMonthlyBilling[];
  // Note: Summary removed as per API specification - not exposed to students
}

export interface StudentMonthlyBilling {
  id: string;
  month: number;
  year: number;
  monthYear: string; // '2026-04'
  classCount: number;
  classValue: number;
  totalValue: number;
  dueDate: string; // '2026-05-10'
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION';
}

export interface PaymentConfirmationRequest {
  billingId: string;
  paymentMethod: 'PIX';
  pixDetails?: {
    pixKey: string;
    amount: number;
  };
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message: string;
  newStatus: 'AWAITING_CONFIRMATION';
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

const studentService = {
  // ── Schedule Endpoints ────────────────────────────────────────────────────
  
  /**
   * Busca a agenda completa do estudante
   * GET /api/student/schedule
   * Auth: Bearer token (student ID extraído do token)
   */
  getSchedule: async (): Promise<StudentScheduleResponse> => {
    const { data } = await api.get<StudentScheduleResponse>('/api/student/schedule');
    return data;
  },

  // ── Billing Endpoints ─────────────────────────────────────────────────────
  
  /**
   * Busca informações financeiras do estudante
   * GET /api/student/billing
   * Auth: Bearer token (student ID extraído do token)
   */
  getBilling: async (): Promise<StudentBillingResponse> => {
    const { data } = await api.get<StudentBillingResponse>('/api/student/billing');
    return data;
  },

  /**
   * Confirma pagamento de uma mensalidade
   * POST /api/student/billing/confirm-payment
   * Auth: Bearer token (student ID extraído do token)
   */
  confirmPayment: async (payload: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse> => {
    const { data } = await api.post<PaymentConfirmationResponse>('/api/student/billing/confirm-payment', payload);
    return data;
  },
};

export default studentService;




