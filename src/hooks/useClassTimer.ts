import { useMemo, useState, useEffect } from 'react';
import {ExtraClass} from "@/types/student.types.ts";

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
  isExtraClass: boolean;
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

/** Recebe uma data de início e duração em segundos, retorna o estado da janela */
function resolveWindowState(start: Date, durationSec: number, now: Date) {
  const graceSec = GRACE_MINUTES * 60;
  const classEnd = new Date(start.getTime() + durationSec * 1000);
  const graceEnd = new Date(classEnd.getTime() + graceSec * 1000);

  if (now < start) return null; // ainda não começou

  if (now < graceEnd) {
    const isClassTime = now < classEnd;
    const elapsed = Math.min(
        Math.floor((now.getTime() - start.getTime()) / 1000),
        durationSec,
    );
    const remaining = isClassTime ? durationSec - elapsed : 0;
    const minsToEnd = Math.ceil((graceEnd.getTime() - now.getTime()) / 60000);

    return {
      active: true,
      ended: false,
      isClassTime,
      elapsed,
      remaining,
      durationSec,
      progress: elapsed / durationSec,
      startTime: start,
      nextLabel: isClassTime
          ? ''
          : `Tempo de aula finalizado, encerrando conexão em ${minsToEnd} min`,
    };
  }

  // passou o grace
  return {
    active: false,
    ended: true,
    isClassTime: false,
    elapsed: durationSec,
    remaining: 0,
    durationSec,
    progress: 1,
    startTime: start,
    nextLabel: 'Aula encerrada',
  };
}

// ── Hook principal ────────────────────────────────────────────────────────

export function useClassTimer(
    classDays: string[],
    classTime: string,
    classDuration: number,
    extraClass?: ExtraClass | null,
): ClassTimerState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo<ClassTimerState>(() => {
    const empty: ClassTimerState = {
      isClassTime: false, isConnectionAllowed: false, isEnded: false,
      elapsed: 0, remaining: 0, duration: 0, progress: 0,
      startTime: null, nextLabel: '', isExtraClass: false,
    };

    // ── 1. Verifica aula extra primeiro (tem precedência se estiver ativa) ──
    if (extraClass) {
      const [ey, em, ed] = extraClass.date.split('-').map(Number);
      const [eh, emin, es] = extraClass.startTime.split(':').map(Number);
      const extraStart = new Date(ey, em - 1, ed, eh, emin, es ?? 0);
      const extraDurationSec = extraClass.durationMin * 60;
      const result = resolveWindowState(extraStart, extraDurationSec, now);

      if (result?.active) {
        return {
          isClassTime: result.isClassTime,
          isConnectionAllowed: true,
          isEnded: false,
          elapsed: result.elapsed,
          remaining: result.remaining,
          duration: result.durationSec,
          progress: result.progress,
          startTime: result.startTime,
          nextLabel: result.nextLabel,
          isExtraClass: true,
        };
      }

      // Aula extra encerrada — retorna estado final sem verificar recorrente
      if (result?.ended) {
        // Não bloqueia: a aula recorrente pode ainda estar ativa abaixo
      }
    }

    // ── 2. Verifica aula recorrente ─────────────────────────────────────────
    if (!classDays.length || !classTime) return empty;

    const [h, m, s] = classTime.split(':').map(Number);
    const durationSec = classDuration * 60;
    const todayDow = now.getDay();
    const isToday = classDays.some((d) => DAY_MAP[d] === todayDow);

    if (isToday) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s ?? 0);
      const result = resolveWindowState(start, durationSec, now);

      if (result?.active) {
        return {
          isClassTime: result.isClassTime,
          isConnectionAllowed: true,
          isEnded: false,
          elapsed: result.elapsed,
          remaining: result.remaining,
          duration: result.durationSec,
          progress: result.progress,
          startTime: result.startTime,
          nextLabel: result.nextLabel,
          isExtraClass: false,
        };
      }

      if (result?.ended) {
        return {
          isClassTime: false, isConnectionAllowed: false, isEnded: true,
          elapsed: durationSec, remaining: 0,
          duration: durationSec, progress: 1,
          startTime: result.startTime,
          nextLabel: 'Aula encerrada',
          isExtraClass: false,
        };
      }
    }

    return {
      ...empty,
      duration: durationSec,
      nextLabel: getNextClassLabel(classDays, classTime, now),
    };
  }, [now, classDays, classTime, classDuration, extraClass]);
}
