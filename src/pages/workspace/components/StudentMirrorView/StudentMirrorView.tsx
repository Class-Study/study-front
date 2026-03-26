import React, { useEffect, useRef } from 'react';
import { RefreshCw, CalendarClock } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { WorkspaceActivity } from '@/types/workspace.types';
import { ClassTimerState } from '@/hooks/useClassTimer';
import styles from './StudentMirrorView.module.css';

interface StudentMirrorViewProps {
    activity: WorkspaceActivity | null;
    timer: ClassTimerState;
}

export const StudentMirrorView: React.FC<StudentMirrorViewProps> = ({ activity, timer }) => {
    const {
        isStudentOnline,
        studentHtml,
        studentTitle,
        studentCursor,
        studentScroll,
        requestReconnect,
        isReconnecting,
    } = useWebRTC();

    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const displayTitle = studentTitle ?? activity?.title ?? '';

    // ── Scroll sync (proporcional) ──────────────────────────────────
    useEffect(() => {
        if (!studentScroll || !scrollRef.current) return;

        const el = scrollRef.current;
        const { scrollTop, scrollHeight, clientHeight } = studentScroll;

        const studentMax = scrollHeight - clientHeight;
        if (studentMax <= 0) {
            el.scrollTop = 0;
            return;
        }

        const ratio = scrollTop / studentMax;
        const myMax = el.scrollHeight - el.clientHeight;
        el.scrollTop = ratio * myMax;
    }, [studentScroll]);

    // ── Cursor via TreeWalker + Range ────────────────────────────────
    useEffect(() => {
        if (!studentCursor || !contentRef.current || !cursorRef.current) return;

        const container = contentRef.current;
        const cursorEl = cursorRef.current;
        const { from } = studentCursor;

        // Percorre apenas nós de texto — mesma contagem usada no WorkspaceEditor
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let currentPos = 0;
        let targetNode: Node | null = null;
        let targetOffset = 0;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const length = node.textContent?.length ?? 0;
            if (currentPos + length >= from) {
                targetNode = node;
                targetOffset = from - currentPos;
                break;
            }
            currentPos += length;
        }

        if (!targetNode) {
            cursorEl.style.visibility = 'hidden';
            return;
        }

        try {
            const textLen = targetNode.textContent?.length ?? 0;
            const range = document.createRange();

            if (targetOffset < textLen) {
                // Expandir para frente
                range.setStart(targetNode, targetOffset);
                range.setEnd(targetNode, targetOffset + 1);
            } else if (targetOffset > 0) {
                // No fim do nó: expandir para trás
                range.setStart(targetNode, targetOffset - 1);
                range.setEnd(targetNode, targetOffset);
            } else {
                range.setStart(targetNode, 0);
                range.setEnd(targetNode, 0);
            }

            const rect = range.getBoundingClientRect();
            if (rect.height === 0 && rect.width === 0) {
                cursorEl.style.visibility = 'hidden';
                return;
            }

            const containerRect = container.getBoundingClientRect();

            const top = rect.top - containerRect.top;
            // Se expandimos para trás, usar o lado direito do rect
            const left = (targetOffset < textLen)
                ? rect.left - containerRect.left
                : rect.right - containerRect.left;

            cursorEl.style.visibility = 'visible';
            cursorEl.style.transform = `translate(${left}px, ${top}px)`;

            // Altura do cursor proporcional à fonte local
            const barEl = cursorEl.querySelector(`.${styles.remoteCursorBar}`) as HTMLElement | null;
            if (barEl) barEl.style.height = `${rect.height}px`;

            // Blink: esconde brevemente e reaparece para dar feedback visual
            cursorEl.style.opacity = '0';
            if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
            blinkTimerRef.current = setTimeout(() => {
                cursorEl.style.opacity = '1';
            }, 80);
        } catch {
            cursorEl.style.visibility = 'hidden';
        }
    }, [studentCursor, studentHtml]);

    /* ── Aluno offline ──────────────────────────────────────────────── */
    if (!isStudentOnline) {
        // Fora da janela de conexão (antes ou depois da aula + grace)
        if (!timer.isConnectionAllowed) {
            return (
                <div className={styles.wrapper}>
                    <div className={styles.waitingState}>
                        <CalendarClock size={36} className={styles.waitingIconSvg} />
                        <p className={styles.waitingTitle}>
                            {timer.isEnded ? 'Aula encerrada' : 'Fora do horário de aula'}
                        </p>
                        <p className={styles.waitingSubtitle}>
                            {timer.isEnded
                                ? 'A aula de hoje já foi encerrada.'
                                : timer.nextLabel || 'Nenhuma aula agendada para hoje.'}
                        </p>
                    </div>
                </div>
            );
        }

        // Dentro da janela de conexão — aguardando aluno
        return (
            <div className={styles.wrapper}>
                <div className={styles.waitingState}>
                    <span className={styles.waitingIcon}>🕐</span>
                    <p className={styles.waitingTitle}>Aguardando aluno...</p>
                    <p className={styles.waitingSubtitle}>
                        {timer.isClassTime
                            ? 'O conteúdo aparecerá aqui assim que o aluno se conectar e iniciar a atividade.'
                            : timer.nextLabel /* "Encerrando conexão em X min" */}
                    </p>
                    <div className={styles.dots}><span /><span /><span /></div>
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

    /* ── Aluno online ───────────────────────────────────────────────── */
    const cursorName = studentCursor?.userName ?? 'Aluno';

    return (
        <div className={styles.wrapper}>
            <div className={styles.topBar}>
                <h2 className={styles.activityTitle}>{displayTitle}</h2>
                <span className={styles.onlineBadge}>Aluno online</span>
            </div>

            {studentHtml ? (
                <div ref={scrollRef} className={styles.previewScroll}>
                    <div className={styles.previewContentWrapper}>
                        <div
                            ref={contentRef}
                            className={styles.previewContent}
                            dangerouslySetInnerHTML={{ __html: studentHtml }}
                        />
                        {/* Cursor remoto do aluno */}
                        <div
                            ref={cursorRef}
                            className={styles.remoteCursor}
                            data-name={cursorName}
                        >
                            <div className={styles.remoteCursorBar} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.waitingState}>
                    <div className={styles.dots}><span /><span /><span /></div>
                </div>
            )}
        </div>
    );
};
