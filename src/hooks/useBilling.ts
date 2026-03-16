import { useCallback, useState } from "react";
import billingService from "@/services/api/billing.service";
import {
  BillingEntry,
  BillingStats,
  BillingStatus,
  StudentPaymentHistory,
} from "@/types/billing.types";

interface UseBillingReturn {
  entries: BillingEntry[];
  stats: BillingStats | null;
  loading: boolean;
  error: string | null;
  paying: string | null;
  notifying: boolean;
  updatingRateStudentId: string | null;
  fetchBilling: (referenceMonth: string) => Promise<void>;
  payEntry: (billingId: string, referenceMonth: string) => Promise<void>;
  updateStudentRate: (
    studentId: string,
    amount: number,
    referenceMonth: string,
  ) => Promise<void>;
  notifyPending: (referenceMonth: string) => Promise<void>;
  fetchStudentHistory: (studentId: string) => Promise<void>;
  studentHistory: StudentPaymentHistory | null;
  historyLoading: boolean;
}

const normalizeStatus = (entry: BillingEntry): BillingStatus => {
  if (entry.status === "PAID") return "PAID";
  if (entry.status === "OVERDUE") return "OVERDUE";
  if (!entry.dueDate) return entry.status === "PENDING" ? "PENDING" : "PENDING";
  const today = new Date();
  const due = new Date(entry.dueDate);
  if (Number.isNaN(due.getTime()))
    return entry.status === "PENDING" ? "PENDING" : "PENDING";
  return due < today ? "OVERDUE" : "PENDING";
};

const buildStats = (entries: BillingEntry[]): BillingStats => {
  const paidEntries = entries.filter((e) => e.status === "PAID");
  const pendingEntries = entries.filter((e) => e.status === "PENDING");
  const overdueEntries = entries.filter((e) => e.status === "OVERDUE");

  const totalReceived = paidEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = pendingEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalOverdue = overdueEntries.reduce((sum, e) => sum + e.amount, 0);

  return {
    totalMonth: totalReceived + totalPending + totalOverdue,
    totalReceived,
    totalPending,
    totalOverdue,
    paidCount: paidEntries.length,
    pendingCount: pendingEntries.length,
    overdueCount: overdueEntries.length,
  };
};

export const useBilling = (): UseBillingReturn => {
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [updatingRateStudentId, setUpdatingRateStudentId] = useState<
    string | null
  >(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [studentHistory, setStudentHistory] =
    useState<StudentPaymentHistory | null>(null);

  const fetchBilling = useCallback(async (referenceMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.getMonthBilling(referenceMonth);
      const foundEntries = data.entries.map((entry) => ({
        ...entry,
        status: normalizeStatus(entry),
      }));

      setEntries(foundEntries);
      setStats(data.stats ?? buildStats(foundEntries));
    } catch {
      setError("Erro ao carregar dados de cobrança");
      setEntries([]);
      setStats(buildStats([]));
    } finally {
      setLoading(false);
    }
  }, []);

  const payEntry = useCallback(
    async (billingId: string, referenceMonth: string) => {
      setPaying(billingId);

      const optimisticPaidAt = new Date().toISOString();

      let previousEntries: BillingEntry[] = [];

      setEntries((prev) => {
        previousEntries = prev;

        const original = prev.find((entry) => entry.id === billingId);
        if (!original || original.status === "PAID") return prev;

        const optimisticEntries = prev.map((entry) =>
          entry.id === billingId
            ? { ...entry, status: "PAID" as const, paidAt: optimisticPaidAt }
            : entry,
        );

        setStats(buildStats(optimisticEntries));
        return optimisticEntries;
      });

      try {
        const result = await billingService.payEntry(billingId, {
          paidAt: optimisticPaidAt,
          notes: "Pagamento recebido",
        });

        setEntries((prev) => {
          const syncedEntries = prev.map((entry) =>
            entry.id === billingId
              ? {
                  ...entry,
                  status: result.status,
                  paidAt: result.paidAt ?? optimisticPaidAt,
                }
              : entry,
          );

          setStats(buildStats(syncedEntries));
          return syncedEntries;
        });
        // Atualiza os valores com dados do backend
        await fetchBilling(referenceMonth);
      } catch {
        setEntries(previousEntries);
        setStats(buildStats(previousEntries));
        setError("Erro ao registrar pagamento. Tente novamente.");
      } finally {
        setPaying(null);
      }
    },
    [fetchBilling],
  );

  const updateStudentRate = useCallback(
    async (studentId: string, amount: number, referenceMonth: string) => {
      setUpdatingRateStudentId(studentId);
      setError(null);
      try {
        await billingService.updateStudentRate(studentId, amount);
        await fetchBilling(referenceMonth);
      } catch {
        setError("Erro ao atualizar mensalidade do aluno.");
      } finally {
        setUpdatingRateStudentId(null);
      }
    },
    [fetchBilling],
  );

  const notifyPending = useCallback(
    async (referenceMonth: string) => {
      setNotifying(true);
      setError(null);
      try {
        await billingService.notifyPending();
        await fetchBilling(referenceMonth);
      } catch {
        setError("Erro ao notificar cobranças pendentes.");
      } finally {
        setNotifying(false);
      }
    },
    [fetchBilling],
  );

  const fetchStudentHistory = useCallback(async (studentId: string) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const response = await billingService.getStudentHistory(studentId, {
        page: 0,
        size: 50,
      });

      const items = response.content.map((entry) => ({
        ...entry,
        status: normalizeStatus(entry),
      }));

      const studentName = items[0]?.studentName ?? "Aluno";

      setStudentHistory({
        studentId,
        studentName,
        entries: items,
      });
    } catch {
      setStudentHistory({ studentId, studentName: "Aluno", entries: [] });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  return {
    entries,
    stats,
    loading,
    error,
    paying,
    notifying,
    updatingRateStudentId,
    fetchBilling,
    payEntry,
    updateStudentRate,
    notifyPending,
    fetchStudentHistory,
    studentHistory,
    historyLoading,
  };
};
