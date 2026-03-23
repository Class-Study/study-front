import React from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { WorkspaceActivity } from '@/types/workspace.types';
import styles from './StudentMirrorView.module.css';

interface StudentMirrorViewProps {
    activity: WorkspaceActivity | null;
}

/**
 * Exibido no workspace do professor no lugar do WorkspaceEditor.
 *
 * Estados:
 *  - Sem atividade selecionada → pede para selecionar
 *  - Aluno offline             → "Aguardando aluno..."
 *  - Aluno online, sem HTML    → "Aluno conectado, aguardando ações..."
 *  - Aluno online, com HTML    → render do HTML espelhado (read-only)
 */
export const StudentMirrorView: React.FC<StudentMirrorViewProps> = ({ activity }) => {
    const { isStudentOnline, studentHtml, studentTitle } = useWebRTC();

    // Título vem do aluno via WebRTC; enquanto não chega, mostra o da atividade como fallback
    const displayTitle = studentTitle ?? activity?.title ?? '';

    /* ── Sem atividade ──────────────────────────────────────────────── */
    if (!activity) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.waitingState}>
                    <span className={styles.waitingIcon}>📂</span>
                    <p className={styles.waitingTitle}>Nenhuma atividade selecionada</p>
                    <p className={styles.waitingSubtitle}>
                        Use o botão "Visualizar Atividades" para abrir uma atividade.
                    </p>
                </div>
            </div>
        );
    }

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
                </div>
            </div>
        );
    }

    /* ── Aluno online, ainda sem conteúdo ───────────────────────────── */
    if (!studentHtml) {
        return (
            <div className={styles.wrapper}>
            <div className={styles.topBar}>
                <h2 className={styles.activityTitle}>{displayTitle}</h2>
                <span className={styles.onlineBadge}>Aluno online</span>
            </div>
            <div className={styles.waitingState}>
                <span className={styles.waitingIcon}>✏️</span>
                    <p className={styles.waitingTitle}>Aluno conectado</p>
                    <p className={styles.waitingSubtitle}>
                        Aguardando o aluno começar a editar...
                    </p>
                    <div className={styles.dots}>
                        <span /><span /><span />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Aluno online com conteúdo — espelho em tempo real ──────────── */
    return (
        <div className={styles.wrapper}>
            <div className={styles.topBar}>
                <h2 className={styles.activityTitle}>{displayTitle}</h2>
                <span className={styles.onlineBadge}>Aluno online</span>
            </div>
            <div className={styles.previewScroll}>
                <div
                    className={styles.previewContent}
                    /* eslint-disable-next-line react/no-danger */
                    dangerouslySetInnerHTML={{ __html: studentHtml }}
                />
            </div>
        </div>
    );
};





