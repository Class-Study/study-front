import {Fragment, useEffect, useMemo, useRef, useState} from 'react';
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
import {useNow} from '@/hooks/useNow.ts';
import {
    useCalendarEvents,
    getMondayOfWeek,
    toDateStr,
    timeToMin,
    minToTimeStr,
    addMinutes,
    isOngoing,
    getLevelKey,
    getAvatarText,
} from '@/hooks/useCalendarEvents.ts';
import {useCalendarDrag} from '@/hooks/useCalendarDrag.ts';
import studentService from '@/services/api/student.service.ts';
import scheduleService from '@/services/api/schedule.service.ts';
import {Student} from '@/types/student.types.ts';
import {CalendarEvent, EventType, EventTypeMeta} from '@/types/schedule.types.ts';
import styles from './CalendarTab.module.css';
import Swal from 'sweetalert2';

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 64;
const MIN_PX = HOUR_PX / 60;
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;

// ── Localização ───────────────────────────────────────────────────────────────
const PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PT_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ── Helpers (display only) ────────────────────────────────────────────────────
function minToTop(min: number): number {
    return (min - START_HOUR * 60) * MIN_PX;
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
            } catch { /* silent */ }
            await scheduleService.createExtraClass(payload);
            const newEvent: CalendarEvent = {
                id: crypto.randomUUID().toString(),
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

// ── CalendarTab (main) ──────────────────────────────────────────────────────
export const CalendarTab: React.FC = () => {
    const navigate = useNavigate();
    const now = useNow(30_000);

    // ── Data layer (events, week navigation, reschedule) ─────────────────────
    const {
        setWeekMonday,
        weekDates,
        selectedDayIdx,
        setSelectedDayIdx,
        canGoBack,
        visibleDates,
        byDate,
        pendingReschedule,
        setPendingReschedule,
        handleConfirmReschedule,
        addEvent,
    } = useCalendarEvents();

    // ── UI state (modals) ────────────────────────────────────────────────────
    const [detailsEvent, setDetailsEvent] = useState<CalendarEvent | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    // ── Refs for drag ────────────────────────────────────────────────────────
    const calendarBodyRef = useRef<HTMLDivElement | null>(null);
    const calendarOuterRef = useRef<HTMLDivElement | null>(null);
    const dayHeaderRef = useRef<HTMLDivElement | null>(null);
    const visibleDatesRef = useRef<Date[]>(visibleDates);
    const byDateRef = useRef<Record<string, CalendarEvent[]>>(byDate);
    const canGoBackRef = useRef(canGoBack);

    useEffect(() => { visibleDatesRef.current = visibleDates; }, [visibleDates]);
    useEffect(() => { byDateRef.current = byDate; }, [byDate]);
    useEffect(() => { canGoBackRef.current = canGoBack; }, [canGoBack]);

    // ── Drag layer ───────────────────────────────────────────────────────────
    const {dragState, edgeHint, startDrag} = useCalendarDrag({
        calendarBodyRef,
        calendarOuterRef,
        visibleDatesRef,
        byDateRef,
        canGoBackRef,
        setWeekMonday,
        setPendingReschedule,
        setDetailsEvent,
    });

    // ── Scroll to current hour on mount ──────────────────────────────────────
    useEffect(() => {
        if (!calendarBodyRef.current) return;
        const h = Math.max(now.getHours() - 1, START_HOUR);
        calendarBodyRef.current.scrollTop = (h - START_HOUR) * HOUR_PX;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Labels ───────────────────────────────────────────────────────────────
    const todayStr = toDateStr(now);
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
                                                if (!blocked) startDrag(e, ev);
                                            }}
                                            title={blocked ? `${ev.studentName} — Bloqueado` : ev.studentName}
                                        >
                                            {ongoing && <span className={styles.ongoingDot}/>}
                                            {ev.type === 'EXTRA' && <div className={styles.badge}>AVU</div>}
                                            {ev.type === 'RECURRING' &&
                                                <div className={styles.badgeRecurring}>REC</div>}
                                            {ev.type === 'RECOVERY' &&
                                                <div className={styles.badgeRecovery}>REP</div>}
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
                            <div
                                className={styles.ghostTime}>{minToTimeStr(dragState.targetTimeMin).substring(0, 5)}</div>
                            <div className={styles.ghostName}>{dragState.event.studentName}</div>
                        </div>
                    )}
                </div>

                {/* ── Edge hints (week change indicators) ──────────────── */}
                {edgeHint === 'left' && (
                    <div className={`${styles.edgeHint} ${styles.edgeHintLeft}`}>
                        <ChevronLeft size={18}/>
                        <span>Semana anterior</span>
                    </div>
                )}
                {edgeHint === 'right' && (
                    <div className={`${styles.edgeHint} ${styles.edgeHintRight}`}>
                        <span>Próxima semana</span>
                        <ChevronRight size={18}/>
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
                        addEvent(ev);
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


