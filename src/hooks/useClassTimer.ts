import {useMemo, useState, useEffect} from 'react';
import {Classroom} from "@/types/student.types.ts";

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
    isClassroom: boolean;
}

/** Monta um Date a partir de classroom.date + classroom.startTime */
function parseClassroomStart(classroom: Classroom): Date {
    const [y, m, d] = classroom.date.split('-').map(Number);
    const [h, min, s] = classroom.startTime.split(':').map(Number);
    return new Date(y, m - 1, d, h, min, s ?? 0);
}

/** Gera o label "Próxima aula" com base no classroom */
function getNextClassLabel(classroom: Classroom, now: Date): string {
    const classStart = parseClassroomStart(classroom);
    const dow = classStart.getDay();

    if (now >= classStart) return '';

    const isToday =
        now.getFullYear() === classStart.getFullYear() &&
        now.getMonth() === classStart.getMonth() &&
        now.getDate() === classStart.getDate();

    const timeStr = classroom.startTime.substring(0, 5);

    if (isToday) {
        const diffMin = Math.floor((classStart.getTime() - now.getTime()) / 60000);
        if (diffMin < 60) return `Aula começa em ${diffMin} min`;
        return `Aula hoje às ${timeStr}`;
    }

    const [y, m, d] = classroom.date.split('-').map(Number);
    const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    return `Próxima aula: ${PT_DAYS[dow]} ${formattedDate} às ${timeStr}`;
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
    _classDay: string | string[],
    _classTime: string,
    classDuration: number,
    classroom?: Classroom | null,
): ClassTimerState {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return useMemo<ClassTimerState>(() => {
        const empty: ClassTimerState = {
            isClassTime: false, isConnectionAllowed: false, isEnded: false,
            elapsed: 0, remaining: 0, duration: classDuration * 60, progress: 0,
            startTime: null, nextLabel: '', isClassroom: false,
        };

        // Sem classroom não há como calcular
        if (!classroom) return empty;

        const classStart = parseClassroomStart(classroom);
        const durationSec = classroom.durationMin * 60;

        const result = resolveWindowState(classStart, durationSec, now);

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
                isClassroom: true,
            };
        }

        if (result?.ended) {
            return {
                isClassTime: false, isConnectionAllowed: false, isEnded: true,
                elapsed: durationSec, remaining: 0,
                duration: durationSec, progress: 1,
                startTime: result.startTime,
                nextLabel: 'Aula encerrada',
                isClassroom: true,
            };
        }

        // Aula ainda não começou — mostra label da próxima aula
        return {
            ...empty,
            duration: durationSec,
            nextLabel: getNextClassLabel(classroom, now),
            isClassroom: true,
        };
    }, [now, classDuration, classroom]);
}
