import api from './client';
import {
  BillingEntry,
  BillingPageResponse,
  BillingStatus,
} from '@/types/billing.types';

const billingService = {
  getStudentMonthBilling: async (
    studentId: string,
    referenceMonth: string,
  ): Promise<BillingEntry> => {
    const { data } = await api.get<BillingEntry>(
      `/billing/${studentId}/month/${referenceMonth}`,
    );
    return data;
  },

  getStudentBillings: async (
    studentId: string,
    params?: { status?: BillingStatus; page?: number; size?: number },
  ): Promise<BillingPageResponse> => {
    const { data } = await api.get<BillingPageResponse>(`/billing/${studentId}`, {
      params,
    });
    return data;
  },

  payEntry: async (
    billingId: string,
    payload?: { paidAt?: string; notes?: string },
  ): Promise<Pick<BillingEntry, 'id' | 'status' | 'paidAt'>> => {
    const { data } = await api.post<Pick<BillingEntry, 'id' | 'status' | 'paidAt'>>(
      `/billing/${billingId}/pay`,
      payload ?? {},
    );
    return data;
  },
};

export default billingService;
