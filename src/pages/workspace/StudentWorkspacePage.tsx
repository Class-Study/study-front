import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '@/hooks/useAuth';
import {useMyWorkspace} from '@/hooks/useMyWorkspace';
import {useWorkspaceBase} from '@/hooks/useWorkspaceBase';
import {useWS} from '@/contexts/WSContext';
import {WorkspaceShell} from './components/WorkspaceShell/WorkspaceShell';
import {WorkspaceSidebar} from './components/WorkspaceSidebar/WorkspaceSidebar';
import {WorkspaceEditor} from './components/WorkspaceEditor/WorkspaceEditor';
import {WorkspaceChat} from './components/WorkspaceChat/WorkspaceChat';
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import {Header} from '@/components/layout/Header/Header';
import {WorkspaceActivity} from '@/types/workspace.types';
import styles from './WorkspacePage.module.css';

/* ─── Student Workspace ───────────────────────────────────────────────────── */

const StudentWorkspacePage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {wsRef, isConnected} = useWS();

    // ── Dados específicos do aluno ────────────────────────────────────────────
    const {
        workspace,
        studentId,
        studentName,
        teacherName,
        teacherOnline,
        loading,
        error,
        accessDenied,
        saving,
        saveContent,
        moveActivity,
        workspaceActivities,
        exerciseFolders,
        fetchWorkspace,
    } = useMyWorkspace();

    const allActivities = useMemo(
        () => workspace?.folders.flatMap((f) => f.activities) ?? [],
        [workspace],
    );

    // ── Hook pai — toda lógica compartilhada ──────────────────────────────────
    const ws = useWorkspaceBase({
        sidebarStorageKey: 'workspace.student.sidebar.width',
        wsRef,
        reconnectSignal: isConnected, // re-registra listener ao reconectar
    });

    // ── Estado exclusivo do aluno ─────────────────────────────────────────────
    const [isEditingNewWorkspace, setIsEditingNewWorkspace] = useState(false);
    const [newWorkspaceTitle, setNewWorkspaceTitle] = useState(
        `Novo Workspace - ${new Date().toLocaleDateString('pt-BR')}`,
    );
    const [newWorkspaceContent, setNewWorkspaceContent] = useState('<p></p>');
    const [workspaceDraftFeedback, setWorkspaceDraftFeedback] = useState<string | null>(null);

    // ── Efeitos ───────────────────────────────────────────────────────────────
    useEffect(() => {
        void fetchWorkspace();
    }, [fetchWorkspace]);

    useEffect(() => {
        if (accessDenied) {
            navigate('/account-inactive', {replace: true});
        }
    }, [accessDenied, navigate]);

    // Auto-seleciona primeira atividade
    useEffect(() => {
        if (!ws.activeActivity && allActivities.length > 0) {
            ws.setActiveActivity(allActivities[0]);
        }
    }, [ws.activeActivity, allActivities]);

    // Mantém atividade ativa sincronizada após reload do workspace
    useEffect(() => {
        if (!ws.activeActivity) return;
        const updated = allActivities.find((a) => a.id === ws.activeActivity!.id);
        if (updated && updated !== ws.activeActivity) ws.setActiveActivity(updated);
    }, [ws.activeActivity, allActivities]);

    // ── Derivados ─────────────────────────────────────────────────────────────
    const workspaceId = ws.activeActivity?.id && studentId
        ? `${ws.activeActivity.id}-${studentId}`
        : null;

    const breadcrumbItems = [
        {label: 'Meu Perfil', path: '/me'},
        {label: studentName || user?.name || 'Aluno', path: '/me'},
        {label: 'Workspace'},
    ];

    const userForChat = useMemo(
        () => ({
            id: user?.id ?? '',
            name: user?.name ?? '',
            email: user?.email ?? '',
            role: user?.role,
        }),
        [user?.id, user?.name, user?.email, user?.role],
    );

    // ── Handlers exclusivos ───────────────────────────────────────────────────
    const handleSelectActivity = (activity: WorkspaceActivity): void => {
        setIsEditingNewWorkspace(false);
        setWorkspaceDraftFeedback(null);
        ws.setActiveActivity(activity);
    };

    const handleCreateWorkspace = (): void => {
        setIsEditingNewWorkspace(true);
        setWorkspaceDraftFeedback(null);
        if (!newWorkspaceTitle.trim()) {
            setNewWorkspaceTitle(`Novo Workspace - ${new Date().toLocaleDateString('pt-BR')}`);
        }
    };

    const handleMoveActivity = async (activityId: string, targetFolderId: string): Promise<void> => {
        const moved = await moveActivity(activityId, targetFolderId);
        if (!moved) alert('Nao foi possivel mover a atividade. Tente novamente.');
    };

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className={styles.page}>
                <Header breadcrumbItems={breadcrumbItems}/>
                <div className={styles.loadingState}>Carregando workspace...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <Header breadcrumbItems={breadcrumbItems}/>
                <div className={styles.errorState}>{error}</div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <WorkspaceShell
            userId={user?.id}
            workspaceId={workspaceId}
            role="student"
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
            pageProps={{'data-student-id': studentId} as React.HTMLAttributes<HTMLDivElement>}
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
                newItemForm={null}
                onChangeNewItemForm={() => {
                }}
                onCreateFolder={() => {
                }}
                onCreateWorkspace={handleCreateWorkspace}
                onOpenUploadForFolder={() => {
                }}
                onMoveActivity={handleMoveActivity}
                readOnly={true}
                allowCreate={false}
                allowMove={true}
                allowWorkspaceMove={false}
                allowCreateWorkspace={true}
                allowCreateFolder={false}
                allowUploadToFolder={false}
            />

            {/* Área do editor — modo rascunho ou atividade */}
            <div className={styles.editorArea}>
                {isEditingNewWorkspace ? (
                    <div className={styles.workspaceContainer}>
                        <div className={styles.workspaceHeaderRow}>
                            <input
                                className={styles.workspaceTitleInput}
                                placeholder="Titulo do Workspace..."
                                value={newWorkspaceTitle}
                                onChange={(e) => setNewWorkspaceTitle(e.target.value)}
                            />
                            <div className={styles.workspaceActions}>
                                <button
                                    type="button"
                                    className={styles.workspaceSecondaryBtn}
                                    onClick={() => {
                                        setIsEditingNewWorkspace(false);
                                        setWorkspaceDraftFeedback(null);
                                    }}
                                >
                                    Fechar
                                </button>
                                <button
                                    type="button"
                                    className={styles.workspacePrimaryBtn}
                                    onClick={() => setWorkspaceDraftFeedback('Rascunho salvo localmente.')}
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                        {workspaceDraftFeedback && (
                            <span className={styles.workspaceFeedback}>{workspaceDraftFeedback}</span>
                        )}
                        <div className={styles.workspaceEditorBody}>
                            <DocxPreviewEditor
                                html={newWorkspaceContent}
                                editable={true}
                                onChange={setNewWorkspaceContent}
                            />
                        </div>
                    </div>
                ) : (
                    <WorkspaceEditor
                        activity={ws.activeActivity}
                        editable={ws.activeActivity?.type === 'EXERCISE'}
                        onContentChange={(html) => {
                            if (ws.activeActivity?.id && ws.activeActivity.type === 'EXERCISE') {
                                saveContent(ws.activeActivity.id, html);
                            }
                        }}
                        headerStatus={saving ?
                            <span className={styles.savingIndicator}>Salvando...</span> : null}
                    />
                )}
            </div>

            {/* Painel direito: presença do professor + chat */}
            <div className={`${styles.rightPanel} ${ws.chatVisible ? '' : styles.rightPanelHidden}`}>
                <div className={styles.teacherPresenceSection}>
                    <span className={styles.teacherPresenceLabel}>Professor</span>
                    <div className={styles.teacherPresenceCard}>
                                <span
                                    className={`${styles.teacherPresenceDot} ${teacherOnline ? styles.teacherPresenceDotOnline : styles.teacherPresenceDotOffline}`}
                                    aria-hidden="true"
                                />
                        <div className={styles.teacherPresenceInfo}>
                            <span className={styles.teacherPresenceName}>{teacherName}</span>
                            <span className={styles.teacherPresenceStatus}>
                                        {teacherOnline ? 'Online agora' : 'Offline'}
                                    </span>
                        </div>
                    </div>
                </div>
                <div className={styles.chatSection}>
                    <WorkspaceChat
                        activityTitle={ws.activeActivity?.title ?? ''}
                        messages={ws.messages}
                        onSendMessage={ws.handleSendMessage}
                    />
                </div>
            </div>
        </WorkspaceShell>
    );
};

export {StudentWorkspacePage};
