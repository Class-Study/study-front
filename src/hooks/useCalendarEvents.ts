import {useCallback, useEffect, useMemo, useState} from 'react';
import {useStudents} from '@/hooks/useStudents';
import {useAuth} from '@/hooks/useAuth';
import scheduleService from '@/services/api/schedule.service';
import {CalendarEvent, EventType} from '@/types/schedule.types';
import {Student} from '@/types/student.types';
import Swal from 'sweetalert2';

// ── Constants ────────────────────────────────────────────────────────────────
const DAY_ENUM: Record<string, number> = {
    SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
    THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getWeekDates(monday: Date): Date[] {
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

export function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function minToTimeStr(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function addMinutes(time: string, min: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function isOngoing(ev: CalendarEvent, now: Date): boolean {
    const dateStr = toDateStr(now);
    if (ev.date !== dateStr) return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const start = timeToMin(ev.startTime);
    const end = start + ev.durationMin;
    return nowMin >= start && nowMin < end;
}

export function getLevelKey(levelCode?: string): 'basic' | 'intermediate' | 'advanced' {
    if (!levelCode) return 'basic';
    const k = levelCode.toLowerCase();
    if (k === 'basic' || k === 'intermediate' || k === 'advanced') return k as any;
    if (k.includes('inter') || k.includes('mid')) return 'intermediate';
    if (k.includes('adv') || k.includes('pro') || k.includes('senior')) return 'advanced';
    return 'basic';
}

export function getAvatarText(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    const p = parts[0];
    return p.length >= 2 ? p.substring(0, 2).toUpperCase() : p.charAt(0).toUpperCase();
}

function mapType(type: string): EventType {
    if (type === 'EXTRA') return 'EXTRA';
    if (type === 'RECURRING') return 'RECURRING';
    if (type === 'RECOVERY') return 'RECOVERY';
    return 'EXTRA';
}

function generateRecurring(students: Student[], weekDates: Date[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    for (const s of students) {
        for (const date of weekDates) {
            if (!s.classDays.some(d => DAY_ENUM[d] === date.getDay())) continue;
            events.push({
                id: `rec-${s.id}-${toDateStr(date)}`,
                studentId: s.id,
                studentName: s.name,
                date: toDateStr(date),
                startTime: s.classTime,
                durationMin: s.classDuration,
                type: 'RECURRING',
                title: 'Aula regular',
                meetLink: s.meetLink,
                meetPlatform: s.meetPlatform,
                studentStatus: s.status,
                levelCode: s.levelProfileCode ?? s.levelProfile?.code,
            });
        }
    }
    return events;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCalendarEvents() {
    const {students} = useStudents();
    const {user} = useAuth();

    const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()));
    const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
    const [extraEvents, setExtraEvents] = useState<CalendarEvent[]>([]);
    const [pendingReschedule, setPendingReschedule] = useState<{
        event: CalendarEvent;
        newDate: string;
        newTime: string;
    } | null>(null);

    const weekDates = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
    const currentWeekMonday = useMemo(() => getMondayOfWeek(new Date()), []);
    const canGoBack = weekMonday > currentWeekMonday;

    const recurringEvents = useMemo(() => generateRecurring(students, weekDates), [students, weekDates]);

    // ── Fetch backend events for the week ────────────────────────────────────
    useEffect(() => {
        const fetchWeek = async () => {
            try {
                if (!user?.id) return;
                const ws = toDateStr(weekDates[0]);
                const we = toDateStr(weekDates[6]);
                const resp = await scheduleService.getWeek(ws, we, user.id);
                const backendEvents: CalendarEvent[] = (resp.events ?? []).map(e => {
                    const rawDate = (e.date ?? '').toString().trim();
                    const normalizedDate = rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate;
                    return {
                        id: e.id,
                        studentId: e.studentId,
                        studentName: e.studentName,
                        date: normalizedDate,
                        startTime: e.startTime,
                        durationMin: e.durationMin,
                        type: mapType(e.type),
                        title: e.title ?? undefined,
                        meetLink: e.meetLink ?? undefined,
                        meetPlatform: e.meetPlatform ?? undefined,
                        studentStatus: e.studentStatus ?? 'ACTIVE',
                        levelCode: e.levelCode ?? undefined
                    } as CalendarEvent;
                });
                setExtraEvents(backendEvents);
            } catch { /* silent */ }
        };
        void fetchWeek();
    }, [weekDates, user]);

    // ── Merge recurring + backend into weekEvents ────────────────────────────
    const weekEvents = useMemo(() => {
        const weekStrs = new Set(weekDates.map(toDateStr));
        const backendForWeek = extraEvents.filter(e => weekStrs.has(e.date));
        const map = new Map<string, CalendarEvent>();
        for (const ev of recurringEvents) {
            if (weekStrs.has(ev.date)) map.set(`${ev.id}::${ev.date}`, ev);
        }
        for (const ev of backendForWeek) {
            map.set(`${ev.id}::${ev.date}`, ev);
        }
        return Array.from(map.values());
    }, [recurringEvents, extraEvents, weekDates]);

    // ── Events grouped by date ───────────────────────────────────────────────
    const byDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of weekEvents) {
            (map[ev.date] ??= []).push(ev);
        }
        for (const k of Object.keys(map)) {
            map[k].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
        }
        return map;
    }, [weekEvents]);

    // ── Visible dates (filtered by selected day pill) ────────────────────────
    const visibleDates = useMemo(
        () => selectedDayIdx === null ? weekDates : [weekDates[selectedDayIdx]],
        [weekDates, selectedDayIdx],
    );

    // ── Confirm reschedule (optimistic + rollback) ───────────────────────────
    const handleConfirmReschedule = useCallback(async () => {
        if (!pendingReschedule) return;
        const {event, newDate, newTime} = pendingReschedule;

        const previous = extraEvents;

        setExtraEvents(prev => prev.map(ev => ev.id === event.id ? ({
            ...ev,
            date: newDate,
            startTime: newTime
        }) : ev));

        setPendingReschedule(null);

        try {
            await scheduleService.reschedule(event.id, newDate, newTime);
            Swal.fire({
                icon: 'success',
                title: 'Aula remarcada!',
                text: 'O agendamento foi atualizado.',
                confirmButtonText: 'OK'
            });
        } catch (err: any) {
            setExtraEvents(previous);
            const message = err?.response?.data?.message || 'Não foi possível remarcar a aula.';
            Swal.fire({icon: 'error', title: 'Erro', text: message});
        }
    }, [pendingReschedule, extraEvents]);

    // ── Add event (from create modal) ────────────────────────────────────────
    const addEvent = useCallback((ev: CalendarEvent) => {
        setExtraEvents(p => [...p, ev]);
    }, []);

    return {
        weekMonday,
        setWeekMonday,
        weekDates,
        selectedDayIdx,
        setSelectedDayIdx,
        canGoBack,
        visibleDates,
        byDate,
        extraEvents,
        pendingReschedule,
        setPendingReschedule,
        handleConfirmReschedule,
        addEvent,
    };
}

