import React, { useState } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import { ClassDay } from '@/types/student.types';
import { RescheduleModal } from '@/pages/students/components/RescheduleModal/RescheduleModal';

import styles from './ConflictDetailModal.module.css';
import {DayAvailability} from "@/types/schedule.types.ts";

const PT_DAYS: Record<string, string> = {
    SUNDAY: 'Domingo',
    MONDAY: 'Segunda-feira',
    TUESDAY: 'Terça-feira',
    WEDNESDAY: 'Quarta-feira',
    THURSDAY: 'Quinta-feira',
    FRIDAY: 'Sexta-feira',
    SATURDAY: 'Sábado',
};

interface ConflictDetailModalProps {
    day: ClassDay;
    availability: DayAvailability;
    onClose: () => void;
    onViewSchedule: (scheduleId: string, studentId: string) => void;
}

export const ConflictDetailModal: React.FC<ConflictDetailModalProps> = ({
                                                                            day,
                                                                            availability,
                                                                            onClose,
                                                                            onViewSchedule,
                                                                        }) => {

    const [rescheduleTarget, setRescheduleTarget] = useState<{
        scheduleId: string;
        studentId: string;
        conflictDate: string;
        conflictTime: string;
        conflictDuration: number;
        type: string
    } | null>(null);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
        });
    };

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>

                    <div className={styles.header}>
                        <div className={styles.headerInfo}>
                            <span className={`${styles.statusDot} ${styles[availability.status]}`} />
                            <div>
                                <h3 className={styles.title}>
                                    Conflitos — {PT_DAYS[day]}
                                </h3>
                                <p className={styles.subtitle}>
                                    {availability.conflictCount} de {availability.totalClasses} aulas com conflito no período
                                </p>
                            </div>
                        </div>

                        <button type="button" className={styles.closeBtn} onClick={onClose}>
                            <X size={15} />
                        </button>
                    </div>

                    <div className={styles.body}>
                        {availability.conflicts.length === 0 ? (
                            <p className={styles.empty}>Nenhum conflito encontrado.</p>
                        ) : (
                            availability.conflicts.map(conflict => (
                                <div key={`${conflict.scheduleId}-${conflict.date}`} className={styles.conflictItem}>
                                    <div className={styles.conflictInfo}>

                                        <div className={styles.conflictRow}>
                                            <Calendar size={13} className={styles.icon} />
                                            <span className={styles.conflictDate}>
                        {formatDate(conflict.date)}
                      </span>
                                        </div>

                                        <div className={styles.conflictRow}>
                                            <User size={13} className={styles.icon} />
                                            <span className={styles.conflictName}>
                        {conflict.studentName}
                      </span>
                                        </div>

                                        <div className={styles.conflictRow}>
                                            <Clock size={13} className={styles.icon} />
                                            <span className={styles.conflictTime}>
                        {conflict.startTime.substring(0, 5)} — {conflict.durationMin} min
                      </span>
                                        </div>

                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {/* 🆕 botão remarcar */}
                                        <button
                                            type="button"
                                            className={styles.viewBtn}
                                            onClick={() =>
                                                setRescheduleTarget({
                                                    scheduleId: conflict.scheduleId,
                                                    studentId: conflict.studentId,
                                                    conflictDate: conflict.date,
                                                    conflictTime: conflict.startTime,
                                                    conflictDuration: conflict.durationMin,
                                                    type: conflict.type
                                                })
                                            }
                                        >
                                            Remarcar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.footer}>
                        <p className={styles.footerNote}>
                            💡 Você pode remarcar as aulas conflitantes antes de confirmar o cadastro.
                        </p>
                    </div>

                </div>
            </div>

            {/* Modal empilhado */}
            {rescheduleTarget && (
                <RescheduleModal
                    {...rescheduleTarget}
                    onClose={() => setRescheduleTarget(null)}
                    onRescheduled={() => {
                        setRescheduleTarget(null);
                    }}
                    onCancelled={() => {
                        setRescheduleTarget(null);
                    }}
                />
            )}
        </>
    );
};