import {useState} from 'react';
import {Calendar, Clock, X} from 'lucide-react';
import {CalendarEvent} from '@/types/schedule.types.ts';
import {addMinutes} from '@/hooks/useCalendarEvents.ts';
import styles from '../CalendarTab.module.css';

const PT_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface Props {
    event: CalendarEvent;
    newDate: string;
    newTime: string;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export const ConfirmRescheduleModal: React.FC<Props> = ({event, newDate, newTime, onConfirm, onCancel}) => {
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
                    <button type="button" className={styles.modalCloseBtn} onClick={onCancel}><X size={15}/></button>
                </div>
                <div className={styles.createBody}>
                    <p className={styles.confirmStudent}>{event.studentName}</p>
                    <div className={styles.confirmBlock}>
                        <p className={styles.confirmBlockLabel}>De</p>
                        <div className={styles.confirmRow}><Calendar size={13} className={styles.detailsIcon}/><span>{oldDateLabel}</span></div>
                        <div className={styles.confirmRow}><Clock size={13} className={styles.detailsIcon}/><span>{event.startTime.substring(0, 5)} – {oldEndTime} ({event.durationMin} min)</span></div>
                    </div>
                    <div className={styles.confirmArrow}>↓</div>
                    <div className={`${styles.confirmBlock} ${styles.confirmBlockNew}`}>
                        <p className={styles.confirmBlockLabel}>Para</p>
                        <div className={styles.confirmRow}><Calendar size={13} className={styles.detailsIcon}/><span>{dateLabel}</span></div>
                        <div className={styles.confirmRow}><Clock size={13} className={styles.detailsIcon}/><span>{timeLabel}</span></div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>Cancelar</button>
                    <button type="button" className={styles.submitBtn} onClick={handleConfirm} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</button>
                </div>
            </div>
        </div>
    );
};

