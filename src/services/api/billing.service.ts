import api from './client';
import {
  BillingMonthResponse,
  BillingEntry,
  BillingResponse,
  MarkBillingAsPaidPayload,
  MarkBillingAsPaidResponse,
  BillingStatus,
} from '@/types/billing.types';

const billingService = {
  getMonthBilling: async (month?: string): Promise<BillingResponse> => {
    const { data } = await api.get<BillingMonthResponse>('/billing', {
      params: month ? { month } : undefined,
    });

    const legacyStatsAvailable =
      typeof data.totalReceived === 'number' ||
      typeof data.totalPending === 'number' ||
      typeof data.totalExpected === 'number';

    const entries = data.entries ?? data.content ?? data.records ?? [];

    const statsFromLegacy = legacyStatsAvailable
      ? {
          totalMonth: data.totalExpected ?? 0,
          totalReceived: data.totalReceived ?? 0,
          totalPending: data.totalPending ?? 0,
          totalOverdue: data.totalLate ?? 0,
          paidCount: data.paidCount ?? 0,
          pendingCount: data.pendingCount ?? 0,
          overdueCount: data.lateCount ?? 0,
        }
      : undefined;

    return {
      stats: data.stats ?? statsFromLegacy ?? {
        totalMonth: 0,
        totalReceived: 0,
        totalPending: 0,
        totalOverdue: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
      },
      entries,
    };
  },

  getStudentHistory: async (
    studentId: string,
    params?: { status?: BillingStatus; page?: number; size?: number },
  ): Promise<{ content: BillingEntry[]; totalElements: number; totalPages: number; currentPage: number; size: number }> => {
    const { data } = await api.get<{ content: BillingEntry[]; totalElements: number; totalPages: number; currentPage: number; size: number }>(`/billing/students/${studentId}`, {
      params,
    });
    return data;
  },

  payEntry: async (
    billingId: string,
    payload?: MarkBillingAsPaidPayload,
  ): Promise<MarkBillingAsPaidResponse> => {
    const { data } = await api.patch<MarkBillingAsPaidResponse>(
      `/billing/${billingId}/pay`,
      payload ?? {},
    );
    return data;
  },

  updateStudentRate: async (studentId: string, amount: number): Promise<void> => {
    await api.patch(`/billing/students/${studentId}/rate`, { amount });
  },

  notifyPending: async (): Promise<void> => {
    await api.post('/billing/notify-pending');
  },
};

export default billingService;
