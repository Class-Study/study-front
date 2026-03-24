import React from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import styles from '../../WorkspacePage.module.css';

interface TeacherPresencePanelProps {
    /** Nome do professor vindo da API */
    teacherName: string;
    /** Status online vindo da API (fallback quando WebRTC não conectado) */
    teacherOnlineApi: boolean;
}

/**
 * Renderizado DENTRO do WorkspaceShell (e portanto dentro do WebRTCProvider).
 * Combina o status da API com o status real-time do DataChannel WebRTC:
 *  - Se o canal WebRTC estiver aberto → professor definitivamente online
 *  - Caso contrário → usa o status da API (poll 30s)
 */
export const TeacherPresencePanel: React.FC<TeacherPresencePanelProps> = ({
    teacherName,
    teacherOnlineApi,
}) => {
    const { isChannelOpen } = useWebRTC();

    // Canal WebRTC aberto é a prova definitiva que o professor está na sessão
    const isOnline = isChannelOpen || teacherOnlineApi;

    return (
        <div className={styles.teacherPresenceSection}>
            <span className={styles.teacherPresenceLabel}>Professor</span>
            <div className={styles.teacherPresenceCard}>
                <span
                    className={`${styles.teacherPresenceDot} ${
                        isOnline
                            ? styles.teacherPresenceDotOnline
                            : styles.teacherPresenceDotOffline
                    }`}
                    aria-hidden="true"
                />
                <div className={styles.teacherPresenceInfo}>
                    <span className={styles.teacherPresenceName}>{teacherName}</span>
                    <span className={styles.teacherPresenceStatus}>
                        {isChannelOpen
                            ? 'Na sessão agora'
                            : isOnline
                                ? 'Online agora'
                                : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
    );
};

