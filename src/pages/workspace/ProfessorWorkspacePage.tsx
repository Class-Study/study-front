import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
import {useStudents} from '@/hooks/useStudents';
import {useWorkspace} from '@/hooks/useWorkspace';
import {useWorkspaceBase} from '@/hooks/useWorkspaceBase';
import {useWS} from '@/contexts/WSContext';
import {WorkspaceShell} from './components/WorkspaceShell/WorkspaceShell';
import {WorkspaceSidebar} from './components/WorkspaceSidebar/WorkspaceSidebar';
import {WorkspaceEditor} from './components/WorkspaceEditor/WorkspaceEditor';
import {WorkspaceChat} from './components/WorkspaceChat/WorkspaceChat';
import {WorkspaceNotes} from './components/WorkspaceNotes/WorkspaceNotes';
import {Header} from '@/components/layout/Header/Header';
import {WorkspaceActivity} from '@/types/workspace.types';
import styles from './WorkspacePage.module.css';

/* ─── Professor Workspace ─────────────────────────────────────────────────── */

const ProfessorWorkspacePage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {studentId} = useParams<{ studentId: string }>();
    const {wsRef} = useWS();
    const {getStudentById} = useStudents();

    const isStudent = user?.role === 'STUDENT';
    const targetStudentId = studentId ?? user?.id ?? '';

    // ── Dados específicos do professor ────────────────────────────────────────
    const {
        workspaceActivities,
        exerciseFolders,
        loading,
        error,
        accessDenied,
        fetchWorkspace,
        saveContent,
        createFolder,
        moveActivity,
    } = useWorkspace(targetStudentId, isStudent);

    const allActivities = useMemo(
        () => [
            ...workspaceActivities,
            ...exerciseFolders.flatMap((f) => f.activities),
        ],
        [workspaceActivities, exerciseFolders],
    );

    // ── Hook pai — toda lógica compartilhada ──────────────────────────────────
    const ws = useWorkspaceBase({
        sidebarStorageKey: 'workspace.sidebar.width',
        wsRef,
        // professor não reconecta — listener registrado apenas 1 vez
    });

    // ── Estado exclusivo do professor ─────────────────────────────────────────
    const [newItemForm, setNewItemForm] = useState<{ title: string } | null>(null);
    const [studentName, setStudentName] = useState('');

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

    // Auto-seleciona primeira atividade
    useEffect(() => {
        if (!ws.activeActivity && allActivities.length > 0) {
            ws.setActiveActivity(workspaceActivities[0] ?? allActivities[0]);
        }
    }, [ws.activeActivity, allActivities]);

    // ── Derivados ─────────────────────────────────────────────────────────────
    const workspaceId = ws.activeActivity?.id ? `${ws.activeActivity.id}-${targetStudentId}` : null;

    const breadcrumbItems = [
        {label: isStudent ? 'Meu Perfil' : 'Dashboard', path: isStudent ? '/student/profile' : '/dashboard'},
        {label: studentName || 'Aluno', path: isStudent ? '/student/profile' : `/dashboard/student/${targetStudentId}`},
        {label: 'Workspace'},
    ];

    const userForChat = {id: user?.id, name: user?.name, email: user?.email, role: user?.role};

    // ── Handlers exclusivos ───────────────────────────────────────────────────
    const handleCreateFolder = async (): Promise<void> => {
        if (!newItemForm?.title.trim()) return;
        const folder = await createFolder(newItemForm.title.trim());
        if (folder) setNewItemForm(null);
    };

    const handleSelectActivity = (activity: WorkspaceActivity): void => {
        ws.setActiveActivity(activity);
    };

    const handleMoveActivity = async (activityId: string, targetFolderId: string): Promise<void> => {
        const moved = await moveActivity(activityId, targetFolderId);
        if (!moved) alert('Nao foi possivel mover a atividade. Tente novamente.');
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
        >
            {/* Sidebar */}
            <WorkspaceSidebar
                folders={exerciseFolders}
                workspaces={workspaceActivities}
                activeActivityId={ws.activeActivity?.id ?? null}
                width={ws.sidebarWidth}
                onSelectActivity={handleSelectActivity}
                collapsed={ws.sidebarCollapsed}
                onToggleCollapse={() => ws.setSidebarCollapsed((p) => !p)}
                onResizeStart={ws.handleSidebarResizeStart}
                newItemForm={newItemForm}
                onChangeNewItemForm={setNewItemForm}
                onCreateFolder={handleCreateFolder}
                onCreateWorkspace={() => {
                }}
                onOpenUploadForFolder={() => {
                }}
                onMoveActivity={handleMoveActivity}
                readOnly={isStudent}
            />

            {/* Editor (somente leitura para o professor) */}
            <div className={styles.editorArea}>
                <WorkspaceEditor
                    activity={ws.activeActivity}
                    editable={false}
                    onContentChange={(html) => {
                        if (ws.activeActivity?.id) saveContent(ws.activeActivity.id, html);
                    }}
                />
            </div>

            {/* Painel direito: chat + notas do professor */}
            <div className={`${styles.rightPanel} ${!ws.chatVisible ? styles.rightPanelHidden : ''}`}>
                <div className={styles.chatSection}>
                    <WorkspaceChat
                        activityTitle={ws.activeActivity?.title ?? ''}
                        messages={ws.messages}
                        onSendMessage={ws.handleSendMessage}
                    />
                </div>
                <div className={styles.notesSection}>
                    <WorkspaceNotes
                        activityTitle={ws.activeActivity?.title ?? ''}
                        studentId={targetStudentId}
                    />
                </div>
            </div>
        </WorkspaceShell>
    );
};

export {ProfessorWorkspacePage};