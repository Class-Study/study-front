import { useMemo, useState, useEffect } from 'react';

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface ClassTimerState {
  /** Está dentro do horário de aula agora */
  isClassTime: boolean;
  /** A aula foi hoje mas já terminou */
  isEnded: boolean;
  /** Segundos decorridos desde o início da aula */
  elapsed: number;
  /** Segundos restantes até o fim da aula */
  remaining: number;
  /** Duração total da aula em segundos */
  duration: number;
  /** Progresso de 0 a 1 */
  progress: number;
  /** Horário de início calculado da aula de hoje (ou null) */
  startTime: Date | null;
  /** Texto descritivo quando fora do horário, ex: "Próxima aula: Sex às 19:00" */
  nextLabel: string;
}

function getNextClassLabel(classDays: string[], classTime: string, now: Date): string {
  if (!classDays.length) return '';
  const [h, m] = classTime.split(':').map(Number);
  const todayDow = now.getDay();
  const classDayNums = classDays.map((d) => DAY_MAP[d]);

  // Ainda hoje mas a aula não começou
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  if (classDayNums.includes(todayDow) && now < todayStart) {
    const diffMs = todayStart.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `Aula começa em ${diffMin} min`;
    return `Aula hoje às ${classTime.substring(0, 5)}`;
  }

  // Próximo dia de aula
  for (let i = 1; i <= 7; i++) {
    const nextDow = (todayDow + i) % 7;
    if (classDayNums.includes(nextDow)) {
      return `Próxima aula: ${PT_DAYS[nextDow]} às ${classTime.substring(0, 5)}`;
    }
  }
  return '';
}

export function useClassTimer(
  classDays: string[],
  classTime: string,       // "19:00:00"
  classDuration: number,   // minutos
): ClassTimerState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo<ClassTimerState>(() => {
    if (!classDays.length || !classTime) {
      return {
        isClassTime: false, isEnded: false, elapsed: 0,
        remaining: 0, duration: 0, progress: 0,
        startTime: null, nextLabel: '',
      };
    }

    const [h, m, s] = classTime.split(':').map(Number);
    const durationSec = classDuration * 60;
    const todayDow = now.getDay();
    const isToday = classDays.some((d) => DAY_MAP[d] === todayDow);

    if (isToday) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s ?? 0);
      const end = new Date(start.getTime() + durationSec * 1000);

      if (now >= start && now < end) {
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        return {
          isClassTime: true, isEnded: false, elapsed,
          remaining: durationSec - elapsed,
          duration: durationSec,
          progress: elapsed / durationSec,
          startTime: start, nextLabel: '',
        };
      }

      if (now >= end) {
        return {
          isClassTime: false, isEnded: true,
          elapsed: durationSec, remaining: 0,
          duration: durationSec, progress: 1,
          startTime: start, nextLabel: 'Aula encerrada',
        };
      }
    }

    return {
      isClassTime: false, isEnded: false,
      elapsed: 0, remaining: 0,
      duration: durationSec, progress: 0,
      startTime: null,
      nextLabel: getNextClassLabel(classDays, classTime, now),
    };
  }, [now, classDays, classTime, classDuration]);
}

