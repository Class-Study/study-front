import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { useStudentBilling, type MonthlyBilling, type PaymentStatus } from '@/hooks/useStudentBilling';
import QRCode from 'qrcode';
import styles from './StudentBillingTab.module.css';

function getStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID': return 'Pago';
    case 'PENDING': return 'Pendente';
    case 'OVERDUE': return 'Vencido';
    case 'AWAITING_CONFIRMATION': return 'Aguardando Confirmação';
    default: return status;
  }
}

function getStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'PAID': return 'var(--color-success)';
    case 'PENDING': return 'var(--color-warning)';
    case 'OVERDUE': return 'var(--color-danger)';
    case 'AWAITING_CONFIRMATION': return 'var(--color-blue)';
    default: return 'var(--color-text-tertiary)';
  }
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Monta um campo TLV (Tag-Length-Value) conforme padrão EMV.
 */
function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão PIX.
 */
function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .substring(0, 25);
}

/**
 * Formata a chave PIX para o padrão esperado pelo BACEN.
 * Telefone: deve começar com +55...
 */
function formatPixKey(key: string): string {
  // Se parece telefone (só dígitos, começa com 55 e tem 13 dígitos)
  const digits = key.replace(/\D/g, '');
  if (/^\d+$/.test(key) && digits.length >= 11) {
    // Garante formato +55XXXXXXXXXXX
    if (digits.startsWith('55')) {
      return `+${digits}`;
    }
    return `+55${digits}`;
  }
  return key;
}

/**
 * Gera payload PIX estático (Copia e Cola / QR Code) conforme padrão EMV do BACEN.
 * Referência: https://www.bcb.gov.br/estabilidadefinanceira/pix
 */
function generatePixPayload(
  chavePix: string,
  valor: number,
  nomeRecebedor: string,
  cidade: string = 'BRASILIA'
): string {
  const chaveFormatada = formatPixKey(chavePix);
  const nomeSanitizado = sanitize(nomeRecebedor);
  const cidadeSanitizada = sanitize(cidade);
  const valorStr = valor.toFixed(2);

  // Campo 26 - Merchant Account Information (PIX)
  const merchantAccountInfo =
    tlv('00', 'br.gov.bcb.pix') + // GUI obrigatório
    tlv('01', chaveFormatada);      // Chave PIX

  // Campo 62 - Additional Data Field Template
  const additionalData = tlv('05', '***'); // Reference Label (txid)

  // Monta payload sem CRC
  const payloadSemCRC =
    tlv('00', '01') +                        // 00 - Payload Format Indicator
    tlv('01', '11') +                        // 01 - Point of Initiation (11 = estático)
    tlv('26', merchantAccountInfo) +         // 26 - Merchant Account Information
    tlv('52', '0000') +                      // 52 - Merchant Category Code
    tlv('53', '986') +                       // 53 - Transaction Currency (BRL)
    tlv('54', valorStr) +                    // 54 - Transaction Amount
    tlv('58', 'BR') +                        // 58 - Country Code
    tlv('59', nomeSanitizado) +              // 59 - Merchant Name
    tlv('60', cidadeSanitizada) +            // 60 - Merchant City
    tlv('62', additionalData) +              // 62 - Additional Data Field
    '6304';                                  // 63 - CRC16 (placeholder)

  const crc = calculateCRC16(payloadSemCRC);
  return payloadSemCRC + crc;
}

/**
 * Calcula CRC16-CCITT (0xFFFF) conforme exigido pelo padrão PIX EMV.
 */
function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const PaymentModal: React.FC<{
  billing: MonthlyBilling;
  teacherName: string;
  teacherPixKey: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: (billingId: string) => void;
}> = ({ billing, teacherName, teacherPixKey, isOpen, onClose, onConfirmPayment }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teacherPixKey) {
      setLoading(true);
      const pixPayload = generatePixPayload(teacherPixKey, billing.totalValue, teacherName);
      
      QRCode.toDataURL(pixPayload, {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 2,
      }).then((url) => {
        setQrCodeUrl(url);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isOpen, teacherPixKey, billing.totalValue, teacherName]);

  const handleConfirmPayment = () => {
    onConfirmPayment(billing.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagamento PIX" size="md">
      <div className={styles.paymentModal}>
        <div className={styles.paymentHeader}>
          <h3 className={styles.paymentTitle}>
            Pagamento - {billing.monthLabel}
          </h3>
          <div className={styles.paymentAmount}>
            {fmt(billing.totalValue)}
          </div>
        </div>

        <div className={styles.paymentDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Aulas no mês:</span>
            <span className={styles.detailValue}>{billing.classCount}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Valor por aula:</span>
            <span className={styles.detailValue}>{fmt(billing.classValue)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Professor:</span>
            <span className={styles.detailValue}>{teacherName}</span>
          </div>
        </div>

        <div className={styles.qrCodeSection}>
          <h4 className={styles.qrTitle}>QR Code PIX</h4>
          <div className={styles.qrCodeContainer}>
            {loading ? (
              <div className={styles.qrLoading}>Gerando QR Code...</div>
            ) : qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code PIX" className={styles.qrCodeImage} />
            ) : (
              <div className={styles.qrError}>Erro ao gerar QR Code</div>
            )}
          </div>
          <div className={styles.pixInstructions}>
            <p>1. Abra o aplicativo do seu banco</p>
            <p>2. Escolha a opção PIX</p>
            <p>3. Escaneie o código QR acima</p>
            <p>4. Confirme o pagamento no seu banco</p>
            <p>5. Clique em "Confirmar Pagamento" abaixo</p>
          </div>
        </div>

        <div className={styles.paymentActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirmPayment}
          >
            Confirmar Pagamento
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const StudentBillingTab: React.FC = () => {
  const {
    billingData,
    teacherName,
    teacherPixKey,
    loading,
    error,
    updatePaymentStatus,
  } = useStudentBilling();
  
  const [selectedBilling, setSelectedBilling] = useState<MonthlyBilling | null>(null);

  if (loading) {
    return <div className={styles.loading}>Carregando informações financeiras...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  const handlePayment = (billing: MonthlyBilling) => {
    setSelectedBilling(billing);
  };

  const handleConfirmPayment = async (billingId: string) => {
    await updatePaymentStatus(billingId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Financeiro</h2>
        <p className={styles.subtitle}>Acompanhe suas mensalidades e realize pagamentos</p>
      </div>

      {/* Tabela de mensalidades com scroll próprio */}
      <div className={styles.billingTable}>
        <h3 className={styles.tableTitle}>Mensalidades</h3>
        
        <div className={styles.tableWrapper}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mês/Ano</th>
                  <th>Aulas</th>
                  <th>Valor/Aula</th>
                  <th>Total</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {billingData.map((billing) => (
                  <tr key={billing.id}>
                    <td className={styles.monthCell}>
                      <span className={styles.monthLabel}>{billing.monthLabel}</span>
                    </td>
                    <td>{billing.classCount}</td>
                    <td>{fmt(billing.classValue)}</td>
                    <td className={styles.totalCell}>{fmt(billing.totalValue)}</td>
                    <td>{billing.dueDate.toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span 
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(billing.status) }}
                      >
                        {getStatusLabel(billing.status)}
                      </span>
                    </td>
                    <td>
                      {billing.status === 'PENDING' || billing.status === 'OVERDUE' ? (
                        <button
                          type="button"
                          className={styles.payBtn}
                          onClick={() => handlePayment(billing)}
                        >
                          Pagar
                        </button>
                      ) : billing.status === 'AWAITING_CONFIRMATION' ? (
                        <span className={styles.waitingText}>Aguardando...</span>
                      ) : (
                        <span className={styles.paidText}>✓ Pago</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de pagamento */}
      {selectedBilling && (
        <PaymentModal
          billing={selectedBilling}
          teacherName={teacherName}
          teacherPixKey={teacherPixKey}
          isOpen={!!selectedBilling}
          onClose={() => setSelectedBilling(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}
    </div>
  );
};
