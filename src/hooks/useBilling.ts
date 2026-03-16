import { useCallback, useState } from 'react';
import billingService from '@/services/api/billing.service';
import studentService from '@/services/api/student.service';
import {
  BillingEntry,
  BillingStats,
  BillingStatus,
  StudentPaymentHistory,
} from '@/types/billing.types';
import { Student } from '@/types/student.types';

interface UseBillingReturn {
  entries: BillingEntry[];
  stats: BillingStats | null;
  loading: boolean;
  error: string | null;
  paying: string | null;
  fetchBilling: (referenceMonth: string) => Promise<void>;
  payEntry: (billingId: string) => Promise<void>;
  fetchStudentHistory: (studentId: string) => Promise<void>;
  studentHistory: StudentPaymentHistory | null;
  historyLoading: boolean;
}

const normalizeStatus = (entry: BillingEntry): BillingStatus => {
  if (entry.status === 'PAID') return 'PAID';
  const today = new Date();
  const due = new Date(entry.dueDate);
  return due < today ? 'OVERDUE' : 'PENDING';
};

const buildStats = (entries: BillingEntry[]): BillingStats => {
  const paidEntries = entries.filter((e) => e.status === 'PAID');
  const pendingEntries = entries.filter((e) => e.status === 'PENDING');
  const overdueEntries = entries.filter((e) => e.status === 'OVERDUE');

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

const mergeStudentIntoEntry = (entry: BillingEntry, student: Student): BillingEntry => ({
  ...entry,
  studentName: student.name,
  studentAvatarUrl: student.avatarUrl,
  levelProfileName: student.levelProfileName,
  status: normalizeStatus(entry),
});

export const useBilling = (): UseBillingReturn => {
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [studentHistory, setStudentHistory] = useState<StudentPaymentHistory | null>(
    null,
  );

  const fetchBilling = useCallback(async (referenceMonth: string) => {
    setLoading(true);
    setError(null);
    try {
      const students = await studentService.listAll();

      const monthlyResults = await Promise.allSettled(
        students.map(async (student) => {
          const entry = await billingService.getStudentMonthBilling(
            student.id,
            referenceMonth,
          );
          return mergeStudentIntoEntry(entry, student);
        }),
      );

      const foundEntries = monthlyResults
        .filter((result): result is PromiseFulfilledResult<BillingEntry> => result.status === 'fulfilled')
        .map((result) => result.value);

      setEntries(foundEntries);
      setStats(buildStats(foundEntries));
    } catch {
      setError('Erro ao carregar dados de cobrança');
      setEntries([]);
      setStats(buildStats([]));
    } finally {
      setLoading(false);
    }
  }, []);

  const payEntry = useCallback(
    async (billingId: string) => {
      const original = entries.find((entry) => entry.id === billingId);
      if (!original || original.status === 'PAID') return;

      const optimisticPaidAt = new Date().toISOString();
      const optimisticEntries = entries.map((entry) =>
        entry.id === billingId
          ? { ...entry, status: 'PAID' as const, paidAt: optimisticPaidAt }
          : entry,
      );

      setEntries(optimisticEntries);
      setStats(buildStats(optimisticEntries));
      setPaying(billingId);

      try {
        const result = await billingService.payEntry(billingId, {
          paidAt: optimisticPaidAt,
          notes: 'Pagamento recebido',
        });

        const syncedEntries = optimisticEntries.map((entry) =>
          entry.id === billingId
            ? {
                ...entry,
                status: result.status,
                paidAt: result.paidAt ?? optimisticPaidAt,
              }
            : entry,
        );

        setEntries(syncedEntries);
        setStats(buildStats(syncedEntries));
      } catch {
        setEntries(entries);
        setStats(buildStats(entries));
        setError('Erro ao registrar pagamento. Tente novamente.');
      } finally {
        setPaying(null);
      }
    },
    [entries],
  );

  const fetchStudentHistory = useCallback(async (studentId: string) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const response = await billingService.getStudentBillings(studentId, {
        page: 0,
        size: 50,
      });

      const items = response.content.map((entry) => ({
        ...entry,
        status: normalizeStatus(entry),
      }));

      const studentName = items[0]?.studentName ?? 'Aluno';

      setStudentHistory({
        studentId,
        studentName,
        entries: items,
      });
    } catch {
      setStudentHistory({ studentId, studentName: 'Aluno', entries: [] });
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
    fetchBilling,
    payEntry,
    fetchStudentHistory,
    studentHistory,
    historyLoading,
  };
};
