import { useState, useEffect, useMemo } from 'react';
import {StudentScheduleResponse} from "@/types/schedule.types.ts";
import studentService from "@/services/api/student.service.ts";

export type ClassDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ClassDate {
  id: string;
  date: Date;
  time: string;
  classType: 'RECORRENTE' | 'EXTRA' | 'REMARCADA';
  isPast: boolean;
  isToday: boolean;
  isNextClass: boolean;
  isLive: boolean; // Nova propriedade para indicar que a aula está acontecendo agora
}

export interface StudentScheduleData {
  studentName: string;
  classDays: ClassDay[];
  classTime: string;
  classDuration: number;
  startDate: string;
  classRate: number;
  teacherName: string;
  classDates: ClassDate[];
  stats: {
    total: number;
    completed: number;
    remaining: number;
    progressPercent: number;
  };
  loading: boolean;
  error: string | null;
}

// Mapeia a resposta da API para ClassDate[]
const mapClassDates = (response: StudentScheduleResponse
): ClassDate[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return response.classes.map(cls => {
    // Parsing manual para evitar interpretação UTC do ISO date string.
    // new Date("2026-04-02") → UTC midnight → vira 2026-04-01 em UTC-3.
    // new Date(2026, 3, 2)   → meia-noite local → correto em qualquer fuso.
    const [year, month, day] = cls.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    
    // Criar data e hora completa da aula para comparação
    const [hours, minutes] = cls.time.split(':').map(Number);
    const classDateTime = new Date(year, month - 1, day, hours, minutes);
    
    // Calcular o horário de fim da aula
    const classDuration = response.classDuration; // em minutos
    const classEndTime = new Date(classDateTime.getTime() + classDuration * 60 * 1000);
    
    // Verificar se a aula está acontecendo agora (entre início e fim)
    const isLive = now >= classDateTime && now <= classEndTime;
    
    // Verificar se a aula já passou completamente (passou do horário de fim)
    const hasPassedByTime = now > classEndTime;
    
    // isPast considera tanto o status da API quanto se já passou o horário
    const isPast = cls.status === 'COMPLETED' || cls.status === 'CANCELLED' || hasPassedByTime;
    
    // isToday é verdade se for hoje E ainda não passou o horário completamente
    const isTodayByDate = localDate.getTime() === today.getTime();
    const isToday = isTodayByDate && !isPast && !isLive;

    return {
      id: cls.id,
      date: localDate,
      time: cls.time,
      classType: cls.classType,
      isPast,
      isToday,
      isNextClass: false, // Será calculado depois
      isLive, // Aula acontecendo agora
    };
  });
};

// Calcula qual é a próxima aula
const calculateNextClass = (classDates: ClassDate[]): ClassDate[] => {
  // Filtrar apenas aulas futuras (não passou, não foi cancelada/completada e não está ao vivo)
  const futureClasses = classDates.filter(cls => !cls.isPast && !cls.isLive);
  
  if (futureClasses.length === 0) {
    return classDates; // Se não há aulas futuras, retorna sem modificar
  }
  
  // Ordenar por data/hora
  futureClasses.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    const [hoursA, minutesA] = a.time.split(':').map(Number);
    const [hoursB, minutesB] = b.time.split(':').map(Number);
    
    dateA.setHours(hoursA, minutesA);
    dateB.setHours(hoursB, minutesB);
    
    return dateA.getTime() - dateB.getTime();
  });
  
  // A primeira aula futura é a próxima
  const nextClassId = futureClasses[0].id;
  
  return classDates.map(cls => ({
    ...cls,
    isNextClass: cls.id === nextClassId && !cls.isPast && !cls.isToday && !cls.isLive
  }));
};

export const useStudentSchedule = (): StudentScheduleData => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classDates, setClassDates] = useState<ClassDate[]>([]);
  const [scheduleData, setScheduleData] = useState<StudentScheduleResponse | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await studentService.getSchedule();
        setScheduleData(response);
        
        // Mapear os dados e calcular a próxima aula corretamente
        const mappedClasses = mapClassDates(response);
        const classesWithNextClass = calculateNextClass(mappedClasses);
        setClassDates(classesWithNextClass);
        
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

  // Atualizar o status das aulas periodicamente (a cada minuto)
  useEffect(() => {
    if (!scheduleData || classDates.length === 0) return;

    const interval = setInterval(() => {
      const mappedClasses = mapClassDates(scheduleData);
      const classesWithNextClass = calculateNextClass(mappedClasses);
      setClassDates(classesWithNextClass);
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [scheduleData, classDates.length]);

  const stats = useMemo(() => {
    const total = classDates.length;
    const completed = classDates.filter(d => d.isPast).length;
    const remaining = total - completed;
    return {
      total,
      completed,
      remaining,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [classDates]);

  return {
    studentName: scheduleData?.studentName ?? '',
    classDays: (scheduleData?.classDays ?? []) as ClassDay[],
    classTime: scheduleData?.classTime ?? '',
    classDuration: scheduleData?.classDuration ?? 0,
    startDate: scheduleData?.startDate ?? '',
    classRate: 0,
    teacherName: scheduleData?.teacherName ?? '',
    classDates,
    stats,
    loading,
    error,
  };
};

