import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';
import {Header} from '@/components/layout/Header/Header';
import {WebRTCProvider} from '@/contexts/WebRTCContext';
import {ChatBridge} from "./components/chat/ChatBridge";
import DocxPreviewEditor from '@/components/ui/DocxPreviewEditor/DocxPreviewEditor';
import {useAuth} from '@/hooks/useAuth';
import {useMyWorkspace} from '@/hooks/useMyWorkspace';
import {WorkspaceSidebar} from './components/WorkspaceSidebar/WorkspaceSidebar';
import {WorkspaceEditor} from './components/WorkspaceEditor/WorkspaceEditor';
import {WorkspaceChat} from './components/WorkspaceChat/WorkspaceChat';
import {WorkspaceActivity} from '@/types/workspace.types';
import {ChatMessage} from '@/types/chat.types';
import styles from './WorkspacePage.module.css';
import {useWS, WSProvider} from "@/contexts/WSContext.tsx";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = 'workspace.student.sidebar.width';

/* ================================================= */

export const StudentWorkspacePage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {wsRef, isConnected} = useWS();

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

    const [activeActivity, setActiveActivity] = useState<WorkspaceActivity | null>(null);

    const messagesRef = useRef<ChatMessage[]>([]);
    const sendMessageRef = useRef<(content: string) => void>(() => {
    });
    const addIncomingRef = useRef<((data: any) => void) | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const activeActivityIdRef = useRef<string | null>(null);

    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        if (typeof window === 'undefined') return 240;
        const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return 240;
        return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [chatVisible, setChatVisible] = useState(true);
    const [isEditingNewWorkspace, setIsEditingNewWorkspace] = useState(false);
    const [newWorkspaceTitle, setNewWorkspaceTitle] = useState(
        `Novo Workspace - ${new Date().toLocaleDateString('pt-BR')}`,
    );
    const [newWorkspaceContent, setNewWorkspaceContent] = useState('<p></p>');
    const [workspaceDraftFeedback, setWorkspaceDraftFeedback] = useState<string | null>(null);

    const bodyRef = useRef<HTMLDivElement | null>(null);
    const isResizingRef = useRef(false);

    // ─── Fetch workspace na montagem ─────────────────────────────────────────
    useEffect(() => {
        void fetchWorkspace();
    }, [fetchWorkspace]);

    // ─── Redireciona se acesso negado ─────────────────────────────────────────
    useEffect(() => {
        if (accessDenied) {
            navigate('/account-inactive', {replace: true});
        }
    }, [accessDenied, navigate]);

    // ─── Seleciona primeira atividade ao carregar ─────────────────────────────
    const allActivities = useMemo(
        () => workspace?.folders.flatMap((folder) => folder.activities) ?? [],
        [workspace],
    );

    useEffect(() => {
        if (!activeActivity && allActivities.length > 0) {
            setActiveActivity(allActivities[0]);
        }
    }, [activeActivity, allActivities]);

    useEffect(() => {
        if (!activeActivity) return;
        const updated = allActivities.find((a) => a.id === activeActivity.id);
        if (updated && updated !== activeActivity) setActiveActivity(updated);
    }, [activeActivity, allActivities]);

    // ─── Limpa mensagens ao trocar de atividade ───────────────────────────────
    useEffect(() => {
        if (activeActivity?.id === activeActivityIdRef.current) return;
        activeActivityIdRef.current = activeActivity?.id ?? null;
        messagesRef.current = [];
        setMessages([]);
    }, [activeActivity?.id]);

    // ─── Salva largura da sidebar ─────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    }, [sidebarWidth]);

    // ─── WebSocket listener (re-executa quando isConnected mudar) ────────────
    useEffect(() => {
        if (!wsRef?.current) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                return;
            }

            if (data.type === "chat") {
                if (addIncomingRef.current) {
                    addIncomingRef.current(data);
                }
            }
        };

        wsRef.current.addEventListener("message", handleMessage);

        return () => {
            wsRef.current?.removeEventListener("message", handleMessage);
        };
    }, [isConnected]); // ✅ re-executa quando o WebSocket conectar/desconectar

    // ─── workspaceId para o WebRTCProvider ───────────────────────────────────
    const workspaceId = activeActivity?.id && studentId
        ? `${activeActivity.id}-${studentId}`
        : null;

    const handleMessagesChange = useCallback(() => {
        setMessages([...messagesRef.current]);
    }, []);

    const handleSendMessage = useCallback((content: string) => {
        sendMessageRef.current(content);
    }, []);

    const userForChat = useMemo(
        () => ({
            id: user?.id ?? '',
            name: user?.name ?? '',
            email: user?.email ?? '',
            role: user?.role,
        }),
        [user?.id, user?.name, user?.email, user?.role],
    );

    const breadcrumbItems = [
        {label: 'Meu Perfil', path: '/me'},
        {label: studentName || user?.name || 'Aluno', path: '/me'},
        {label: 'Workspace'},
    ];

    // ─── Sidebar resize ───────────────────────────────────────────────────────
    const stopResizing = useCallback((): void => {
        isResizingRef.current = false;
        window.removeEventListener('mousemove', handleSidebarResize);
        window.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const handleSidebarResize = useCallback((event: MouseEvent): void => {
        if (!isResizingRef.current) return;
        const containerLeft = bodyRef.current?.getBoundingClientRect().left ?? 0;
        const nextWidth = Math.min(
            SIDEBAR_MAX_WIDTH,
            Math.max(SIDEBAR_MIN_WIDTH, event.clientX - containerLeft),
        );
        setSidebarWidth(nextWidth);
    }, []);

    const handleSidebarResizeStart = useCallback((): void => {
        if (sidebarCollapsed) setSidebarCollapsed(false);
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handleSidebarResize);
        window.addEventListener('mouseup', stopResizing);
    }, [sidebarCollapsed, handleSidebarResize, stopResizing]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleSidebarResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [handleSidebarResize, stopResizing]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleSelectActivity = (activity: WorkspaceActivity): void => {
        setIsEditingNewWorkspace(false);
        setWorkspaceDraftFeedback(null);
        setActiveActivity(activity);
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

    // ─── Loading / Error states ───────────────────────────────────────────────
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

    return (
        <WSProvider userId={user?.id} workspaceId={workspaceId ?? undefined}>
            <WebRTCProvider key={workspaceId ?? 'no-workspace'} workspaceId={workspaceId} role="student">
                <ChatBridge
                    activityId={activeActivity?.id ?? null}
                    user={userForChat}
                    messagesRef={messagesRef}
                    sendMessageRef={sendMessageRef}
                    addIncomingRef={addIncomingRef}
                    onMessagesChange={handleMessagesChange}
                />

                <div className={styles.page} data-student-id={studentId}>
                    <Header breadcrumbItems={breadcrumbItems}/>

                    <div className={styles.toolbar}>
                        {sidebarCollapsed && (
                            <button
                                type="button"
                                className={styles.expandSidebarBtn}
                                onClick={() => setSidebarCollapsed(false)}
                                title="Expandir sidebar"
                            >
                                ▶
                            </button>
                        )}
                        <button
                            type="button"
                            className={`${styles.chatToggleBtn} ${chatVisible ? styles.chatToggleBtnActive : ''}`}
                            onClick={() => setChatVisible((v) => !v)}
                        >
                            ⇌ Chat
                        </button>
                    </div>

                    <div className={styles.body} ref={bodyRef}>
                        <WorkspaceSidebar
                            folders={exerciseFolders}
                            workspaces={workspaceActivities}
                            activeActivityId={activeActivity?.id ?? null}
                            width={sidebarWidth}
                            onSelectActivity={handleSelectActivity}
                            collapsed={sidebarCollapsed}
                            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                            onResizeStart={handleSidebarResizeStart}
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
                                    activity={activeActivity}
                                    editable={activeActivity?.type === 'EXERCISE'}
                                    onContentChange={(html) => {
                                        if (activeActivity?.id && activeActivity.type === 'EXERCISE') {
                                            saveContent(activeActivity.id, html);
                                        }
                                    }}
                                    headerStatus={saving ?
                                        <span className={styles.savingIndicator}>Salvando...</span> : null}
                                />
                            )}
                        </div>

                        <div className={`${styles.rightPanel} ${chatVisible ? '' : styles.rightPanelHidden}`}>
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
                                    activityTitle={activeActivity?.title ?? ''}
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </WebRTCProvider>
        </WSProvider>
    );
};

export default StudentWorkspacePage;
