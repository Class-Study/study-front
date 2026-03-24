import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
import {useStudents} from '@/hooks/useStudents';
import {useWorkspace} from '@/hooks/useWorkspace';
import {useWorkspaceBase, UseWorkspaceBaseReturn} from '@/hooks/useWorkspaceBase';
import {useRightPanelResize} from '@/hooks/useRightPanelResize';
import {useVerticalResize} from '@/hooks/useVerticalResize';
import {useWS} from '@/contexts/WSContext';
import {useWebRTC} from '@/contexts/WebRTCContext';
import {WorkspaceShell} from './components/WorkspaceShell/WorkspaceShell';
import {StudentMirrorView} from './components/StudentMirrorView/StudentMirrorView';
import {WorkspaceChat} from './components/WorkspaceChat/WorkspaceChat';
import {WorkspaceNotes} from './components/WorkspaceNotes/WorkspaceNotes';
import {ActivityPickerModal} from './components/ActivityPickerModal/ActivityPickerModal';
import {Header} from '@/components/layout/Header/Header';
import {WorkspaceActivity} from '@/types/workspace.types';
import styles from './WorkspacePage.module.css';

/* ─── Painel direito do professor (dentro do WebRTCProvider) ───────────────── */

interface ProfessorRightPanelProps {
    ws: UseWorkspaceBaseReturn;
    targetStudentId: string;
    rightWidth: number;
    onRightResizeStart: (e: React.MouseEvent) => void;
    chatPercent: number;
    onVerticalResizeStart: (e: React.MouseEvent) => void;
}

/**
 * Componente renderizado DENTRO do WorkspaceShell (e portanto dentro do WebRTCProvider).
 * Usa useWebRTC() para saber se o aluno está online e qual atividade ele definiu.
 * O chat fica desabilitado até o aluno se conectar e definir uma atividade.
 */
const ProfessorRightPanel: React.FC<ProfessorRightPanelProps> = ({
    ws,
    targetStudentId,
    rightWidth,
    onRightResizeStart,
    chatPercent,
    onVerticalResizeStart,
}) => {
    const {isStudentOnline, studentActivityId, studentTitle, requestReconnect, isReconnecting} = useWebRTC();

    // A atividade é definida pelo aluno via WebRTC
    const chatActivityTitle = studentTitle ?? ws.activeActivity?.title ?? '';
    const chatDisabled = !isStudentOnline || !studentActivityId;

    // Quando o aluno envia o activityId via WebRTC, atualiza a atividade ativa do chat
    useEffect(() => {
        if (studentActivityId) {
            ws.setActiveActivity((prev) => {
                if (prev?.id === studentActivityId) return prev;
                return {
                    id: studentActivityId,
                    title: studentTitle ?? prev?.title ?? '',
                    type: 'EXERCISE',
                    convertedHtml: '',
                    folderId: '',
                    createdAt: '',
                };
            });
        }
    }, [studentActivityId, studentTitle]);

    return (
        <div
            data-right-panel="true"
            className={`${styles.rightPanel} ${!ws.chatVisible ? styles.rightPanelHidden : ''}`}
            style={ws.chatVisible ? {width: `${rightWidth}px`, minWidth: `${rightWidth}px`, flexShrink: 0} : undefined}
        >
            {/* Handle de resize horizontal — esquerda do painel */}
            {ws.chatVisible && (
                <div className={styles.rightResizeHandle} onMouseDown={onRightResizeStart} />
            )}

            <div className={styles.chatSection} style={{height: `${chatPercent}%`, flex: 'none'}}>
                <WorkspaceChat
                    activityTitle={chatActivityTitle}
                    messages={ws.messages}
                    onSendMessage={ws.handleSendMessage}
                    disabled={chatDisabled}
                    disabledMessage={
                        !isStudentOnline
                            ? 'Aguardando conexão com o aluno...'
                            : 'Aguardando o aluno selecionar uma atividade...'
                    }
                    onReconnect={!isStudentOnline ? requestReconnect : undefined}
                    isReconnecting={isReconnecting}
                />
            </div>

            {/* Handle de resize vertical — entre chat e notas */}
            <div className={styles.verticalResizeHandle} onMouseDown={onVerticalResizeStart} />

            <div className={styles.notesSection} style={{height: `${100 - chatPercent}%`, flex: 'none'}}>
                <WorkspaceNotes
                    activityTitle={chatActivityTitle}
                    studentId={targetStudentId}
                />
            </div>
        </div>
    );
};

/* ─── Professor Workspace ─────────────────────────────────────────────────── */

const ProfessorWorkspacePage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {studentId} = useParams<{ studentId: string }>();
    const {wsRef} = useWS();
    const {getStudentById} = useStudents();

    const isStudent = user?.role === 'STUDENT';
    const targetStudentId = studentId ?? user?.id ?? '';
    const teacherId = user?.id ?? '';

    // ── Dados específicos do professor ────────────────────────────────────────
    const {
        workspace,
        workspaceActivities,
        loading,
        error,
        accessDenied,
        fetchWorkspace,
        createActivity,
    } = useWorkspace(targetStudentId, isStudent);

    // ── Hook pai
    const ws = useWorkspaceBase({
        sidebarStorageKey: 'workspace.sidebar.width',
        wsRef,
        // professor não reconecta — listener registrado apenas 1 vez
    });

    // ── Resize do painel direito ───────────────────────────────────────────────
    const {width: rightWidth, handleResizeStart: handleRightResizeStart} = useRightPanelResize({
        storageKey: 'workspace.professor.right.width',
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 600,
    });

    const {chatPercent, handleVerticalResizeStart} = useVerticalResize({
        storageKey: 'workspace.professor.chat.percent',
        defaultPercent: 55,
    });

    // ── Estado exclusivo do professor ─────────────────────────────────────────
    const [studentName, setStudentName] = useState('');
    const [activityPickerOpen, setActivityPickerOpen] = useState(false);

    // ── Efeitos ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (accessDenied) navigate(isStudent ? '/account-inactive' : '/access-denied', {replace: true});
    }, [accessDenied]);

    useEffect(() => {
        fetchWorkspace();
    }, [fetchWorkspace, targetStudentId]);

    useEffect(() => {
        if (!targetStudentId) return;
        if (isStudent) {
            setStudentName(user?.name ?? 'Aluno');
            return;
        }
        getStudentById(targetStudentId)
            .then((s) => setStudentName(s.name))
            .catch(() => {
            });
    }, [isStudent, targetStudentId]);

    // ── Derivados ─────────────────────────────────────────────────────────────
    // Conexão WS+WebRTC é baseada em studentId + teacherId (não depende da atividade)
    const workspaceId = targetStudentId && teacherId
        ? `${targetStudentId}-${teacherId}`
        : null;

    const breadcrumbItems = [
        {label: isStudent ? 'Meu Perfil' : 'Dashboard', path: isStudent ? '/student/profile' : '/dashboard'},
        {label: studentName || 'Aluno', path: isStudent ? '/student/profile' : `/dashboard/student/${targetStudentId}`},
        {label: 'Workspace'},
    ];

    const userForChat = {id: user?.id, name: user?.name, email: user?.email, role: user?.role};

    // ── Handlers exclusivos ───────────────────────────────────────────────────
    const handleSelectActivity = (activity: WorkspaceActivity): void => {
        ws.setActiveActivity(activity);
    };

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) return <div>Carregando...</div>;

    if (error) return (
        <div className={styles.page}>
            <Header breadcrumbItems={breadcrumbItems}/>
            <div className={styles.errorState}>{error}</div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <WorkspaceShell
            userId={user?.id}
            workspaceId={workspaceId}
            role="teacher"
            breadcrumbItems={breadcrumbItems}
            activityId={ws.activeActivity?.id ?? null}
            userForChat={userForChat}
            messagesRef={ws.messagesRef}
            sendMessageRef={ws.sendMessageRef}
            addIncomingRef={ws.addIncomingRef}
            onMessagesChange={ws.handleMessagesChange}
            sidebarCollapsed={ws.sidebarCollapsed}
            setSidebarCollapsed={ws.setSidebarCollapsed}
            chatVisible={ws.chatVisible}
            setChatVisible={ws.setChatVisible}
            bodyRef={ws.bodyRef}
            topBar={
                <>
                    {/* Modal de seleção de atividade */}
                    <ActivityPickerModal
                        isOpen={activityPickerOpen}
                        onClose={() => setActivityPickerOpen(false)}
                        folders={workspace?.folders ?? []}
                        workspaces={workspaceActivities}
                        activeActivityId={ws.activeActivity?.id ?? null}
                        onSelectActivity={handleSelectActivity}
                        onCreateActivity={async (folderId, payload) =>
                            createActivity(
                                folderId,
                                payload.title,
                                payload.type as 'EXERCISE' | 'WORKSPACE',
                                payload.convertedHtml,
                                payload.originalFilename,
                            )
                        }
                        onAfterSave={fetchWorkspace}
                    />

                    {/* Barra com botão para abrir o picker — substitui a sidebar */}
                    <div className={styles.activityPickerBar}>
                        <button
                            type="button"
                            className={styles.activityPickerBtn}
                            onClick={() => setActivityPickerOpen(true)}
                        >📂 Visualizar Atividades
                        </button>
                    </div>
                </>
            }
        >
            <div className={styles.editorArea}>
                <StudentMirrorView activity={ws.activeActivity} />
            </div>

            {/* Painel direito: chat + notas — usa useWebRTC internamente */}
            <ProfessorRightPanel
                ws={ws}
                targetStudentId={targetStudentId}
                rightWidth={rightWidth}
                onRightResizeStart={handleRightResizeStart}
                chatPercent={chatPercent}
                onVerticalResizeStart={handleVerticalResizeStart}
            />
        </WorkspaceShell>
    );
};

export {ProfessorWorkspacePage};