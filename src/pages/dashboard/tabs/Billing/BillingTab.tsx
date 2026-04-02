import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge/Badge.tsx';
import { Modal } from '@/components/ui/Modal/Modal.tsx';
import { useBilling } from '@/hooks/useBilling.ts';
import { BillingEntry, BillingStatus } from '@/types/billing.types.ts';
import styles from '@/pages/dashboard/tabs/Billing/BillingTab.module.css';

const WEEKDAY_TO_JS: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const WEEKDAY_LABEL_PT: Record<string, string> = {
  SUNDAY: 'Domingo',
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
};

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

function getClassDatesForMonth(monthIso: string, weekDays: string[]): Date[] {
  const [yearText, monthText] = monthIso.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) return [];

  const targetDays = new Set(
    weekDays
      .map((day) => WEEKDAY_TO_JS[day])
      .filter((value): value is number => typeof value === 'number'),
  );

  if (targetDays.size === 0) return [];

  const lastDay = new Date(year, month, 0).getDate();
  const result: Date[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    if (targetDays.has(date.getDay())) {
      result.push(date);
    }
  }

  return result;
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

interface ClassReportModalProps {
  open: boolean;
  onClose: () => void;
  entry: BillingEntry | null;
  monthIso: string;
}



const ClassReportModal: React.FC<ClassReportModalProps> = ({
  open,
  onClose,
  entry,
  monthIso,
}) => {
  if (!entry) return null;

  const classWeekDays = entry.classWeekDays ?? [];
  let classDates = getClassDatesForMonth(monthIso, classWeekDays);
  const weekdayLabels = classWeekDays.map((day) => WEEKDAY_LABEL_PT[day] ?? day);

  // Considerar startDate do aluno
  if (entry.startDate) {
    const start = new Date(entry.startDate);
    classDates = classDates.filter((d) => d >= start);
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`Relatório - ${entry.studentName ?? 'Aluno'}`} size="md">
      <div className={styles.historyBody}>
        <div className={styles.reportMeta}>
          <p><strong>Mês:</strong> {monthIso}</p>
          <p><strong>Dias da semana:</strong> {weekdayLabels.length > 0 ? weekdayLabels.join(', ') : 'Não informado'}</p>
          <p><strong>Aulas previstas:</strong> {entry.totalClasses ?? classDates.length}</p>
          <p><strong>Semanas no mês:</strong> {entry.weeksInMonth ?? '-'}</p>
        </div>

        {/* Valores ocupando largura total, visual destacado */}
        <div className={styles.reportValueRow}>
          <div className={styles.reportValueBox}>
            <span>Valor mensal</span>
            <div>R$ {fmt(entry.totalAmountCalculated ?? entry.amount)}</div>
          </div>
          <div className={styles.reportValueBox}>
            <span>Valor por aula</span>
            <div>R$ {fmt(entry.hourlyRate ?? entry.amountAtBillingTime ?? entry.amount)}</div>
          </div>
        </div>

        <p className={styles.reportListTitle}>Datas de aula no mês</p>
        {classDates.length === 0 ? (
          <p className={styles.historyEmpty}>Sem datas calculadas para os dias informados.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {classDates.map((date) => (
              <span
                key={date.toISOString()}
                style={{
                  background: 'var(--color-accent-hover)',
                  color: 'var(--color-text-inverse)',
                  borderRadius: 16,
                  padding: '6px 16px',
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 4,
                  boxShadow: '0 1px 4px #0001',
                  letterSpacing: 0.2,
                  display: 'inline-block'
                }}
              >
                {date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

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
    notifying,
    fetchBilling,
    payEntry,
    notifyPending,
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
  const [reportEntry, setReportEntry] = useState<BillingEntry | null>(null);


  // Called when tab mounts and whenever month changes
  useEffect(() => {
    fetchBilling(selectedMonth);
  }, [fetchBilling, selectedMonth]);

  useEffect(() => {
    if (!historyStudent) return;
    fetchStudentHistory(historyStudent.id);
  }, [fetchStudentHistory, historyStudent]);

  const filteredEntries = useMemo(() => {
    // Primeiro filtra
    const filtered = entries.filter((entry) => {
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
    // Depois ordena: OVERDUE > PENDING > PAID
    return filtered.sort((a, b) => {
      const order = { OVERDUE: 0, PENDING: 1, PAID: 2 };
      return (order[a.status] ?? 99) - (order[b.status] ?? 99);
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
          <button
            type="button"
            className={styles.notifyBtn}
            disabled={notifying}
            onClick={() => notifyPending(selectedMonth)}
          >
            {notifying ? 'Notificando...' : 'Notificar pendentes'}
          </button>
        </div>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <span>Aluno</span>
          <span>Referência</span>
          <span>Valor</span>
          <span>Status</span>
          <span>Acão</span>
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
                {entry.referenceMonth}
              </div>

              <div className={styles.colAmount}>
                <span className={styles.amountMain}>R$ R$ ${fmt(entry.totalAmountCalculated ?? entry.amount)}</span>
                <p className={styles.amountMeta}>Aulas: {entry.totalClasses ?? '-'}</p>
                <p className={styles.amountMeta}>Valor aula: R$ {fmt(entry.hourlyRate ?? entry.amountAtBillingTime ?? entry.amount)}</p>
                <p className={styles.amountMetaStrong}>Total calculado: R$ {fmt(entry.totalAmountCalculated ?? entry.amount)}</p>
              </div>

              <div className={styles.colStatus}>
                <Badge variant={statusVariant(entry.status)}>
                  {statusLabel(entry.status)}
                </Badge>
              </div>

              <div className={styles.colAction}>
                <div className={styles.actionStack}>
                  <button
                    type="button"
                    className={styles.reportBtn}
                    onClick={() => setReportEntry(entry)}
                  >
                    Relatório
                  </button>
                  {entry.status === 'PAID' ? (
                    <span className={styles.paidInfo}>Pago em {fmtDate(entry.paidAt)}</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.payBtn}
                      disabled={paying === entry.id}
                      onClick={() => payEntry(entry.id, selectedMonth)}
                    >
                      {paying === entry.id ? 'Registrando...' : 'Dar baixa'}
                    </button>
                  )}
                </div>
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

      <ClassReportModal
        open={!!reportEntry}
        onClose={() => setReportEntry(null)}
        entry={reportEntry}
        monthIso={selectedMonth}
      />
    </section>
  );
};
