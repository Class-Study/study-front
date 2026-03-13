import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header/Header';
import { Badge } from '@/components/ui/Badge/Badge';
import { useBilling } from '@/hooks/useBilling';
import styles from './BillingPage.module.css';

export const BillingPage: React.FC = () => {
  const { billingData, loading, error, fetchMonthBilling } = useBilling();
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Cobrança' },
  ];
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7),
  );

  useEffect(() => {
    fetchMonthBilling(selectedMonth);
  }, [selectedMonth, fetchMonthBilling]);

  const getStatusVariant = (
    status: 'PAID' | 'PENDING' | 'LATE',
  ): 'paid' | 'pending' | 'late' => {
    const statusMap = {
      PAID: 'paid' as const,
      PENDING: 'pending' as const,
      LATE: 'late' as const,
    };
    return statusMap[status];
  };

  return (
    <div className={styles.container}>
      <Header breadcrumbItems={breadcrumbItems} />

      <main className={styles.content}>
        <div className={styles.monthSelector}>
          <label htmlFor="month">Mês de Referência:</label>
          <input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={styles.monthInput}
          />
        </div>

        {loading && <p className={styles.loading}>Carregando...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {billingData && (
          <>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Recebidos</p>
                <p className={styles.summaryValue}>
                  R$ {billingData.totalReceived.toFixed(2)}
                </p>
                <p className={styles.summaryCount}>
                  {billingData.paidCount} pagamentos
                </p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Pendentes</p>
                <p className={styles.summaryValue}>
                  R$ {billingData.totalPending.toFixed(2)}
                </p>
                <p className={styles.summaryCount}>
                  {billingData.pendingCount} cobranças
                </p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Atrasados</p>
                <p className={styles.summaryValue}>
                  R$ {billingData.totalLate.toFixed(2)}
                </p>
                <p className={styles.summaryCount}>
                  {billingData.lateCount} atrasadas
                </p>
              </div>

              <div className={styles.summaryCard}>
                <p className={styles.summaryLabel}>Total Esperado</p>
                <p className={styles.summaryValue}>
                  R$ {billingData.totalExpected.toFixed(2)}
                </p>
                <p className={styles.summaryCount}>Mês</p>
              </div>
            </div>

            <div className={styles.card}>
              <h2>Detalhes Mensais</h2>

              {billingData.records.length > 0 ? (
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <div className={styles.colStudent}>Aluno</div>
                    <div className={styles.colAmount}>Valor</div>
                    <div className={styles.colStatus}>Status</div>
                    <div className={styles.colNotify}>Notificações</div>
                  </div>

                  {billingData.records.map((record) => (
                    <div key={record.id} className={styles.tableRow}>
                      <div className={styles.colStudent}>
                        <p className={styles.colName}>{record.studentName}</p>
                        {record.levelProfileName && (
                          <p className={styles.colLevel}>
                            {record.levelProfileName}
                          </p>
                        )}
                      </div>
                      <div className={styles.colAmount}>
                        R$ {record.amount.toFixed(2)}
                      </div>
                      <div className={styles.colStatus}>
                        <Badge variant={getStatusVariant(record.status)}>
                          {record.status === 'PAID'
                            ? 'Pago'
                            : record.status === 'PENDING'
                              ? 'Pendente'
                              : 'Atrasado'}
                        </Badge>
                      </div>
                      <div className={styles.colNotify}>{record.notifyCount}x</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>
                  Nenhum registro de cobrança para este mês.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
