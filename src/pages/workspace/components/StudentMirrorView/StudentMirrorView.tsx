import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { WorkspaceActivity } from '@/types/workspace.types';
import styles from './StudentMirrorView.module.css';

interface StudentMirrorViewProps {
    activity: WorkspaceActivity | null;
}

export const StudentMirrorView: React.FC<StudentMirrorViewProps> = ({ activity }) => {
    const { isStudentOnline, studentHtml, studentTitle, requestReconnect, isReconnecting } = useWebRTC();

    const displayTitle = studentTitle ?? activity?.title ?? '';

    /* ── Aluno offline ──────────────────────────────────────────────── */
    if (!isStudentOnline) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.waitingState}>
                    <span className={styles.waitingIcon}>🕐</span>
                    <p className={styles.waitingTitle}>Aguardando aluno...</p>
                    <p className={styles.waitingSubtitle}>
                        O conteúdo aparecerá aqui assim que o aluno se conectar e iniciar a atividade.
                    </p>
                    <div className={styles.dots}>
                        <span /><span /><span />
                    </div>
                    <button
                        type="button"
                        className={styles.reconnectBtn}
                        onClick={requestReconnect}
                        disabled={isReconnecting}
                    >
                        <RefreshCw size={14} className={isReconnecting ? styles.spinning : ''} />
                        {isReconnecting ? 'Reconectando...' : 'Tentar reconectar'}
                    </button>
                </div>
            </div>
        );
    }

    /* ── Aluno online — sempre mostra a área de preview ─────────────── */
    return (
        <div className={styles.wrapper}>
            <div className={styles.topBar}>
                <h2 className={styles.activityTitle}>{displayTitle}</h2>
                <span className={styles.onlineBadge}>Aluno online</span>
            </div>
            {studentHtml ? (
                <div className={styles.previewScroll}>
                    <div
                        className={styles.previewContent}
                        /* eslint-disable-next-line react/no-danger */
                        dangerouslySetInnerHTML={{ __html: studentHtml }}
                    />
                </div>
            ) : (
                /* Canal acabou de abrir, aguarda o broadcaster re-enviar */
                <div className={styles.waitingState}>
                    <div className={styles.dots}>
                        <span /><span /><span />
                    </div>
                </div>
            )}
        </div>
    );
};
