import {useCallback, useEffect, useRef, useState} from 'react';
import {CalendarEvent} from '@/types/schedule.types';
import {timeToMin, toDateStr, minToTimeStr} from '@/hooks/useCalendarEvents';

// ── Grid constants (must match CSS / CalendarTab) ──────────────────────────
const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 64;
const MIN_PX = HOUR_PX / 60;
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;
const SNAP_MIN = 15;
const EDGE_THRESHOLD = 120;
const EDGE_DELAY_MS = 900;
const DRAG_THRESHOLD = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────
function minToTop(min: number): number {
    return (min - START_HOUR * 60) * MIN_PX;
}

function snapMinutes(raw: number): number {
    return Math.round(raw / SNAP_MIN) * SNAP_MIN;
}

function isInPast(dateStr: string, timeStr: string): boolean {
    const now = new Date();
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, m] = timeStr.split(':').map(Number);
    return new Date(y, mo - 1, d, h, m) <= now;
}

function hasConflict(
    byDate: Record<string, CalendarEvent[]>,
    draggingId: string,
    targetDate: string,
    targetTimeMin: number,
    durationMin: number,
): boolean {
    const end = targetTimeMin + durationMin;
    return (byDate[targetDate] ?? []).some(ev => {
        if (ev.id === draggingId) return false;
        const evStart = timeToMin(ev.startTime);
        const evEnd = evStart + ev.durationMin;
        return targetTimeMin < evEnd && end > evStart;
    });
}

// ── DragState ────────────────────────────────────────────────────────────────
export interface DragState {
    event: CalendarEvent;
    targetDate: string;
    targetTimeMin: number;
    valid: boolean;
    ghostTop: number;
    ghostLeft: number;
    ghostWidth: number;
    ghostHeight: number;
}

interface PendingDrag {
    event: CalendarEvent;
    startX: number;
    startY: number;
    offsetY: number;
    cardHeight: number;
}

// ── Hook params ──────────────────────────────────────────────────────────────
interface UseCalendarDragParams {
    calendarBodyRef: React.RefObject<HTMLDivElement | null>;
    calendarOuterRef: React.RefObject<HTMLDivElement | null>;
    visibleDatesRef: React.RefObject<Date[]>;
    byDateRef: React.RefObject<Record<string, CalendarEvent[]>>;
    canGoBackRef: React.RefObject<boolean>;
    setWeekMonday: React.Dispatch<React.SetStateAction<Date>>;
    setPendingReschedule: (val: { event: CalendarEvent; newDate: string; newTime: string } | null) => void;
    setDetailsEvent: (ev: CalendarEvent | null) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useCalendarDrag({
    calendarBodyRef,
    calendarOuterRef,
    visibleDatesRef,
    byDateRef,
    canGoBackRef,
    setWeekMonday,
    setPendingReschedule,
    setDetailsEvent,
}: UseCalendarDragParams) {
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [edgeHint, setEdgeHint] = useState<'left' | 'right' | null>(null);

    const dragRef = useRef<{ event: CalendarEvent; offsetY: number; originalHeight?: number } | null>(null);
    const pendingDragRef = useRef<PendingDrag | null>(null);
    const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Core position update ─────────────────────────────────────────────────
    const updateDragPosition = useCallback((clientX: number, clientY: number) => {
        if (!dragRef.current) return;
        const {event, offsetY} = dragRef.current;
        const body = calendarBodyRef.current;
        if (!body) return;

        const bodyRect = body.getBoundingClientRect();
        const TIME_COL = 64;
        const gridLeft = bodyRect.left + TIME_COL;
        const gridWidth = bodyRect.width - TIME_COL;
        const cols = visibleDatesRef.current!;
        const colWidth = gridWidth / cols.length;
        const colIndex = Math.floor((clientX - gridLeft) / colWidth);

        // ── Edge detection (week navigation hints) ───────────────────────────
        const outerRect = calendarOuterRef.current?.getBoundingClientRect();
        if (outerRect) {
            if (clientX > outerRect.right - EDGE_THRESHOLD) {
                setEdgeHint('right');
                if (!edgeTimerRef.current) {
                    edgeTimerRef.current = setTimeout(() => {
                        setWeekMonday(d => {
                            const n = new Date(d);
                            n.setDate(d.getDate() + 7);
                            return n;
                        });
                        edgeTimerRef.current = null;
                    }, EDGE_DELAY_MS);
                }
            } else if (clientX < outerRect.left + EDGE_THRESHOLD && canGoBackRef.current) {
                setEdgeHint('left');
                if (!edgeTimerRef.current) {
                    edgeTimerRef.current = setTimeout(() => {
                        setWeekMonday(d => {
                            const n = new Date(d);
                            n.setDate(d.getDate() - 7);
                            return n;
                        });
                        edgeTimerRef.current = null;
                    }, EDGE_DELAY_MS);
                }
            } else {
                setEdgeHint(null);
                if (edgeTimerRef.current) {
                    clearTimeout(edgeTimerRef.current);
                    edgeTimerRef.current = null;
                }
            }
        }

        if (colIndex < 0 || colIndex >= cols.length) return;

        const targetDate = toDateStr(cols[colIndex]);
        const relY = (clientY - bodyRect.top) + body.scrollTop;

        const originalH = dragRef.current?.originalHeight;
        const ghostHeight = Math.max(event.durationMin * MIN_PX, originalH ?? 48);

        // Ghost follows the mouse smoothly (no snap)
        const rawGhostTop = relY - offsetY;
        const boundedTopInGrid = Math.min(Math.max(rawGhostTop, 0), GRID_H - ghostHeight);

        // Time is derived from the ghost TOP, not the mouse
        const rawMin = boundedTopInGrid / MIN_PX;
        const snapped = snapMinutes(rawMin);
        const clamped = Math.min(
            Math.max(snapped, 0),
            (END_HOUR - START_HOUR) * 60 - event.durationMin
        );
        const finalMin = clamped + START_HOUR * 60;
        const targetTime = minToTimeStr(finalMin);

        const past = isInPast(targetDate, targetTime);
        const conflict = hasConflict(byDateRef.current!, event.id, targetDate, finalMin, event.durationMin);

        setDragState({
            event,
            targetDate,
            targetTimeMin: finalMin,
            valid: !past && !conflict,
            ghostTop: boundedTopInGrid,
            ghostLeft: TIME_COL + colIndex * colWidth + 4,
            ghostWidth: colWidth - 8,
            ghostHeight,
        });
    }, [calendarBodyRef, calendarOuterRef, visibleDatesRef, byDateRef, canGoBackRef, setWeekMonday]);

    // ── Mouse move (threshold detection + position update) ───────────────────
    const handleMouseMove = useCallback((e: MouseEvent) => {
        // If threshold not yet crossed, check distance
        if (pendingDragRef.current && !dragRef.current) {
            const dx = e.clientX - pendingDragRef.current.startX;
            const dy = e.clientY - pendingDragRef.current.startY;
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

            // Threshold crossed — activate drag
            const {event, offsetY, cardHeight} = pendingDragRef.current;
            const body = calendarBodyRef.current;
            if (!body) return;

            const bodyRect = body.getBoundingClientRect();
            dragRef.current = {event, offsetY, originalHeight: cardHeight};

            const TIME_COL = 64;
            const gridWidth = bodyRect.width - TIME_COL;
            const cols = visibleDatesRef.current!;
            const colWidth = gridWidth / cols.length;

            let colIndex = 0;
            for (let i = 0; i < cols.length; i++) {
                if (toDateStr(cols[i]) === event.date) {
                    colIndex = i;
                    break;
                }
            }

            const originalTopInGrid = minToTop(timeToMin(event.startTime));
            setDragState({
                event,
                targetDate: event.date,
                targetTimeMin: timeToMin(event.startTime),
                valid: true,
                ghostTop: originalTopInGrid,
                ghostLeft: TIME_COL + colIndex * colWidth + 4,
                ghostWidth: colWidth - 8,
                ghostHeight: cardHeight,
            });

            pendingDragRef.current = null;
        }

        updateDragPosition(e.clientX, e.clientY);
    }, [updateDragPosition, calendarBodyRef, visibleDatesRef]);

    // ── Mouse up (click vs drop) ─────────────────────────────────────────────
    const handleMouseUp = useCallback((_mouseEvent: MouseEvent) => {
        // Threshold never crossed → click (open details modal)
        if (pendingDragRef.current) {
            const ev = pendingDragRef.current.event;
            pendingDragRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setDetailsEvent(ev);
            return;
        }

        if (edgeTimerRef.current) {
            clearTimeout(edgeTimerRef.current);
            edgeTimerRef.current = null;
        }
        setEdgeHint(null);

        setDragState(prev => {
            if (prev?.valid) {
                setPendingReschedule({
                    event: prev.event,
                    newDate: prev.targetDate,
                    newTime: minToTimeStr(prev.targetTimeMin),
                });
            }
            return null;
        });

        dragRef.current = null;

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, setPendingReschedule, setDetailsEvent]);

    // ── Start drag (records intent, actual drag on threshold) ────────────────
    const startDrag = useCallback((e: React.MouseEvent, ev: CalendarEvent) => {
        if (ev.studentStatus === 'BLOCKED') return;
        e.preventDefault();

        const cardEl = e.currentTarget as HTMLElement;
        const cardRect = cardEl.getBoundingClientRect();

        pendingDragRef.current = {
            event: ev,
            startX: e.clientX,
            startY: e.clientY,
            offsetY: e.clientY - cardRect.top,
            cardHeight: cardRect.height,
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, handleMouseUp]);

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);
            pendingDragRef.current = null;
        };
    }, [handleMouseMove, handleMouseUp]);

    // ── Grabbing cursor on body while dragging ──────────────────────────────
    useEffect(() => {
        if (dragState) {
            document.body.style.cursor = 'grabbing';
        } else {
            document.body.style.cursor = '';
        }
        return () => { document.body.style.cursor = ''; };
    }, [!!dragState]);

    return {
        dragState,
        edgeHint,
        startDrag,
    };
}

