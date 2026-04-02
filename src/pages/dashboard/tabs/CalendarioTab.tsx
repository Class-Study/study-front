import {Fragment, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    Plus,
    RefreshCcw,
    Repeat,
    Sparkles,
    X
} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useStudents} from '@/hooks/useStudents';
import {useNow} from '@/hooks/useNow';
import {useAuth} from '@/hooks/useAuth';
import studentService from '@/services/api/student.service';
import scheduleService from '@/services/api/schedule.service';
import {Student} from '@/types/student.types';
import {CalendarEvent, EventType, EventTypeMeta} from '@/types/schedule.types';
import styles from './CalendarioTab.module.css';
import Swal from "sweetalert2";

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 64;
const MIN_PX = HOUR_PX / 60;
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;
const SNAP_MIN = 15;
const EDGE_THRESHOLD = 120;
const EDGE_DELAY_MS = 900;
const DRAG_THRESHOLD = 5;

// ── Localização ───────────────────────────────────────────────────────────────
const PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PT_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAY_ENUM: Record<string, number> = {
    SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
    THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isOngoing(ev: CalendarEvent, now: Date): boolean {
    const dateStr = toDateStr(now);
    if (ev.date !== dateStr) return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const start = timeToMin(ev.startTime);
    const end = start + ev.durationMin;
    return nowMin >= start && nowMin < end;
}

function getLevelKey(levelCode?: string): 'basic' | 'intermediate' | 'advanced' {
    if (!levelCode) return 'basic';
    const k = levelCode.toLowerCase();
    if (k === 'basic' || k === 'intermediate' || k === 'advanced') return k as any;
    if (k.includes('inter') || k.includes('mid')) return 'intermediate';
    if (k.includes('adv') || k.includes('pro') || k.includes('senior')) return 'advanced';
    return 'basic';
}

function getAvatarText(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    const p = parts[0];
    return p.length >= 2 ? p.substring(0, 2).toUpperCase() : p.charAt(0).toUpperCase();
}

function getWeekDates(monday: Date): Date[] {
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minToTop(min: number): number {
    return (min - START_HOUR * 60) * MIN_PX;
}

function minToTimeStr(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function addMinutes(time: string, min: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

// ── DragState ─────────────────────────────────────────────────────────────────
interface DragState {
    event: CalendarEvent;
    targetDate: string;
    targetTimeMin: number; // minutos desde meia-noite
    valid: boolean;
    ghostTop: number;
    ghostLeft: number;
    ghostWidth: number;
    ghostHeight: number;
}

// ── ConfirmRescheduleModal ────────────────────────────────────────────────────
interface ConfirmRescheduleProps {
    event: CalendarEvent;
    newDate: string;
    newTime: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

const ConfirmRescheduleModal: React.FC<ConfirmRescheduleProps> = ({event, newDate, newTime, onConfirm, onCancel}) => {
    const [saving, setSaving] = useState(false);
    const dt = new Date(newDate + 'T00:00:00');
    const dateLabel = `${PT_LONG[dt.getDay()]}, ${dt.getDate()} de ${PT_MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
    const endTime = addMinutes(newTime.substring(0, 5), event.durationMin);
    const timeLabel = `${newTime.substring(0, 5)} – ${endTime} (${event.durationMin} min)`;

    const oldDt = new Date(event.date + 'T00:00:00');
    const oldDateLabel = `${PT_LONG[oldDt.getDay()]}, ${oldDt.getDate()} de ${PT_MONTHS[oldDt.getMonth()]}`;
    const oldEndTime = addMinutes(event.startTime.substring(0, 5), event.durationMin);

    const handleConfirm = async () => {
        setSaving(true);
        await onConfirm();
        setSaving(false);
    };

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.createHeader}>
                    <h3 className={styles.createTitle}>Confirmar remarcação</h3>
                    <button type="button" className={styles.modalCloseBtn} onClick={onCancel}>
                        <X size={15}/>
                    </button>
                </div>

                <div className={styles.createBody}>
                    <p className={styles.confirmStudent}>{event.studentName}</p>

                    <div className={styles.confirmBlock}>
                        <p className={styles.confirmBlockLabel}>De</p>
                        <div className={styles.confirmRow}>
                            <Calendar size={13} className={styles.detailsIcon}/>
                            <span>{oldDateLabel}</span>
                        </div>
                        <div className={styles.confirmRow}>
                            <Clock size={13} className={styles.detailsIcon}/>
                            <span>{event.startTime.substring(0, 5)} – {oldEndTime} ({event.durationMin} min)</span>
                        </div>
                    </div>

                    <div className={styles.confirmArrow}>↓</div>

                    <div className={`${styles.confirmBlock} ${styles.confirmBlockNew}`}>
                        <p className={styles.confirmBlockLabel}>Para</p>
                        <div className={styles.confirmRow}>
                            <Calendar size={13} className={styles.detailsIcon}/>
                            <span>{dateLabel}</span>
                        </div>
                        <div className={styles.confirmRow}>
                            <Clock size={13} className={styles.detailsIcon}/>
                            <span>{timeLabel}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
                        Cancelar
                    </button>
                    <button type="button" className={styles.submitBtn} onClick={handleConfirm} disabled={saving}>
                        {saving ? 'Salvando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── EventDetailsModal ─────────────────────────────────────────────────────────
interface EventDetailsModalProps {
    event: CalendarEvent;
    onClose: () => void;
    onWorkspace: (id: string) => void;
    onProfile: (id: string) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({event, onClose, onWorkspace, onProfile}) => {
    const dt = new Date(event.date + 'T00:00:00');
    const dateLabel = `${PT_LONG[dt.getDay()]}, ${dt.getDate()} de ${PT_MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
    const endTime = addMinutes(event.startTime.substring(0, 5), event.durationMin);
    const timeLabel = `${event.startTime.substring(0, 5)} – ${endTime} (${event.durationMin} min)`;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal}`} onClick={e => e.stopPropagation()}>
                <div className={`${styles.detailsHeader} ${styles[`level_${getLevelKey(event.levelCode)}`]}`}>
                    <div
                        className={`${styles.detailsAvatar} ${styles[`level_${getLevelKey(event.levelCode)}`]}`}
                        onClick={() => onProfile(event.studentId)}
                        style={{cursor: 'pointer'}}
                    >
                        {getAvatarText(event.studentName)}
                    </div>
                    <div>
                        <h3 className={styles.detailsName}>{event.studentName}</h3>
                        <span
                            className={`${styles.typeBadge} ${event.type === 'EXTRA' ? styles.typeBadgeExtra : ''} ${event.type === 'RECOVERY' ? styles.typeBadgeRecovery : ''}`}>
                            {event.type === 'RECURRING' && <><Repeat size={11}/> Aula recorrente</>}
                            {event.type === 'EXTRA' && <><Sparkles size={11}/> Aula avulsa</>}
                            {event.type === 'RECOVERY' && <><RefreshCcw size={11}/> Aula de reposição</>}
                        </span>
                    </div>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={15}/></button>
                </div>
                <div className={styles.detailsBody}>
                    <div className={styles.detailsRow}><Calendar size={13}
                                                                 className={styles.detailsIcon}/><span>{dateLabel}</span>
                    </div>
                    <div className={styles.detailsRow}><Clock size={13}
                                                              className={styles.detailsIcon}/><span>{timeLabel}</span>
                    </div>
                    {event.title && event.type === 'EXTRA' && (
                        <div className={styles.detailsRow}><Sparkles size={13}
                                                                     className={styles.detailsIcon}/><span>{event.title}</span>
                        </div>
                    )}
                    {event.meetLink && (
                        <div className={styles.detailsRow}>
                            <ExternalLink size={13} className={styles.detailsIcon}/>
                            <a href={event.meetLink} target="_blank" rel="noreferrer" className={styles.meetLink}>
                                {event.meetPlatform === 'GOOGLE_MEET' ? 'Google Meet' : event.meetPlatform ?? 'Reunião'} —
                                Entrar
                            </a>
                        </div>
                    )}
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className={styles.workspaceBtn} onClick={() => onWorkspace(event.studentId)}>
                        <BookOpen size={14}/> Abrir Workspace
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── CreateClassModal ──────────────────────────────────────────────────────────
const DURATION_OPTS = [30, 45, 60, 90, 120];

interface BasicStudent {
    id: string;
    name: string;
}

const CreateClassModal: React.FC<{ onClose: () => void; onCreated: (ev: CalendarEvent) => void }> = ({
                                                                                                         onClose,
                                                                                                         onCreated
                                                                                                     }) => {
    const [form, setForm] = useState({
        studentId: '',
        date: toDateStr(new Date()),
        time: '09:00',
        duration: 60,
        type: 'EXTRA' as EventType
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudent, _setSelectedStudent] = useState<Student | null>(null);
    const [basicStudent, setBasicStudent] = useState<BasicStudent | null>(null);

    const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) => setForm(p => ({...p, [key]: val}));

    const handleSubmit = async () => {
        if (!form.studentId || !form.date || !form.time) {
            setError('Preencha todos os campos.');
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                studentId: form.studentId,
                teacherId: '',
                type: form.type,
                date: form.date,
                startTime: form.time + ':00',
                durationMin: form.duration,
                title: form.type.toString()
            };
            try {
                const stored = localStorage.getItem('user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed?.id) payload.teacherId = parsed.id;
                }
            } catch {
            }
            await scheduleService.createExtraClass(payload);
            const newEvent: CalendarEvent = {
                id: `extra-${Date.now()}`,
                studentId: form.studentId,
                studentName: basicStudent?.name,
                date: form.date,
                startTime: form.time + ':00',
                durationMin: form.duration,
                type: form.type,
                meetLink: selectedStudent?.meetLink,
                meetPlatform: selectedStudent?.meetPlatform,
                studentStatus: selectedStudent?.status ?? 'ACTIVE',
                levelCode: selectedStudent?.levelProfileCode ?? selectedStudent?.levelProfile?.code,
                title: EventTypeMeta[form.type].label
            };
            onCreated(newEvent);
            Swal.fire({
                icon: 'success',
                title: 'Aula criada!',
                text: 'Agendamento realizado com sucesso.',
                confirmButtonText: 'OK'
            });
        } catch (err: any) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message || err?.response?.data?.error || err?.message;
            if (status === 400 || status === 409) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atenção',
                    text: message || 'Dados inválidos ou conflito de horário.'
                });
            } else {
                Swal.fire({icon: 'error', title: 'Erro', text: 'Não foi possível criar um novo agendamento.'});
            }
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                setSearching(false);
                return;
            }
            setSearching(true);
            studentService.searchByNameOrEmail(query).then(res => setSearchResults(res)).catch(() => setSearchResults([])).finally(() => setSearching(false));
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.createHeader}>
                    <h3 className={styles.createTitle}>Nova Aula</h3>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={15}/></button>
                </div>
                <div className={styles.createBody}>
                    <label className={styles.label}>Aluno</label>
                    <div className={styles.searchWrapper}>
                        <input type="text" className={styles.input} placeholder="Pesquisar por nome ou email..."
                               value={basicStudent ? basicStudent.name : query} onChange={e => {
                            setBasicStudent(null);
                            set('studentId', '');
                            setQuery(e.target.value);
                        }}/>
                        {!selectedStudent && query.length >= 2 && (
                            <div className={styles.searchResults}>
                                {searching && <div className={styles.searching}>Buscando...</div>}
                                {!searching && searchResults.length === 0 &&
                                    <div className={styles.noResults}>Nenhum resultado</div>}
                                {!searching && searchResults.map(r => (
                                    <button key={r.id} type="button" className={styles.searchItem} onClick={() => {
                                        setBasicStudent(r);
                                        set('studentId', r.id);
                                        setQuery('');
                                    }}>{r.name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={styles.row2}>
                        <div className={styles.col}><label className={styles.label}>Data</label><input type="date"
                                                                                                       className={styles.input}
                                                                                                       value={form.date}
                                                                                                       onChange={e => set('date', e.target.value)}/>
                        </div>
                        <div className={styles.col}><label className={styles.label}>Horário</label><input type="time"
                                                                                                          className={styles.input}
                                                                                                          value={form.time}
                                                                                                          onChange={e => set('time', e.target.value)}/>
                        </div>
                    </div>
                    <label className={styles.label}>Duração</label>
                    <div className={styles.pills}>
                        {DURATION_OPTS.map(d => (<button key={d} type="button"
                                                         className={`${styles.pill} ${form.duration === d ? styles.pillActive : ''}`}
                                                         onClick={() => set('duration', d)}>{d} min</button>))}
                    </div>
                    <label className={styles.label}>Tipo da aula</label>
                    <select className={styles.input} value={form.type}
                            onChange={e => set('type', e.target.value as EventType)}>
                        {Object.entries(EventTypeMeta).filter(([key]) => key !== 'RECURRING').map(([key, meta]) => (
                            <option key={key} value={key}>{meta.label}</option>))}
                    </select>
                    {selectedStudent?.meetLink &&
                        <p className={styles.infoNote}>🔗 {selectedStudent.meetPlatform === 'GOOGLE_MEET' ? 'Google Meet' : selectedStudent.meetPlatform} será
                            usado.</p>}
                    {error && <p className={styles.formError}>{error}</p>}
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                    <button type="button" className={styles.submitBtn} onClick={handleSubmit}
                            disabled={submitting}>{submitting ? 'Criando...' : 'Criar aula'}</button>
                </div>
            </div>
        </div>
    );
};

// ── CalendarioTab (main) ──────────────────────────────────────────────────────
export const CalendarioTab: React.FC = () => {
    const navigate = useNavigate();
    const {students} = useStudents();
    const {user} = useAuth();

    const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()));
    const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
    const [extraEvents, setExtraEvents] = useState<CalendarEvent[]>([]);
    const [detailsEvent, setDetailsEvent] = useState<CalendarEvent | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [pendingReschedule, setPendingReschedule] = useState<{
        event: CalendarEvent;
        newDate: string;
        newTime: string;
    } | null>(null);

    // ── Drag state ───────────────────────────────────────────────────────────
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [edgeHint, setEdgeHint] = useState<'left' | 'right' | null>(null);
    const dragRef = useRef<{ event: CalendarEvent; offsetY: number; originalHeight?: number } | null>(null);
    const pendingDragRef = useRef<{
        event: CalendarEvent;
        startX: number;
        startY: number;
        offsetY: number;
        cardHeight: number;
    } | null>(null);
    const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const calendarBodyRef = useRef<HTMLDivElement | null>(null);
    const calendarOuterRef = useRef<HTMLDivElement | null>(null);

    const now = useNow(30_000);

    useEffect(() => {
        if (!calendarBodyRef.current) return;
        const h = Math.max(now.getHours() - 1, START_HOUR);
        calendarBodyRef.current.scrollTop = (h - START_HOUR) * HOUR_PX;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const weekDates = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
    const todayStr = toDateStr(now);
    const currentWeekMonday = useMemo(() => getMondayOfWeek(new Date()), []);
    const canGoBack = weekMonday > currentWeekMonday;

    const recurringEvents = useMemo(() => generateRecurring(students, weekDates), [students, weekDates]);

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
            } catch {
            }
        };
        void fetchWeek();
    }, [weekDates, user]);

    const mapType = (type: string): EventType => {
        if (type === 'EXTRA') return 'EXTRA';
        if (type === 'RECURRING') return 'RECURRING';
        if (type === 'RECOVERY') return 'RECOVERY';
        return 'EXTRA';
    };

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

    const visibleDates = useMemo(
        () => selectedDayIdx === null ? weekDates : [weekDates[selectedDayIdx]],
        [weekDates, selectedDayIdx],
    );

    const visibleDatesRef = useRef<Date[]>(visibleDates);
    const byDateRef = useRef<Record<string, CalendarEvent[]>>(byDate);
    const canGoBackRef = useRef(canGoBack);
    const dayHeaderRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        visibleDatesRef.current = visibleDates;
    }, [visibleDates]);
    useEffect(() => {
        byDateRef.current = byDate;
    }, [byDate]);
    useEffect(() => {
        canGoBackRef.current = canGoBack;
    }, [canGoBack]);

    // ── Drag handlers ────────────────────────────────────────────────────────

    const updateDragPosition = useCallback((clientX: number, clientY: number) => {
        if (!dragRef.current) return;
        const {event, offsetY} = dragRef.current;
        const body = calendarBodyRef.current;
        if (!body) return;

        const bodyRect = body.getBoundingClientRect();
        const TIME_COL = 64;
        const gridLeft = bodyRect.left + TIME_COL;
        const gridWidth = bodyRect.width - TIME_COL;
        const cols = visibleDatesRef.current;
        const colWidth = gridWidth / cols.length;
        const colIndex = Math.floor((clientX - gridLeft) / colWidth);

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

        // calcular altura do ghost para permitir clamp do top
        const originalH = dragRef.current?.originalHeight;
        const ghostHeight = Math.max(event.durationMin * MIN_PX, originalH ?? 48);

        // Ghost follows the mouse smoothly (no snap)
        const rawGhostTop = relY - offsetY;
        const boundedTopInGrid = Math.min(Math.max(rawGhostTop, 0), GRID_H - ghostHeight);

        // O horário é calculado a partir do TOPO do ghost card, não da posição do mouse
        const rawMin = boundedTopInGrid / MIN_PX;
        const snapped = snapMinutes(rawMin);

        const clamped = Math.min(
            Math.max(snapped, 0),
            (END_HOUR - START_HOUR) * 60 - event.durationMin
        );

        // converte pro horário real (minutos desde meia-noite)
        const finalMin = clamped + START_HOUR * 60;
        const targetTime = minToTimeStr(finalMin);

        const past = isInPast(targetDate, targetTime);
        const conflict = hasConflict(byDateRef.current, event.id, targetDate, finalMin, event.durationMin);


        setDragState({
            event,
            targetDate,
            targetTimeMin: finalMin,
            valid: !past && !conflict,
            ghostTop: boundedTopInGrid, // Position within grid, not viewport
            ghostLeft: TIME_COL + colIndex * colWidth + 4,
            ghostWidth: colWidth - 8,
            ghostHeight,
        });
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // If threshold not yet crossed, check if we should activate drag
        if (pendingDragRef.current && !dragRef.current) {
            const dx = e.clientX - pendingDragRef.current.startX;
            const dy = e.clientY - pendingDragRef.current.startY;
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

            // Threshold crossed — activate the drag
            const {event, offsetY, cardHeight} = pendingDragRef.current;
            const body = calendarBodyRef.current;
            if (!body) return;

            const bodyRect = body.getBoundingClientRect();
            dragRef.current = {event, offsetY, originalHeight: cardHeight};

            const TIME_COL = 64;
            const gridWidth = bodyRect.width - TIME_COL;
            const cols = visibleDatesRef.current;
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

        // Normal drag update
        updateDragPosition(e.clientX, e.clientY);
    }, [updateDragPosition]);

    const handleMouseUp = useCallback((_: MouseEvent) => {
        // Threshold never crossed → treat as click (open details modal)
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
                    newTime: minToTimeStr(prev.targetTimeMin)
                });
            }
            return null;
        });

        dragRef.current = null;

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]); // só depende de handleMouseMove que é estável

    const startDrag = useCallback((e: React.MouseEvent, ev: CalendarEvent) => {
        if (ev.studentStatus === 'BLOCKED') return;
        e.preventDefault();

        const cardEl = e.currentTarget as HTMLElement;
        const cardRect = cardEl.getBoundingClientRect();

        // Only record the intent — actual drag activates after threshold
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);
            pendingDragRef.current = null;
        };
    }, [handleMouseMove, handleMouseUp]);

    // Force grabbing cursor on body while dragging
    useEffect(() => {
        if (dragState) {
            document.body.style.cursor = 'grabbing';
        } else {
            document.body.style.cursor = '';
        }
        return () => { document.body.style.cursor = ''; };
    }, [!!dragState]);

    // ── Confirm reschedule ───────────────────────────────────────────────────
    const handleConfirmReschedule = async () => {
        if (!pendingReschedule) return;
        const {event, newDate, newTime} = pendingReschedule;

        // Snapshot previous state for rollback
        const previous = extraEvents;

        // Apply optimistic update immediately so the agenda reflects the change
        setExtraEvents(prev => prev.map(ev => ev.id === event.id ? ({
            ...ev,
            date: newDate,
            startTime: newTime
        }) : ev));

        // Close the confirmation modal right away (UI reflects optimistic change)
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
            // Rollback to previous state on error
            setExtraEvents(previous);
            const message = err?.response?.data?.message || 'Não foi possível remarcar a aula.';
            Swal.fire({icon: 'error', title: 'Erro', text: message});
        }
    };

    // ── Labels ───────────────────────────────────────────────────────────────
    const ws = weekDates[0], we = weekDates[6];
    const weekLabel = ws.getMonth() === we.getMonth()
        ? `${ws.getDate()} – ${we.getDate()} de ${PT_MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
        : `${ws.getDate()} ${PT_MONTHS[ws.getMonth()].substring(0, 3)} – ${we.getDate()} ${PT_MONTHS[we.getMonth()].substring(0, 3)} ${we.getFullYear()}`;

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60) ? minToTop(nowMin) : null;
    const hourTicks = useMemo(() => Array.from({length: END_HOUR - START_HOUR + 1}, (_, i) => START_HOUR + i), []);

    return (
        <div className={styles.container} style={{userSelect: dragState ? 'none' : undefined}}>
            {/* ── Top Bar ───────────────────────────────────────────────────── */}
            <div className={styles.topBar}>
                <div className={styles.navGroup}>
                    <button type="button" className={styles.navBtn} onClick={() => setWeekMonday(d => {
                        const n = new Date(d);
                        n.setDate(d.getDate() - 7);
                        return n;
                    })}>
                        <ChevronLeft size={15}/>
                    </button>
                    <span className={styles.weekLabel}>{weekLabel}</span>
                    <button type="button" className={styles.navBtn} onClick={() => setWeekMonday(d => {
                        const n = new Date(d);
                        n.setDate(d.getDate() + 7);
                        return n;
                    })}>
                        <ChevronRight size={15}/>
                    </button>
                    <button type="button" className={styles.todayBtn} onClick={() => {
                        setWeekMonday(getMondayOfWeek(new Date()));
                        setSelectedDayIdx(null);
                    }}>
                        Hoje
                    </button>
                </div>
                <div className={styles.dayPills}>
                    <button type="button"
                            className={`${styles.dayPill} ${selectedDayIdx === null ? styles.dayPillActive : ''}`}
                            onClick={() => setSelectedDayIdx(null)}>Todos
                    </button>
                    {weekDates.map((date, i) => (
                        <button key={i} type="button"
                                className={`${styles.dayPill} ${selectedDayIdx === i ? styles.dayPillActive : ''} ${toDateStr(date) === todayStr ? styles.dayPillToday : ''}`}
                                onClick={() => setSelectedDayIdx(selectedDayIdx === i ? null : i)}>
                            {PT_SHORT[date.getDay()]} {date.getDate()}
                        </button>
                    ))}
                </div>
                <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
                    <Plus size={14}/> Nova aula
                </button>
            </div>

            {/* ── Calendar ──────────────────────────────────────────────────── */}
            <div className={styles.calendarOuter} ref={calendarOuterRef}>
                <div className={styles.dayHeaderRow} ref={dayHeaderRef}>
                    <div className={styles.timeColHeader}/>
                    {visibleDates.map(date => {
                        const isToday = toDateStr(date) === todayStr;
                        return (
                            <div key={toDateStr(date)}
                                 className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                                <span className={styles.dayHeaderName}>{PT_SHORT[date.getDay()]}</span>
                                <span
                                    className={`${styles.dayHeaderNum} ${isToday ? styles.dayHeaderNumToday : ''}`}>{date.getDate()}</span>
                            </div>
                        );
                    })}
                </div>

                <div className={styles.calendarBody} ref={calendarBodyRef}>
                    {/* Time labels */}
                    <div className={styles.timeCol} style={{height: GRID_H}}>
                        {hourTicks.map(h => (
                            <div key={h} className={styles.timeLabel} style={{top: (h - START_HOUR) * HOUR_PX - 9}}>
                                {String(h).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {visibleDates.map(date => {
                        const dateStr = toDateStr(date);
                        const isToday = dateStr === todayStr;
                        const events = byDate[dateStr] ?? [];

                        return (
                            <div key={dateStr} className={`${styles.dayCol} ${isToday ? styles.dayColToday : ''}`}
                                 style={{height: GRID_H}}>
                                {hourTicks.map(h => (
                                    <Fragment key={h}>
                                        <div className={styles.hourLine} style={{top: (h - START_HOUR) * HOUR_PX}}/>
                                        {h < END_HOUR && <div className={styles.halfLine}
                                                              style={{top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2}}/>}
                                    </Fragment>
                                ))}

                                {isToday && nowTop !== null && (
                                    <div className={styles.nowLine} style={{top: nowTop}}><span
                                        className={styles.nowDot}/></div>
                                )}

                                {events.map(ev => {
                                    const startMin = timeToMin(ev.startTime);
                                    const top = Math.max(0, minToTop(startMin));
                                    const height = Math.max(ev.durationMin * MIN_PX, 48);
                                    const blocked = ev.studentStatus === 'BLOCKED';
                                    const ongoing = isOngoing(ev, now);
                                    const isDraggingThis = dragState?.event.id === ev.id;

                                    return (
                                        <div
                                            key={`${ev.id}-${ev.startTime}-${ev.type}`}
                                            className={`${styles.event}
                                                ${ev.type === 'EXTRA' ? styles.extra : ''}
                                                ${ev.type === 'RECURRING' ? styles.recurring : ''}
                                                ${ev.type === 'RECOVERY' ? styles.recovery : ''}
                                                ${blocked ? styles.blocked : ''}
                                                ${ongoing ? styles.ongoing : ''}
                                                ${isDraggingThis ? styles.eventDragging : ''}
                                            `}
                                            style={{top, height, cursor: blocked ? 'default' : 'pointer'}}
                                            onMouseDown={e => {
                                                if (!blocked) {
                                                    startDrag(e, ev);
                                                }
                                            }}
                                            title={blocked ? `${ev.studentName} — Bloqueado` : ev.studentName}
                                        >
                                            {ongoing && <span className={styles.ongoingDot}/>}
                                            {ev.type === 'EXTRA' && <div className={styles.badge}>AVU</div>}
                                            {ev.type === 'RECURRING' &&
                                                <div className={styles.badgeRecurring}>REC</div>}
                                            {ev.type === 'RECOVERY' && <div className={styles.badgeRecovery}>REP</div>}
                                            <div className={styles.eventCardHeader}>
                                                <div className={styles.eventCardTitle}>
                                                    <div className={styles.eventName}>{ev.studentName}</div>
                                                </div>
                                                <div className={styles.eventCardRight}>
                                                    <div
                                                        className={styles.eventTime}>{ev.startTime.substring(0, 5)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* ── Ghost card ─────────────────────────────────────────── */}
                    {dragState && (
                        <div
                            className={`${styles.ghostCard} ${dragState.valid ? styles.ghostValid : styles.ghostInvalid}`}
                            style={{
                                position: 'absolute',
                                top: dragState.ghostTop,
                                left: dragState.ghostLeft,
                                width: dragState.ghostWidth,
                                height: dragState.ghostHeight,
                                zIndex: 1000,
                                pointerEvents: 'none',
                            }}
                        >
                            <div className={styles.ghostTime}>{minToTimeStr(dragState.targetTimeMin).substring(0, 5)}</div>
                            <div className={styles.ghostName}>{dragState.event.studentName}</div>
                        </div>
                    )}
                </div>

                {/* ── Edge hints (week change indicators) ──────────────── */}
                {edgeHint === 'left' && (
                    <div className={`${styles.edgeHint} ${styles.edgeHintLeft}`}>
                        <ChevronLeft size={18} />
                        <span>Semana anterior</span>
                    </div>
                )}
                {edgeHint === 'right' && (
                    <div className={`${styles.edgeHint} ${styles.edgeHintRight}`}>
                        <span>Próxima semana</span>
                        <ChevronRight size={18} />
                    </div>
                )}
            </div>

            {/* ── Modais ────────────────────────────────────────────────────── */}
            {detailsEvent && (
                <EventDetailsModal
                    event={detailsEvent}
                    onClose={() => setDetailsEvent(null)}
                    onWorkspace={id => {
                        setDetailsEvent(null);
                        navigate(`/dashboard/student/${id}/workspace`);
                    }}
                    onProfile={id => {
                        setDetailsEvent(null);
                        navigate(`/dashboard/student/${id}`);
                    }}
                />
            )}

            {showCreate && (
                <CreateClassModal
                    onClose={() => setShowCreate(false)}
                    onCreated={ev => {
                        setExtraEvents(p => [...p, ev]);
                        setShowCreate(false);
                    }}
                />
            )}

            {pendingReschedule && (
                <ConfirmRescheduleModal
                    event={pendingReschedule.event}
                    newDate={pendingReschedule.newDate}
                    newTime={pendingReschedule.newTime}
                    onConfirm={handleConfirmReschedule}
                    onCancel={() => setPendingReschedule(null)}
                />
            )}
        </div>
    );
};


