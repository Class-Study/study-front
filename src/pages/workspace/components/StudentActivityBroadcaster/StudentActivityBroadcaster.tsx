import React, { useCallback, useEffect, useRef } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { WorkspaceActivity } from '@/types/workspace.types';

interface StudentActivityBroadcasterProps {
    /** Atividade ativa do aluno */
    activity: WorkspaceActivity | null;
    /** Registra um callback que o pai pode chamar para enviar atualizações de conteúdo */
    onRegisterContentSender?: (sender: ((html: string) => void) | null) => void;
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
    onRegisterContentSender,
}) => {
    const { send } = useWebRTC();
    const activityRef = useRef(activity);
    activityRef.current = activity;

    // Envia info da atividade ao trocar
    useEffect(() => {
        if (!activity) return;

        send({
            type: 'html-update',
            activityId: activity.id,
            title: activity.title,
            html: activity.convertedHtml,
        });
    }, [activity?.id, send]);

    // Registra função para enviar atualizações de conteúdo (chamada pelo WorkspaceEditor onContentChange)
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

    useEffect(() => {
        onRegisterContentSender?.(sendContentUpdate);
        return () => onRegisterContentSender?.(null);
    }, [sendContentUpdate, onRegisterContentSender]);

    return null;
};



