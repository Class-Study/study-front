import React, {useEffect, useState} from 'react';
import {X, Calendar, Clock, AlertTriangle, Check} from 'lucide-react';
import {useRescheduleOptions} from '@/hooks/useRescheduleOptions';
import {Option} from '@/types/schedule.types';
import styles from './RescheduleModal.module.css';

interface RescheduleModalProps {
    scheduleId: string;
    studentId: string;
    conflictDate: string;
    type: string;
    conflictTime: string;
    conflictDuration: number;
    onClose: () => void;
    onRescheduled: (scheduleId: string, newDate: string) => void;
    onCancelled: (scheduleId: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
                                                                    scheduleId,
                                                                    studentId,
                                                                    conflictDate,
                                                                    type,
                                                                    conflictTime,
                                                                    conflictDuration,
                                                                    onClose,
                                                                    onRescheduled,
                                                                    onCancelled,
                                                                }) => {
    const {data, loading, error, fetch, clear} = useRescheduleOptions();
    const [selected, setSelected] = useState<Option | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    useEffect(() => {
        void fetch(scheduleId, conflictDate, type);
        return () => clear();
    }, [scheduleId, studentId, conflictDate, type, fetch, clear]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long',
        });

    const formatDateShort = (dateStr: string) =>
        new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'short', day: '2-digit', month: 'short',
        });

    const handleReschedule = async () => {
        if (!selected) return;
        setConfirming(true);
        // TODO: chamar scheduleService.reschedule(scheduleId, selected.date)
        await new Promise(res => setTimeout(res, 500));
        setConfirming(false);
        onRescheduled(scheduleId, selected.date);
    };

    const handleCancel = async () => {
        setCancelling(true);
        // TODO: chamar scheduleService.cancel(scheduleId)
        await new Promise(res => setTimeout(res, 500));
        setCancelling(false);
        onCancelled(scheduleId);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2 className={styles.title}>Remarcar aula</h2>
                        <p className={styles.subtitle}>
                            {data?.studentName
                                ? `${data.studentName} — escolha uma nova data`
                                : 'Escolha uma nova data para a aula em conflito'}
                        </p>
                    </div>
                    <button type="button" className={styles.closeBtn} onClick={onClose}>
                        <X size={15}/>
                    </button>
                </div>

                {/* Aula atual */}
                <div className={styles.currentClass}>
                    <div className={styles.currentLabel}>Aula em conflito</div>
                    <div className={styles.currentInfo}>
                        <span className={styles.currentRow}>
                            <Calendar size={13} className={styles.icon}/>
                            {formatDate(data?.currentDate ?? conflictDate)}
                        </span>
                        <span className={styles.currentRow}>
                            <Clock size={13} className={styles.icon}/>
                            {conflictTime.substring(0, 5)} — {conflictDuration} min
                        </span>
                    </div>
                </div>

                {/* Opções de remarcação */}
                <div className={styles.body}>
                    <div className={styles.optionsLabel}>Próximas datas disponíveis</div>

                    {loading ? (
                        <div className={styles.loadingWrap}>
                            <div className={styles.loadingDot}/>
                            <div className={styles.loadingDot} style={{animationDelay: '0.15s'}}/>
                            <div className={styles.loadingDot} style={{animationDelay: '0.30s'}}/>
                        </div>
                    ) : error ? (
                        <p className={styles.errorText}>{error}</p>
                    ) : (
                        <div className={styles.options}>
                            {data?.options.map(opt => {
                                const id = `${opt.date}-${opt.time}`;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`${styles.optionCard} ${selected && `${selected.date}-${selected.time}` === id ? styles.optionCardSelected : ''}`}
                                        onClick={() => setSelected(opt)}
                                    >
                                        <div className={styles.optionDate}>{formatDateShort(opt.date)}</div>
                                        <div className={styles.optionTime}>
                                            {opt.time.substring(0, 5)} · {data.durationMin} min
                                        </div>
                                        {selected && `${selected.date}-${selected.time}` === id && (
                                            <Check size={20} className={styles.optionCheck} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Confirmação de cancelamento */}
                {confirmCancel && (
                    <div className={styles.cancelConfirm}>
                        <AlertTriangle size={14} className={styles.warnIcon}/>
                        <span>Tem certeza? A aula será cancelada.</span>
                        <button
                            type="button"
                            className={styles.cancelConfirmBtn}
                            onClick={handleCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                        </button>
                        <button
                            type="button"
                            className={styles.cancelBackBtn}
                            onClick={() => setConfirmCancel(false)}
                        >
                            Voltar
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelClassBtn}
                        onClick={() => setConfirmCancel(true)}
                        disabled={cancelling || confirmCancel}
                    >
                        Cancelar aula
                    </button>

                    <div className={styles.footerRight}>
                        <button type="button" className={styles.backBtn} onClick={onClose}>
                            Voltar
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={handleReschedule}
                            disabled={!selected || confirming}
                        >
                            {confirming ? 'Salvando...' : 'Confirmar remarcação'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};