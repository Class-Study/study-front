import { useMemo, useState, useEffect } from 'react';

const DAY_MAP: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Minutos extras de tolerância após o fim da aula para manter a conexão */
const GRACE_MINUTES = 15;

export interface ClassTimerState {
  isClassTime: boolean;
  isConnectionAllowed: boolean;
  isEnded: boolean;
  elapsed: number;
  remaining: number;
  duration: number;
  progress: number;
  startTime: Date | null;
  nextLabel: string;
}

function getNextClassLabel(classDays: string[], classTime: string, now: Date): string {
  if (!classDays.length) return '';
  const [h, m] = classTime.split(':').map(Number);
  const todayDow = now.getDay();
  const classDayNums = classDays.map((d) => DAY_MAP[d]);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  if (classDayNums.includes(todayDow) && now < todayStart) {
    const diffMin = Math.floor((todayStart.getTime() - now.getTime()) / 60000);
    if (diffMin < 60) return `Aula começa em ${diffMin} min`;
    return `Aula hoje às ${classTime.substring(0, 5)}`;
  }

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
        isClassTime: false, isConnectionAllowed: false, isEnded: false,
        elapsed: 0, remaining: 0, duration: 0, progress: 0,
        startTime: null, nextLabel: '',
      };
    }

    const [h, m, s] = classTime.split(':').map(Number);
    const durationSec = classDuration * 60;
    const graceSec    = GRACE_MINUTES * 60;
    const todayDow    = now.getDay();
    const isToday     = classDays.some((d) => DAY_MAP[d] === todayDow);

    if (isToday) {
      const start    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s ?? 0);
      const classEnd = new Date(start.getTime() + durationSec * 1000);
      const graceEnd = new Date(classEnd.getTime() + graceSec  * 1000);

      if (now >= start && now < graceEnd) {
        // Dentro da janela de conexão (aula + grace)
        const isClassTime = now < classEnd;
        const elapsed     = Math.min(
          Math.floor((now.getTime() - start.getTime()) / 1000),
          durationSec,
        );
        const remaining   = isClassTime ? durationSec - elapsed : 0;
        const minsToEnd   = Math.ceil((graceEnd.getTime() - now.getTime()) / 60000);

        return {
          isClassTime,
          isConnectionAllowed: true,
          isEnded: false,
          elapsed,
          remaining,
          duration: durationSec,
          progress: elapsed / durationSec,
          startTime: start,
          nextLabel: isClassTime ? '' : `Encerrando conexão em ${minsToEnd} min`,
        };
      }

      if (now >= graceEnd) {
        return {
          isClassTime: false, isConnectionAllowed: false, isEnded: true,
          elapsed: durationSec, remaining: 0,
          duration: durationSec, progress: 1,
          startTime: start, nextLabel: 'Aula encerrada',
        };
      }
    }

    return {
      isClassTime: false, isConnectionAllowed: false, isEnded: false,
      elapsed: 0, remaining: 0, duration: durationSec, progress: 0,
      startTime: null,
      nextLabel: getNextClassLabel(classDays, classTime, now),
    };
  }, [now, classDays, classTime, classDuration]);
}
