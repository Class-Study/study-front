import React, { useCallback, useEffect, useRef } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { WorkspaceActivity } from '@/types/workspace.types';
import { CursorPosition, ScrollPosition } from '../WorkspaceEditor/WorkspaceEditor';

interface StudentActivityBroadcasterProps {
    /** Atividade ativa do aluno */
    activity: WorkspaceActivity | null;
    /** Nome do aluno (enviado com cursor para exibir no lado do professor) */
    studentName?: string;
    /** Registra um callback que o pai pode chamar para enviar atualizações de conteúdo */
    onRegisterContentSender?: (sender: ((html: string) => void) | null) => void;
    onRegisterCursorSender?: (sender: ((pos: CursorPosition) => void) | null) => void;
    onRegisterScrollSender?: (sender: ((pos: ScrollPosition) => void) | null) => void;
}

/**
 * Componente invisível que envia informações da atividade ativa do aluno
 * para o professor via WebRTC (DataChannel).
 *
 * Quando o aluno seleciona/troca de atividade, envia:
 *   { type: "html-update", activityId, title, html }
 *
 * Renderizado DENTRO do WorkspaceShell para ter acesso ao WebRTCProvider.
 */
export const StudentActivityBroadcaster: React.FC<StudentActivityBroadcasterProps> = ({
    activity,
    studentName,
    onRegisterContentSender,
    onRegisterCursorSender,
    onRegisterScrollSender,
}) => {
    const { send, isChannelOpen } = useWebRTC();
    const activityRef = useRef(activity);
    activityRef.current = activity;

    // Envia info da atividade ao trocar de atividade
    useEffect(() => {
        if (!activity) return;
        send({
            type: 'html-update',
            activityId: activity.id,
            title: activity.title,
            html: activity.convertedHtml,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activity?.id, send]);

    // Re-envia quando o canal abre (reconexão do professor)
    useEffect(() => {
        if (!isChannelOpen) return;
        const act = activityRef.current;
        if (!act) return;
        console.log('[WebRTC] Canal aberto — re-enviando atividade ao professor');
        send({
            type: 'html-update',
            activityId: act.id,
            title: act.title,
            html: act.convertedHtml,
        });
    }, [isChannelOpen, send]);

    // ── Senders registráveis ──────────────────────────────────────────────────

    const sendContentUpdate = useCallback((html: string) => {
        const act = activityRef.current;
        if (!act) return;
        send({
            type: 'html-update',
            activityId: act.id,
            title: act.title,
            html,
        });
    }, [send]);

    const sendCursorUpdate = useCallback((pos: CursorPosition) => {
        send({ type: 'cursor-update', from: pos.from, to: pos.to, userName: studentName ?? 'Aluno' });
    }, [send, studentName]);

    const sendScrollUpdate = useCallback((pos: ScrollPosition) => {
        send({
            type: 'scroll-update',
            scrollTop: pos.scrollTop,
            scrollHeight: pos.scrollHeight,
            clientHeight: pos.clientHeight,
        });
    }, [send]);

    useEffect(() => {
        onRegisterContentSender?.(sendContentUpdate);
        return () => onRegisterContentSender?.(null);
    }, [sendContentUpdate, onRegisterContentSender]);

    useEffect(() => {
        onRegisterCursorSender?.(sendCursorUpdate);
        return () => onRegisterCursorSender?.(null);
    }, [sendCursorUpdate, onRegisterCursorSender]);

    useEffect(() => {
        onRegisterScrollSender?.(sendScrollUpdate);
        return () => onRegisterScrollSender?.(null);
    }, [sendScrollUpdate, onRegisterScrollSender]);

    return null;
};
