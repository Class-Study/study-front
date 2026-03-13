import { useState, useCallback } from 'react';
import { BillingMonth } from '@/types/billing.types';
import billingService from '@/services/api/billing.service';

interface UseBillingReturn {
  billingData: BillingMonth | null;
  loading: boolean;
  error: string | null;
  fetchMonthBilling: (referenceMonth: string) => Promise<void>;
}

export const useBilling = (): UseBillingReturn => {
  const [billingData, setBillingData] = useState<BillingMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthBilling = useCallback(
    async (referenceMonth: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await billingService.getMonthBilling(referenceMonth);
        setBillingData(data);
      } catch {
        setError('Erro ao carregar dados de cobrança');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    billingData,
    loading,
    error,
    fetchMonthBilling,
  };
};
