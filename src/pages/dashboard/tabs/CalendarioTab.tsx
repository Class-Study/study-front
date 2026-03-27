import {Fragment, useEffect, useMemo, useRef, useState} from 'react';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    Plus,
    Repeat,
    Sparkles,
    X
} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useStudents} from '@/hooks/useStudents';
import {useAuth} from '@/hooks/useAuth';
import studentService from '@/services/api/student.service';
import scheduleService from '@/services/api/schedule.service';
import {Student} from '@/types/student.types';
import {CalendarEvent} from '@/types/schedule.types';
import styles from './CalendarioTab.module.css';

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 64; // px por hora → ~1.067px por minuto
const MIN_PX = HOUR_PX / 60;
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX; // 1088px

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

// Normalize level code to one of the known short keys used in CSS
function getLevelKey(levelCode?: string): 'basic' | 'intermediate' | 'advanced' {
    if (!levelCode) return 'basic';
    const k = levelCode.toLowerCase();
    if (k === 'basic' || k === 'intermediate' || k === 'advanced') return k as any;
    // fallback: try to infer from keywords
    if (k.includes('inter') || k.includes('mid')) return 'intermediate';
    if (k.includes('adv') || k.includes('pro') || k.includes('senior')) return 'advanced';
    return 'basic';
}

// Avatar text: return two-letter initials when possible (first and last name initials),
// otherwise return the first two letters of the single name. Uppercased.
function getAvatarText(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        const first = parts[0].charAt(0);
        const last = parts[parts.length - 1].charAt(0);
        return (first + last).toUpperCase();
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

function addMinutes(time: string, min: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

// ── EventDetailsModal ─────────────────────────────────────────────────────────
interface EventDetailsModalProps {
    event: CalendarEvent;
    onClose: () => void;
    onWorkspace: (id: string) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({event, onClose, onWorkspace}) => {
    const dt = new Date(event.date + 'T00:00:00');
    const dateLabel = `${PT_LONG[dt.getDay()]}, ${dt.getDate()} de ${PT_MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
    const endTime = addMinutes(event.startTime.substring(0, 5), event.durationMin);
    const timeLabel = `${event.startTime.substring(0, 5)} – ${endTime} (${event.durationMin} min)`;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal}`} onClick={e => e.stopPropagation()}>

                <div className={`${styles.detailsHeader} ${styles[`level_${getLevelKey(event.levelCode)}`]}`}>
                    <div className={`${styles.detailsAvatar} ${styles[`level_${getLevelKey(event.levelCode)}`]}`}>
                        {getAvatarText(event.studentName)}
                    </div>
                    <div>
                        <h3 className={styles.detailsName}>{event.studentName}</h3>
                        <span className={`${styles.typeBadge} ${event.type === 'EXTRA' ? styles.typeBadgeExtra : ''}`}>
              {event.type === 'RECURRING'
                  ? <><Repeat size={11}/> Aula recorrente</>
                  : <><Sparkles size={11}/> Aula avulsa</>}
            </span>
                    </div>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}>
                        <X size={15}/>
                    </button>
                </div>

                <div className={styles.detailsBody}>
                    <div className={styles.detailsRow}>
                        <Calendar size={13} className={styles.detailsIcon}/>
                        <span>{dateLabel}</span>
                    </div>
                    <div className={styles.detailsRow}>
                        <Clock size={13} className={styles.detailsIcon}/>
                        <span>{timeLabel}</span>
                    </div>
                    {event.title && event.type === 'EXTRA' && (
                        <div className={styles.detailsRow}>
                            <Sparkles size={13} className={styles.detailsIcon}/>
                            <span>{event.title}</span>
                        </div>
                    )}
                    {event.meetLink && (
                        <div className={styles.detailsRow}>
                            <ExternalLink size={13} className={styles.detailsIcon}/>
                            <a
                                href={event.meetLink}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.meetLink}
                            >
                                {event.meetPlatform === 'GOOGLE_MEET' ? 'Google Meet' : event.meetPlatform ?? 'Reunião'} —
                                Entrar
                            </a>
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.workspaceBtn}
                        onClick={() => onWorkspace(event.studentId)}
                    >
                        <BookOpen size={14}/>
                        Abrir Workspace
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── CreateClassModal ──────────────────────────────────────────────────────────
const DURATION_OPTS = [30, 45, 60, 90, 120];
const TITLE_OPTS = ['Reposição', 'Aula extra'];

interface CreateModalProps {
    students: Student[];
    onClose: () => void;
    onCreated: (ev: CalendarEvent) => void;
}

const CreateClassModal: React.FC<CreateModalProps> = ({students, onClose, onCreated}) => {
    const [form, setForm] = useState({
        studentId: '',
        date: toDateStr(new Date()),
        time: '09:00',
        duration: 60,
        title: 'Reposição',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
    const [searching, setSearching] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const selectedNameFromSearch = searchResults.find(s => s.id === form.studentId)?.name;
    const active = students.filter(s => s.status === 'ACTIVE');


    const set = (key: string, val: unknown) => setForm(p => ({...p, [key]: val}));

    const handleSubmit = async () => {
        if (!form.studentId || !form.date || !form.time || !form.title.trim()) {
            setError('Preencha todos os campos.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                studentId: form.studentId,
                teacherId: (studentService ? undefined : undefined), // placeholder to satisfy TS if studentService missing
                type: 'EXTRA',
                date: form.date,
                startTime: form.time + ':00',
                durationMin: form.duration,
                title: form.title,
            } as any;

            // teacherId from auth (top-level CalendarioTab passes user via hook)
            // We'll get teacherId from localStorage user if available to avoid prop drilling
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
                studentName: selectedNameFromSearch ?? selectedStudent?.name ?? '',
                date: form.date,
                startTime: form.time + ':00',
                durationMin: form.duration,
                type: 'EXTRA',
                title: form.title,
                meetLink: selectedStudent?.meetLink,
                meetPlatform: selectedStudent?.meetPlatform,
                studentStatus: selectedStudent?.status ?? 'ACTIVE',
                levelCode: selectedStudent?.levelProfileCode ?? selectedStudent?.levelProfile?.code,
            };
            onCreated(newEvent);
        } catch {
            setError('Erro ao criar aula. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    // Search students by name/email (debounced simple impl)
    useEffect(() => {
        const t = setTimeout(() => {
            if (!query || query.length < 2) {
                setSearchResults([]);
                setSearching(false);
                return;
            }
            setSearching(true);
            studentService.searchByNameOrEmail(query)
                .then(res => setSearchResults(res))
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className={styles.createHeader}>
                    <h3 className={styles.createTitle}>Nova Aula</h3>
                    <button
                        type="button"
                        className={styles.modalCloseBtn}
                        onClick={onClose}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* BODY */}
                <div className={styles.createBody}>

                    {/* ───── ALUNO ───── */}
                    <label className={styles.label}>Aluno</label>

                    <div className={styles.searchWrapper}>

                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Pesquisar por nome ou email..."
                            value={selectedStudent ? selectedStudent.name : query}
                            onChange={e => {
                                setSelectedStudent(null);
                                set('studentId', null);
                                setQuery(e.target.value);
                            }}
                        />

                        {/* Dropdown */}
                        {!selectedStudent && query.length >= 2 && (
                            <div className={styles.searchResults}>
                                {searching && (
                                    <div className={styles.searching}>Buscando...</div>
                                )}

                                {!searching && searchResults.length === 0 && (
                                    <div className={styles.noResults}>
                                        Nenhum resultado
                                    </div>
                                )}

                                {!searching && searchResults.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={styles.searchItem}
                                        onClick={() => {
                                            setSelectedStudent(r);
                                            set('studentId', r.id);
                                            setQuery('');
                                        }}
                                    >
                                        <div className={styles.searchItemName}>
                                            {r.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selecionado */}
                    {selectedStudent && (
                        <div className={styles.selectedStudent}>
                            <span>{selectedStudent.name}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStudent(null);
                                    set('studentId', null);
                                    setQuery('');
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* ───── DATA / HORA ───── */}
                    <div className={styles.row2}>
                        <div className={styles.col}>
                            <label className={styles.label}>Data</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={form.date}
                                onChange={e => set('date', e.target.value)}
                            />
                        </div>

                        <div className={styles.col}>
                            <label className={styles.label}>Horário</label>
                            <input
                                type="time"
                                className={styles.input}
                                value={form.time}
                                onChange={e => set('time', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ───── DURAÇÃO ───── */}
                    <label className={styles.label}>Duração</label>
                    <div className={styles.pills}>
                        {DURATION_OPTS.map(d => (
                            <button
                                key={d}
                                type="button"
                                className={`${styles.pill} ${
                                    form.duration === d ? styles.pillActive : ''
                                }`}
                                onClick={() => set('duration', d)}
                            >
                                {d} min
                            </button>
                        ))}
                    </div>

                    {/* ───── MOTIVO ───── */}
                    <label className={styles.label}>Motivo da aula</label>
                    <div className={styles.suggestions}>
                        {TITLE_OPTS.map(t => (
                            <button
                                key={t}
                                type="button"
                                className={`${styles.suggestion} ${
                                    form.title === t ? styles.suggestionActive : ''
                                }`}
                                onClick={() => set('title', t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* ───── INFO ───── */}
                    {selectedStudent?.meetLink && (
                        <p className={styles.infoNote}>
                            🔗{' '}
                            {selectedStudent.meetPlatform === 'GOOGLE_MEET'
                                ? 'Google Meet'
                                : selectedStudent.meetPlatform}{' '}
                            será usado como link da reunião.
                        </p>
                    )}

                    {/* ───── ERRO ───── */}
                    {error && <p className={styles.formError}>{error}</p>}
                </div>

                {/* FOOTER */}
                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={() => handleSubmit(form)}
                        disabled={submitting}
                    >
                        {submitting ? 'Criando...' : 'Criar aula'}
                    </button>
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
    const [now, setNow] = useState(() => new Date());
    const bodyRef = useRef<HTMLDivElement | null>(null);

    // Clock — atualiza a cada minuto para a linha de "agora"
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    // Scroll para o horário atual ao montar
    useEffect(() => {
        if (!bodyRef.current) return;
        const h = Math.max(now.getHours() - 1, START_HOUR);
        bodyRef.current.scrollTop = (h - START_HOUR) * HOUR_PX;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const weekDates = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
    const todayStr = toDateStr(now);

    const recurringEvents = useMemo(() => generateRecurring(students, weekDates), [students, weekDates]);

    // Fetch extra classes for the visible week from backend
    useEffect(() => {
        const fetchWeek = async () => {
            try {
                if (!user?.id) return;
                const ws = toDateStr(weekDates[0]);
                const we = toDateStr(weekDates[6]);
                const resp = await scheduleService.getWeek(ws, we, user.id);
                // Map all backend events (recurring + extra) so we can render what backend returns.
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
                        type: e.type === 'EXTRA' ? 'EXTRA' : 'RECURRING',
                        title: e.title ?? undefined,
                        meetLink: e.meetLink ?? undefined,
                        meetPlatform: e.meetPlatform ?? undefined,
                        studentStatus: e.studentStatus ?? 'ACTIVE',
                        levelCode: e.levelCode ?? undefined,
                    } as CalendarEvent;
                });
                setExtraEvents(backendEvents);
                console.debug('[CalendarioTab] backendEvents normalized', backendEvents);
            } catch (err) {
                // ignore for now
                // console.error('[CalendarioTab] failed to fetch week schedule', err);
            }
        };
        void fetchWeek();
    }, [weekDates, user]);

    // Eventos da semana atual (recorrentes + avulsos)
    const weekEvents = useMemo(() => {
        const weekStrs = new Set(weekDates.map(toDateStr));
        // consider backend-provided events (in extraEvents state) and local recurring events
        const backendForWeek = extraEvents.filter(e => weekStrs.has(e.date));

        // Merge: start with generated recurring events, then override/add backend events by composite key (id::date)
        const map = new Map<string, CalendarEvent>();
        for (const ev of recurringEvents) {
            if (weekStrs.has(ev.date)) map.set(`${ev.id}::${ev.date}`, ev);
        }
        for (const ev of backendForWeek) {
            map.set(`${ev.id}::${ev.date}`, ev);
        }

        // debug info
        console.debug('[CalendarioTab] merge result', {
            weekStrs: Array.from(weekStrs),
            recurringCount: recurringEvents.filter(e => weekStrs.has(e.date)).length,
            backendCount: backendForWeek.length,
            keys: Array.from(map.keys())
        });

        return Array.from(map.values());
    }, [recurringEvents, extraEvents, weekDates]);

    // Eventos agrupados por data
    const byDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of weekEvents) {
            (map[ev.date] ??= []).push(ev);
        }
        // Sort each day by start time
        for (const k of Object.keys(map)) {
            map[k].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
        }
        return map;
    }, [weekEvents]);

    // Semanas visíveis
    const visibleDates = useMemo(
        () => selectedDayIdx === null ? weekDates : [weekDates[selectedDayIdx]],
        [weekDates, selectedDayIdx],
    );

    // Labels da semana
    const ws = weekDates[0], we = weekDates[6];
    const weekLabel = ws.getMonth() === we.getMonth()
        ? `${ws.getDate()} – ${we.getDate()} de ${PT_MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
        : `${ws.getDate()} ${PT_MONTHS[ws.getMonth()].substring(0, 3)} – ${we.getDate()} ${PT_MONTHS[we.getMonth()].substring(0, 3)} ${we.getFullYear()}`;

    // Linha de "agora"
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60)
        ? minToTop(nowMin)
        : null;

    const hourTicks = useMemo(() =>
            Array.from({length: END_HOUR - START_HOUR + 1}, (_, i) => START_HOUR + i),
        [],
    );

    return (
        <div className={styles.container}>
            {/* ── Top Bar ─────────────────────────────────────────────────────── */}
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
                            onClick={() => setSelectedDayIdx(null)}>
                        Todos
                    </button>
                    {weekDates.map((date, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`${styles.dayPill} ${selectedDayIdx === i ? styles.dayPillActive : ''} ${toDateStr(date) === todayStr ? styles.dayPillToday : ''}`}
                            onClick={() => setSelectedDayIdx(selectedDayIdx === i ? null : i)}
                        >
                            {PT_SHORT[date.getDay()]} {date.getDate()}
                        </button>
                    ))}
                </div>

                <button type="button" className={styles.createBtn} onClick={() => setShowCreate(true)}>
                    <Plus size={14}/>
                    Nova aula
                </button>
            </div>

            {/* ── Calendar ────────────────────────────────────────────────────── */}
            <div className={styles.calendarOuter}>
                {/* Day header row (sticky) */}
                <div className={styles.dayHeaderRow}>
                    <div className={styles.timeColHeader}/>
                    {visibleDates.map(date => {
                        const isToday = toDateStr(date) === todayStr;
                        return (
                            <div key={toDateStr(date)}
                                 className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                                <span className={styles.dayHeaderName}>{PT_SHORT[date.getDay()]}</span>
                                <span className={`${styles.dayHeaderNum} ${isToday ? styles.dayHeaderNumToday : ''}`}>
                  {date.getDate()}
                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable body */}
                <div className={styles.calendarBody} ref={bodyRef}>
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
                            <div
                                key={dateStr}
                                className={`${styles.dayCol} ${isToday ? styles.dayColToday : ''}`}
                                style={{height: GRID_H}}
                            >
                                {/* Grid lines */}
                                {hourTicks.map(h => (
                                    <Fragment key={h}>
                                        <div className={styles.hourLine} style={{top: (h - START_HOUR) * HOUR_PX}}/>
                                        {h < END_HOUR && (
                                            <div className={styles.halfLine}
                                                 style={{top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2}}/>
                                        )}
                                    </Fragment>
                                ))}

                                {/* Current time line */}
                                {isToday && nowTop !== null && (
                                    <div className={styles.nowLine} style={{top: nowTop}}>
                                        <span className={styles.nowDot}/>
                                    </div>
                                )}

                                {/* Events */}
                                {events.map(ev => {
                                    const startMin = timeToMin(ev.startTime);
                                    const top = Math.max(0, minToTop(startMin));
                                    const height = Math.max(ev.durationMin * MIN_PX, 48);
                                    const blocked = ev.studentStatus === 'BLOCKED';

                                    return (
                                        <div
                                            key={`${ev.id}::${ev.date}`}
                                            className={`
        ${styles.event}
        ${ev.type === 'EXTRA' ? styles.extra : ''}
        ${ev.type === 'RECURRING' ? styles.recurring : ''}
        ${blocked ? styles.blocked : ''}
      `}
                                            style={{ top, height }}
                                            onClick={() => !blocked && setDetailsEvent(ev)}
                                            title={blocked ? `${ev.studentName} — Bloqueado` : ev.studentName}
                                        >

                                            {/* BADGE ABSOLUTA */}
                                            {ev.type === 'EXTRA' && (
                                                <div className={styles.badge}>Avulsa</div>
                                            )}

                                            {ev.type === 'RECURRING' && (
                                                <div className={styles.badgeRecurring}>Recorrente</div>
                                            )}

                                            {/* CONTEÚDO */}
                                            <div className={styles.eventCardHeader}>
                                                <div className={styles.eventCardTitle}>
                                                    <div className={styles.eventName}>{ev.studentName}</div>
                                                </div>

                                                <div className={styles.eventCardRight}>
                                                    <div className={styles.eventTime}>
                                                        {ev.startTime.substring(0, 5)}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Modais ──────────────────────────────────────────────────────── */}
            {detailsEvent && (
                <EventDetailsModal
                    event={detailsEvent!}
                    onClose={() => setDetailsEvent(null)}
                    onWorkspace={id => {
                        setDetailsEvent(null);
                        navigate(`/dashboard/student/${id}/workspace`);
                    }}
                />
            )}

            {showCreate && (
                <CreateClassModal
                    students={students}
                    onClose={() => setShowCreate(false)}
                    onCreated={ev => {
                        setExtraEvents(p => [...p, ev]);
                        setShowCreate(false);
                    }}
                />
            )}
        </div>
    );
};

