import {BookOpen, Calendar, Clock, ExternalLink, RefreshCcw, Repeat, Sparkles, X} from 'lucide-react';
import {CalendarEvent} from '@/types/schedule.types';
import {addMinutes, getLevelKey, getAvatarText} from '@/hooks/useCalendarEvents';
import styles from '../CalendarioTab.module.css';

const PT_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Props {
    event: CalendarEvent;
    onClose: () => void;
    onWorkspace: (id: string) => void;
    onProfile: (id: string) => void;
}

export const EventDetailsModal: React.FC<Props> = ({event, onClose, onWorkspace, onProfile}) => {
    const dt = new Date(event.date + 'T00:00:00');
    const dateLabel = `${PT_LONG[dt.getDay()]}, ${dt.getDate()} de ${PT_MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
    const endTime = addMinutes(event.startTime.substring(0, 5), event.durationMin);
    const timeLabel = `${event.startTime.substring(0, 5)} – ${endTime} (${event.durationMin} min)`;
    const level = getLevelKey(event.levelCode);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={`${styles.detailsHeader} ${styles[`level_${level}`]}`}>
                    <div className={`${styles.detailsAvatar} ${styles[`level_${level}`]}`}
                         onClick={() => onProfile(event.studentId)} style={{cursor: 'pointer'}}>
                        {getAvatarText(event.studentName)}
                    </div>
                    <div>
                        <h3 className={styles.detailsName}>{event.studentName}</h3>
                        <span className={`${styles.typeBadge} ${event.type === 'EXTRA' ? styles.typeBadgeExtra : ''} ${event.type === 'RECOVERY' ? styles.typeBadgeRecovery : ''}`}>
                            {event.type === 'RECURRING' && <><Repeat size={11}/> Aula recorrente</>}
                            {event.type === 'EXTRA' && <><Sparkles size={11}/> Aula avulsa</>}
                            {event.type === 'RECOVERY' && <><RefreshCcw size={11}/> Aula de reposição</>}
                        </span>
                    </div>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={15}/></button>
                </div>
                <div className={styles.detailsBody}>
                    <div className={styles.detailsRow}><Calendar size={13} className={styles.detailsIcon}/><span>{dateLabel}</span></div>
                    <div className={styles.detailsRow}><Clock size={13} className={styles.detailsIcon}/><span>{timeLabel}</span></div>
                    {event.title && event.type === 'EXTRA' && (
                        <div className={styles.detailsRow}><Sparkles size={13} className={styles.detailsIcon}/><span>{event.title}</span></div>
                    )}
                    {event.meetLink && (
                        <div className={styles.detailsRow}>
                            <ExternalLink size={13} className={styles.detailsIcon}/>
                            <a href={event.meetLink} target="_blank" rel="noreferrer" className={styles.meetLink}>
                                {event.meetPlatform === 'GOOGLE_MEET' ? 'Google Meet' : event.meetPlatform ?? 'Reunião'} — Entrar
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

