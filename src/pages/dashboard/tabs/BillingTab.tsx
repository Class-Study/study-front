import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Modal } from '@/components/ui/Modal/Modal';
import { useBilling } from '@/hooks/useBilling';
import { BillingEntry, BillingStatus } from '@/types/billing.types';
import styles from '@/pages/billing/BillingPage.module.css';

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function statusVariant(status: BillingStatus): 'paid' | 'pending' | 'late' {
  if (status === 'PAID') return 'paid';
  if (status === 'OVERDUE') return 'late';
  return 'pending';
}

function statusLabel(status: BillingStatus): string {
  if (status === 'PAID') return 'Pago';
  if (status === 'OVERDUE') return 'Atrasado';
  return 'Pendente';
}

function initials(name?: string): string {
  if (!name) return 'AL';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  entries: BillingEntry[];
  loading: boolean;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  open,
  onClose,
  studentName,
  entries,
  loading,
}) => {
  return (
    <Modal isOpen={open} onClose={onClose} title={`Historico - ${studentName}`} size="md">
      <div className={styles.historyBody}>
        {loading && <p className={styles.historyEmpty}>Carregando historico...</p>}
        {!loading && entries.length === 0 && (
          <p className={styles.historyEmpty}>Nenhum registro encontrado.</p>
        )}
        {!loading && entries.length > 0 && (
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.referenceMonth}</td>
                  <td>{fmtDate(entry.dueDate)}</td>
                  <td>R$ {fmt(entry.amount)}</td>
                  <td>
                    <Badge variant={statusVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                  </td>
                  <td>{fmtDate(entry.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
};

type FilterStatus = 'all' | 'PENDING' | 'OVERDUE' | 'PAID';

export const BillingTab: React.FC = () => {
  const {
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
  } = useBilling();

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [historyStudent, setHistoryStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Called when tab mounts and whenever month changes
  useEffect(() => {
    fetchBilling(selectedMonth);
  }, [fetchBilling, selectedMonth]);

  useEffect(() => {
    if (!historyStudent) return;
    fetchStudentHistory(historyStudent.id);
  }, [fetchStudentHistory, historyStudent]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (
        search &&
        !(entry.studentName ?? '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (filterStatus !== 'all' && entry.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [entries, filterStatus, search]);

  return (
    <section>
      <div className={styles.monthSelector}>
        <label htmlFor="billing-month">Mes de referencia</label>
        <input
          id="billing-month"
          type="month"
          className={styles.monthInput}
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardTotal}`}>
          <p className={styles.statLabel}>Total do Mes</p>
          <p className={styles.statValue}>R$ {fmt(stats?.totalMonth ?? 0)}</p>
          <p className={styles.statSub}>{entries.length} faturas</p>
        </div>
        <div className={`${styles.statCard} ${styles.statCardPaid}`}>
          <p className={styles.statLabel}>Recebido</p>
          <p className={`${styles.statValue} ${styles.paid}`}>
            R$ {fmt(stats?.totalReceived ?? 0)}
          </p>
          <p className={styles.statSub}>{stats?.paidCount ?? 0} pagamentos</p>
        </div>
        <div className={`${styles.statCard} ${styles.statCardPending}`}>
          <p className={styles.statLabel}>Pendente</p>
          <p className={`${styles.statValue} ${styles.pending}`}>
            R$ {fmt(stats?.totalPending ?? 0)}
          </p>
          <p className={styles.statSub}>{stats?.pendingCount ?? 0} pendentes</p>
        </div>
        <div className={`${styles.statCard} ${styles.statCardOverdue}`}>
          <p className={styles.statLabel}>Atrasado</p>
          <p className={`${styles.statValue} ${styles.overdue}`}>
            R$ {fmt(stats?.totalOverdue ?? 0)}
          </p>
          <p className={styles.statSub}>{stats?.overdueCount ?? 0} atrasadas</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Buscar aluno"
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className={styles.filterGroup}>
          {(['all', 'PENDING', 'OVERDUE', 'PAID'] as FilterStatus[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.filterBtn} ${filterStatus === value ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterStatus(value)}
            >
              {value === 'all'
                ? 'Todos'
                : value === 'PENDING'
                  ? 'Pendentes'
                  : value === 'OVERDUE'
                    ? 'Atrasados'
                    : 'Pagos'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <span>Aluno</span>
          <span>Vencimento</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Acao</span>
        </div>

        {loading && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Carregando cobrancas...</p>
          </div>
        )}

        {!loading && filteredEntries.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Nenhuma cobranca encontrada para o mes.</p>
          </div>
        )}

        {!loading &&
          filteredEntries.map((entry) => (
            <div key={entry.id} className={styles.tableRow}>
              <div className={styles.colStudent}>
                <button
                  type="button"
                  className={styles.avatarBtn}
                  onClick={() =>
                    setHistoryStudent({
                      id: entry.studentId,
                      name: entry.studentName ?? 'Aluno',
                    })
                  }
                  title="Ver historico"
                >
                  {entry.studentAvatarUrl ? (
                    <img
                      src={entry.studentAvatarUrl}
                      alt={entry.studentName ?? 'Aluno'}
                      className={styles.avatar}
                    />
                  ) : (
                    <span className={styles.avatarInitials}>
                      {initials(entry.studentName)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.studentNameBtn}
                  onClick={() =>
                    setHistoryStudent({
                      id: entry.studentId,
                      name: entry.studentName ?? 'Aluno',
                    })
                  }
                >
                  {entry.studentName ?? 'Aluno'}
                </button>
              </div>

              <div
                className={`${styles.colDue} ${entry.status === 'OVERDUE' ? styles.overdueDate : ''}`}
              >
                {fmtDate(entry.dueDate)}
              </div>

              <div className={styles.colAmount}>R$ {fmt(entry.amount)}</div>

              <div className={styles.colStatus}>
                <Badge variant={statusVariant(entry.status)}>
                  {statusLabel(entry.status)}
                </Badge>
              </div>

              <div className={styles.colAction}>
                {entry.status === 'PAID' ? (
                  <span className={styles.paidInfo}>Pago em {fmtDate(entry.paidAt)}</span>
                ) : (
                  <button
                    type="button"
                    className={styles.payBtn}
                    disabled={paying === entry.id}
                    onClick={() => payEntry(entry.id)}
                  >
                    {paying === entry.id ? 'Registrando...' : 'Dar baixa'}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <HistoryModal
        open={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        studentName={historyStudent?.name ?? 'Aluno'}
        entries={studentHistory?.entries ?? []}
        loading={historyLoading}
      />
    </section>
  );
};
