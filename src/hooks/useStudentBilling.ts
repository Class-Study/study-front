import { useState, useEffect } from 'react';
// TODO: Importar studentService quando implementar integração
// import studentService from '@/services/api/student.service.client';

export type PaymentStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION';

export interface MonthlyBilling {
  id: string;
  month: number;
  year: number;
  monthLabel: string;
  classCount: number;
  classValue: number;
  totalValue: number;
  dueDate: Date;
  status: PaymentStatus;
}

export interface StudentBillingData {
  // Dados do aluno
  studentName: string;
  contractStartDate: string;
  classRate: number;
  classDays: string[];
  
  // Dados do professor
  teacherName: string;
  teacherEmail: string;
  teacherPixKey: string;
  
  // Dados de cobrança
  billingData: MonthlyBilling[];
  
  // Estados
  loading: boolean;
  error: string | null;
  
  // Métodos
  updatePaymentStatus: (billingId: string, newStatus: PaymentStatus) => void;
}

// Dados mockados
const MOCK_BILLING_DATA = {
  studentName: 'João Silva Santos',
  contractStartDate: '2026-01-15',
  classRate: 120.00,
  classDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
  teacherName: 'MAYRA DA SILVA EVANGELISTA',
  teacherEmail: '',
  teacherPixKey: '5511910912730', // Pode ser email ou telefone
};

// Função para calcular quantas aulas haverá em um mês
const calculateMonthlyClasses = (monthDate: Date, classDays: string[]): number => {
  const dayMap: Record<string, number> = {
    'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
    'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
  };
  
  const targetDays = classDays.map(day => dayMap[day]).filter(day => day !== undefined);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  let classCount = 0;
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    if (targetDays.includes(date.getDay())) {
      classCount++;
    }
  }
  
  return classCount;
};

// Função para filtrar dados de cobrança (apenas meses pagos + próximo pendente)
const filterBillingData = (billingData: MonthlyBilling[]): MonthlyBilling[] => {
  
  return billingData.filter(billing => {
    // Mostrar todos os meses já pagos
    if (billing.status === 'PAID') {
      return true;
    }

    const unpaidBillings = billingData
      .filter(b => b.status !== 'PAID')
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return unpaidBillings[0]?.id === billing.id;
  });
};

// Função para gerar dados de cobrança mensal
const generateBillingData = (
  startDate: string,
  classRate: number,
  classDays: string[]
): MonthlyBilling[] => {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 6); // 6 meses de contrato
  
  const monthlyData: MonthlyBilling[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const monthClassCount = calculateMonthlyClasses(current, classDays);
    const totalValue = monthClassCount * classRate;
    const dueDate = new Date(current.getFullYear(), current.getMonth() + 1, 10); // Vencimento dia 10
    
    // Simular status diferentes baseado na data
    let status: PaymentStatus = 'PENDING';
    
    // Simular alguns meses como pagos (janeiro, fevereiro, março de 2026)
    if (current.getFullYear() === 2026 && current.getMonth() < 3) {
      status = 'PAID';
    } else if (current.getFullYear() === 2026 && current.getMonth() === 3) { // Abril 2026 - pendente
      status = 'PENDING';
    } else {
      // Meses futuros também pendentes, mas serão filtrados
      status = 'PENDING';
    }
    
    monthlyData.push({
      id: `${current.getFullYear()}-${current.getMonth()}`,
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      monthLabel: current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      classCount: monthClassCount,
      classValue: classRate,
      totalValue,
      dueDate,
      status,
    });
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return monthlyData;
};

export const useStudentBilling = (): StudentBillingData => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<MonthlyBilling[]>([]);

  useEffect(() => {
    // Simular carregamento de dados
    const loadData = async () => {
      try {
        setLoading(true);
        
        // TODO: Substituir por integração real com backend
        // const response = await studentService.getBilling();
        // setBillingData(response.monthlyBilling);
        
        // ⚠️  MOCK DATA - Remover quando integrar com backend ⚠️
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Gerar dados de cobrança
        const allBillingEntries = generateBillingData(
          MOCK_BILLING_DATA.contractStartDate,
          MOCK_BILLING_DATA.classRate,
          MOCK_BILLING_DATA.classDays
        );
        
        // Filtrar para mostrar apenas meses pagos + próximo pendente
        const filteredBillingData = filterBillingData(allBillingEntries);
        
        setBillingData(filteredBillingData);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados financeiros');
        console.error('Erro ao carregar dados de cobrança:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Função para atualizar status de pagamento
  const updatePaymentStatus = async (billingId: string, newStatus: PaymentStatus) => {
    try {
      // TODO: Implementar integração com backend
      // await studentService.confirmPayment({
      //   billingId,
      //   paymentMethod: 'PIX',
      //   pixDetails: { /* dados do PIX */ }
      // });
      
      // ⚠️  MOCK - Remover quando integrar com backend ⚠️
      setBillingData(prev => 
        prev.map(billing => 
          billing.id === billingId 
            ? { ...billing, status: newStatus }
            : billing
        )
      );
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      // Tratar erro de confirmação de pagamento
    }
  };

  return {
    // Dados do aluno
    studentName: MOCK_BILLING_DATA.studentName,
    contractStartDate: MOCK_BILLING_DATA.contractStartDate,
    classRate: MOCK_BILLING_DATA.classRate,
    classDays: MOCK_BILLING_DATA.classDays,
    
    // Dados do professor
    teacherName: MOCK_BILLING_DATA.teacherName,
    teacherEmail: MOCK_BILLING_DATA.teacherEmail,
    teacherPixKey: MOCK_BILLING_DATA.teacherPixKey,
    
    // Dados de cobrança
    billingData,
    
    // Estados
    loading,
    error,
    
    // Métodos
    updatePaymentStatus,
  };
};

