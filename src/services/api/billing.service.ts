import api from './client';
import { BillingMonth, BillingRecord } from '@/types/billing.types';

const billingService = {
  getMonthBilling: async (
    referenceMonth: string,
  ): Promise<BillingMonth> => {
    const { data } = await api.get<BillingMonth>(
      `/billing/month/${referenceMonth}`,
    );
    return data;
  },

  listAllRecords: async (): Promise<BillingRecord[]> => {
    const { data } = await api.get<BillingRecord[]>('/billing/records');
    return data;
  },

  getRecordsByStudent: async (studentId: string): Promise<BillingRecord[]> => {
    const { data } = await api.get<BillingRecord[]>(
      `/billing/student/${studentId}`,
    );
    return data;
  },

  markAsPaid: async (recordId: string): Promise<BillingRecord> => {
    const { data } = await api.patch<BillingRecord>(
      `/billing/records/${recordId}/paid`,
    );
    return data;
  },

  sendNotification: async (recordId: string): Promise<void> => {
    await api.post(`/billing/records/${recordId}/notify`);
  },
};

export default billingService;
