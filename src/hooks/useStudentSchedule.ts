import { useState, useEffect, useMemo } from 'react';
// TODO: Importar studentService quando implementar integração
// import studentService from '@/services/api/student.service.client';

export type ClassDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ClassDate {
  id: string;
  date: Date;
  time: string;
  classType: 'RECORRENTE' | 'EXTRA' | 'REMARCADA';
  isPast: boolean;
  isToday: boolean;
  isNextClass: boolean;
}

// Interface para dados de cobrança (necessário para filtrar aulas)
interface MonthlyBilling {
  id: string;
  month: number;
  year: number;
  monthLabel: string;
  classCount: number;
  classValue: number;
  totalValue: number;
  dueDate: Date;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION';
}

export interface StudentScheduleData {
  // Dados do aluno
  studentName: string;
  classDays: ClassDay[];
  classTime: string;
  classDuration: number;
  startDate: string;
  classRate: number;
  
  // Dados do professor
  teacherName: string;
  teacherEmail: string;
  teacherOnline: boolean;
  
  // Aulas geradas
  classDates: ClassDate[];
  
  // Estatísticas
  stats: {
    total: number;
    completed: number;
    remaining: number;
    progressPercent: number;
  };
  
  // Estados
  loading: boolean;
  error: string | null;
}

// Dados mockados
const MOCK_STUDENT_DATA = {
  studentName: 'João Silva Santos',
  classDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] as ClassDay[],
  classTime: '19:00:00',
  classDuration: 60,
  startDate: '2026-01-15',
  classRate: 120.00,
  teacherName: 'Prof. Maria Fernanda',
  teacherEmail: 'maria.fernanda@professor.com',
  teacherOnline: true,
};

// Função para gerar as datas das aulas até o final do contrato
const generateClassDates = (
  classDays: ClassDay[], 
  classTime: string, 
  startDate: string, 
  endDate: string
): ClassDate[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: ClassDate[] = [];
  
  // Mapear dias da semana para números
  const dayMap: Record<ClassDay, number> = {
    'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
    'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
  };
  
  const targetDays = classDays.map(day => dayMap[day]);
  
  const current = new Date(start);
  while (current <= end) {
    if (targetDays.includes(current.getDay())) {
      const classDate = new Date(current);
      const today = new Date();
      
      dates.push({
        id: `${classDate.getFullYear()}-${classDate.getMonth()}-${classDate.getDate()}`,
        date: classDate,
        time: classTime,
        classType: 'RECORRENTE',
        isPast: classDate < today,
        isToday: classDate.toDateString() === today.toDateString(),
        isNextClass: false
      });
    }
    current.setDate(current.getDate() + 1);
  }
  
  // Marcar a próxima aula
  const nextClass = dates.find(d => !d.isPast && !d.isToday);
  if (nextClass) {
    nextClass.isNextClass = true;
  }
  
  return dates;
};

// Função para filtrar aulas baseado no status de pagamento
const filterClassesByPaymentStatus = (
  classDates: ClassDate[],
  billingData: MonthlyBilling[]
): ClassDate[] => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Verificar se o mês atual está pago
  const currentMonthBilling = billingData.find(b => 
    b.month === currentMonth + 1 && b.year === currentYear
  );
  const isCurrentMonthPaid = currentMonthBilling?.status === 'PAID';
  
  return classDates.filter(classDate => {
    const classMonth = classDate.date.getMonth();
    const classYear = classDate.date.getFullYear();
    
    // Sempre mostrar aulas já realizadas (passadas)
    if (classDate.isPast) {
      return true;
    }
    
    // Se o mês atual está pago, mostrar aulas do mês seguinte
    if (isCurrentMonthPaid) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      
      if (classMonth === nextMonth && classYear === nextYear) {
        return true;
      }
    }
    
    // Mostrar aulas do mês atual se está pago ou é hoje
    if (classMonth === currentMonth && classYear === currentYear) {
      return isCurrentMonthPaid || classDate.isToday;
    }
    
    return false;
  });
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

// Função para gerar dados de cobrança mensal (versão simplificada para filtro)
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
    
    // Simular status (abril 2026 = mês atual, definir como PAID para testar)
    let status: 'PENDING' | 'OVERDUE' | 'PAID' | 'AWAITING_CONFIRMATION' = 'PENDING';
    const now = new Date();
    
    if (current.getMonth() === 3 && current.getFullYear() === 2026) { // Abril 2026
      status = 'PAID'; // Simular que abril está pago para liberar aulas de maio
    } else if (dueDate < now) {
      status = Math.random() > 0.3 ? 'PAID' : 'OVERDUE';
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

export const useStudentSchedule = (): StudentScheduleData => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDates, setClassDates] = useState<ClassDate[]>([]);

  useEffect(() => {
    // Simular carregamento de dados
    const loadData = async () => {
      try {
        setLoading(true);
        
        // TODO: Substituir por integração real com backend
        // const response = await studentService.getSchedule();
        // Processar response e setClassDates baseado nos dados reais
        
        // ⚠️  MOCK DATA - Remover quando integrar com backend ⚠️
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Calcular data de fim do contrato (6 meses após início)
        const startDate = new Date(MOCK_STUDENT_DATA.startDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);
        
        // Gerar datas das aulas
        const allDates = generateClassDates(
          MOCK_STUDENT_DATA.classDays,
          MOCK_STUDENT_DATA.classTime,
          MOCK_STUDENT_DATA.startDate,
          endDate.toISOString()
        );
        
        // Gerar dados de cobrança para filtrar aulas
        const mockBillingData = generateBillingData(
          MOCK_STUDENT_DATA.startDate,
          MOCK_STUDENT_DATA.classRate,
          MOCK_STUDENT_DATA.classDays
        );
        
        // Filtrar aulas baseado no pagamento
        const filteredDates = filterClassesByPaymentStatus(allDates, mockBillingData);
        
        setClassDates(filteredDates);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar agenda das aulas');
        console.error('Erro ao carregar dados da agenda:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalClasses = classDates.length;
    const completedClasses = classDates.filter(d => d.isPast).length;
    const remainingClasses = totalClasses - completedClasses;
    
    return {
      total: totalClasses,
      completed: completedClasses,
      remaining: remainingClasses,
      progressPercent: totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0
    };
  }, [classDates]);

  return {
    // Dados do aluno
    studentName: MOCK_STUDENT_DATA.studentName,
    classDays: MOCK_STUDENT_DATA.classDays,
    classTime: MOCK_STUDENT_DATA.classTime,
    classDuration: MOCK_STUDENT_DATA.classDuration,
    startDate: MOCK_STUDENT_DATA.startDate,
    classRate: MOCK_STUDENT_DATA.classRate,
    
    // Dados do professor
    teacherName: MOCK_STUDENT_DATA.teacherName,
    teacherEmail: MOCK_STUDENT_DATA.teacherEmail,
    teacherOnline: MOCK_STUDENT_DATA.teacherOnline,
    
    // Aulas e estatísticas
    classDates,
    stats,
    
    // Estados
    loading,
    error,
  };
};




