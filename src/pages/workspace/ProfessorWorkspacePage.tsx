import React, {
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Header} from '@/components/layout/Header/Header';
import studentService from '@/services/api/student.service';
import {useAuth} from '@/hooks/useAuth';
import {useWorkspace} from '@/hooks/useWorkspace';
import {WorkspaceSidebar} from './components/WorkspaceSidebar/WorkspaceSidebar';
import {WorkspaceEditor} from './components/WorkspaceEditor/WorkspaceEditor';
import {WorkspaceChat} from './components/WorkspaceChat/WorkspaceChat';
import {WorkspaceNotes} from './components/WorkspaceNotes/WorkspaceNotes';
import {WorkspaceActivity} from '@/types/workspace.types';
import {ChatMessage} from "@/types/chat.types.ts";
import {useChatMessages} from "@/hooks/useChatMessages";
import {useWebRTC, WebRTCProvider} from "@/contexts/WebRTCContext";
import {useWS} from "@/contexts/WSContext";
import styles from './WorkspacePage.module.css';

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = 'workspace.sidebar.width';

/* ================= CHAT BRIDGE ================= */
// 📍 Componente intermediário que gerencia todo o estado do chat
// Instancia useChatMessages e expõe funções via refs para acesso fora do escopo React

const ChatBridge: React.FC<any> = ({
                                       activityId,
                                       user,
                                       messagesRef,
                                       sendMessageRef,
                                       addIncomingRef,
                                       onMessagesChange,
                                   }) => {
    const {send} = useWebRTC();

    // TODO: useChatMessages retorna {messages, sendMessage, addIncomingMessage}
    const {messages, sendMessage, addIncomingMessage} = useChatMessages({
        activityId,
        user,
        send,
    });

    // TODO: Sincroniza mensagens com o ref (para acesso fora do componente)
    useEffect(() => {
        messagesRef.current = messages;
        onMessagesChange();
    }, [messages, onMessagesChange]);

    // TODO: Expõe sendMessage via ref para WorkspacePage chamar
    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    // TODO: Expõe addIncomingMessage via ref para WebSocket listener chamar
    useEffect(() => {
        addIncomingRef.current = addIncomingMessage;
    }, [addIncomingMessage]);


    return null;
};
/* ================================================= */

const ProfessorWorkspacePage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {studentId} = useParams<{ studentId: string }>();
    const {wsRef} = useWS();

    const isStudent = user?.role === 'STUDENT';
    const targetStudentId = studentId ?? user?.id ?? '';

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

    const [activeActivity, setActiveActivity] = useState<WorkspaceActivity | null>(null);

    const messagesRef = useRef<ChatMessage[]>([]);
    const sendMessageRef = useRef<(content: string) => void>(() => {
    });
    const addIncomingRef = useRef<((data: any) => void) | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const handleMessagesChange = () => {
        setMessages([...messagesRef.current]);
    };

    const handleSendMessage = (content: string) => {

        // Delega para o ref que aponta para useChatMessages.sendMessage
        sendMessageRef.current(content);
    };

    const activeActivityIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (activeActivity?.id === activeActivityIdRef.current) return;

        activeActivityIdRef.current = activeActivity?.id ?? null;

        messagesRef.current = [];
        setMessages([]);
    }, [activeActivity?.id]);

    useEffect(() => {
        if (!wsRef?.current) {
            return;
        }

        // 📍 PASSO 4: PROFESSOR - Recebe mensagem via WebSocket
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
    }, []);
    /* ================================================= */

    const userForChat = {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
    };

    const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
        if (typeof window === 'undefined') return 240;
        const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return 240;
        return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [newItemForm, setNewItemForm] = useState<{ title: string } | null>(
        null,
    );
    const [isEditingNewWorkspace, setIsEditingNewWorkspace] = useState(false);
    const [workspaceDraftFeedback, setWorkspaceDraftFeedback] = useState<string | null>(null);
    const [chatVisible, setChatVisible] = useState(true);
    const [studentName, setStudentName] = useState('');

    const bodyRef = useRef<HTMLDivElement | null>(null);
    const isResizingRef = useRef(false);

    const allActivities = useMemo(
        () => [
            ...workspaceActivities,
            ...exerciseFolders.flatMap((folder) => folder.activities),
        ],
        [exerciseFolders, workspaceActivities],
    );


    useEffect(() => {
        if (accessDenied) {
            navigate(isStudent ? '/account-inactive' : '/access-denied', {replace: true});
        }
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

        studentService.getById(targetStudentId)
            .then((student) => setStudentName(student.name))
            .catch(() => {
            });
    }, [isStudent, targetStudentId]);

    useEffect(() => {
        if (!activeActivity && allActivities.length > 0) {
            setActiveActivity(workspaceActivities[0] ?? allActivities[0]);
        }
    }, [activeActivity, allActivities]);

    const workspaceId = activeActivity?.id
        ? `${activeActivity.id}-${targetStudentId}`
        : null;

    if (loading) return <div>Carregando...</div>;
    if (error) return <div>{error}</div>;

    const breadcrumbItems = [
        {
            label: isStudent ? "Meu Perfil" : "Dashboard",
            path: isStudent ? "/student/profile" : "/dashboard",
        },
        {
            label: studentName || "Aluno",
            path: isStudent
                ? "/student/profile"
                : `/dashboard/student/${targetStudentId}`,
        },
        { label: "Workspace" },
    ];

    const handleCreateFolder = async (): Promise<void> => {
        if (!newItemForm?.title.trim()) return;
        const folder = await createFolder(newItemForm.title.trim());
        if (folder) setNewItemForm(null);
    };

    const handleSelectActivity = (activity: WorkspaceActivity): void => {
        setIsEditingNewWorkspace(false);
        setWorkspaceDraftFeedback(null);
        setActiveActivity(activity);
    };

    const stopResizing = (): void => {
        isResizingRef.current = false;
        window.removeEventListener("mousemove", handleSidebarResize);
        window.removeEventListener("mouseup", stopResizing);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    };

    const handleSidebarResize = (event: MouseEvent): void => {
        if (!isResizingRef.current) return;
        const containerLeft = bodyRef.current?.getBoundingClientRect().left ?? 0;
        const nextWidth = Math.min(
            SIDEBAR_MAX_WIDTH,
            Math.max(SIDEBAR_MIN_WIDTH, event.clientX - containerLeft),
        );
        setSidebarWidth(nextWidth);
    };

    const handleSidebarResizeStart = (): void => {
        if (sidebarCollapsed) setSidebarCollapsed(false);
        isResizingRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", handleSidebarResize);
        window.addEventListener("mouseup", stopResizing);
    };

    const handleMoveActivity = async (
        activityId: string,
        targetFolderId: string,
    ): Promise<void> => {
        const moved = await moveActivity(activityId, targetFolderId);
        if (!moved) alert("Nao foi possivel mover a atividade. Tente novamente.");
    };

    if (error) {
        return (
            <div className={styles.page}>
                <Header breadcrumbItems={breadcrumbItems} />
                <div className={styles.errorState}>{error}</div>
            </div>
        );
    }

    return (
        <WebRTCProvider key={workspaceId}>
            <ChatBridge
                activityId={activeActivity?.id ?? null}
                user={userForChat}
                messagesRef={messagesRef}
                sendMessageRef={sendMessageRef}
                addIncomingRef={addIncomingRef}
                onMessagesChange={handleMessagesChange}
            />

            <div className={styles.page}>
                <Header breadcrumbItems={breadcrumbItems} />

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
                        className={`${styles.chatToggleBtn} ${chatVisible ? styles.chatToggleBtnActive : ""}`}
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
                        newItemForm={newItemForm}
                        onChangeNewItemForm={setNewItemForm}
                        onCreateFolder={handleCreateFolder}
                        onCreateWorkspace={() => setIsEditingNewWorkspace(true)}
                        onOpenUploadForFolder={() => {
                        }}
                        onMoveActivity={handleMoveActivity}
                        readOnly={isStudent}
                    />

                    <div className={styles.editorArea}>
                        <WorkspaceEditor
                            activity={activeActivity}
                            editable={false}
                            onContentChange={(html) => {
                                if (activeActivity?.id) {
                                    saveContent(activeActivity.id, html);
                                }
                            }}
                        />
                    </div>

                    <div className={`${styles.rightPanel} ${!chatVisible ? styles.rightPanelHidden : ''}`}>
                        <div className={styles.chatSection}>
                            <WorkspaceChat
                                activityTitle={activeActivity?.title ?? ''}
                                messages={messages}
                                onSendMessage={handleSendMessage}
                            />
                        </div>
                        <div className={styles.notesSection}>
                            <WorkspaceNotes
                                activityTitle={activeActivity?.title ?? ''}
                                studentId={targetStudentId}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </WebRTCProvider>
    );
};

export {ProfessorWorkspacePage};
export default ProfessorWorkspacePage;
