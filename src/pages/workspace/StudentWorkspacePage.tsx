import { WSProvider, useWS } from "@/contexts/WSContext";
import { WebRTCProvider, useWebRTC } from "@/contexts/WebRTCContext";
import { useChatMessages } from "@/hooks/useChatMessages";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header/Header";
import DocxPreviewEditor from "@/components/ui/DocxPreviewEditor/DocxPreviewEditor";
import { useAuth } from "@/hooks/useAuth";
import { useMyWorkspace } from "@/hooks/useMyWorkspace";
import { useSnapshot } from "@/hooks/useSnapshot";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar/WorkspaceSidebar";
import { WorkspaceEditor } from "./components/WorkspaceEditor/WorkspaceEditor";
import { WorkspaceChat } from "./components/WorkspaceChat/WorkspaceChat";
import {
  WorkspaceActivity,
  WorkspaceData,
  WorkspaceFolder,
} from "@/types/workspace.types";
import styles from "./WorkspacePage.module.css";
import { PresenceCard } from "@/components/ui/PresenceCard/PresenceCard";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = "workspace.student.sidebar.width";

// ─── ChatBridge — dentro do WebRTCProvider, eleva estado para o pai ──────────

const ChatBridge: React.FC<{
  activityId: string | null;
  setConnected: (v: boolean) => void;
  user: { id: string; name: string; email: string; role: any };
  setMessages: (msgs: any[]) => void;
  setSendMessage: (fn: (content: string) => void) => void;
  registerAddIncoming: (fn: (data: any) => void) => void;
}> = ({
  activityId,
  user,
  setMessages,
  setSendMessage,
  registerAddIncoming,
  setConnected,
}) => {
  const { send, connected } = useWebRTC(); // ✅ dentro do WebRTCProvider

  const { messages, sendMessage, addIncomingMessage } = useChatMessages({
    activityId,
    user,
    send,
  });

  // ✅ Registra addIncomingMessage para receber chat do professor via WebRTC
  useEffect(() => {
    registerAddIncoming(addIncomingMessage);
  }, [addIncomingMessage]);

  useEffect(() => {
    setConnected(connected);
  }, [connected]);

  // ✅ Sincroniza messages com o pai — setMessages é estável (setter do useState)
  useEffect(() => {
    setMessages(messages);
  }, [messages]);

  // ✅ Registra sendMessage via setter — só roda quando sendMessage muda
  useEffect(() => {
    setSendMessage(sendMessage);
  }, [sendMessage]);

  return null; // não renderiza nada
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentWorkspacePageInnerProps {
  userId: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  teacherOnline: boolean;
  saving: boolean;
  workspace: WorkspaceData;
  workspaceActivities: WorkspaceActivity[];
  exerciseFolders: WorkspaceFolder[];
  saveContent: (activityId: string, html: string) => void;
  moveActivity: (
    activityId: string,
    targetFolderId: string,
  ) => Promise<boolean>;
}

// ─── Inner ────────────────────────────────────────────────────────────────────

const StudentWorkspacePageInner: React.FC<StudentWorkspacePageInnerProps> = ({
  userId,
  studentId,
  studentName,
  teacherName,
  teacherOnline,
  saving,
  workspace,
  workspaceActivities,
  exerciseFolders,
  moveActivity,
}) => {
  const { user } = useAuth();
  const { wsRef, sendWSMessage, onReconnect } = useWS();
  const [activeActivity, setActiveActivity] =
    useState<WorkspaceActivity | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 240;
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return 240;
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [isEditingNewWorkspace, setIsEditingNewWorkspace] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState(
    `Novo Workspace - ${new Date().toLocaleDateString("pt-BR")}`,
  );
  const [newWorkspaceContent, setNewWorkspaceContent] = useState("<p></p>");
  const [workspaceDraftFeedback, setWorkspaceDraftFeedback] = useState<
    string | null
  >(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);

  // ✅ Chat state no pai — ChatBridge atualiza via setters diretos
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const sendMessageRef = useRef<(content: string) => void>(() => {});
  const [peerConnected, setPeerConnected] = useState(false);
  const addIncomingMessageRef = useRef<((data: any) => void) | null>(null);

  const allActivities = useMemo(
    () => workspace.folders.flatMap((folder) => folder.activities),
    [workspace],
  );

  // ─── Snapshot ────────────────────────────────────────────────────────────
  const { html, ready, notifyChange } = useSnapshot({
    activityId: activeActivity?.id ?? "",
    initialHtml: activeActivity?.convertedHtml,
    onSnapshot: (base64) => {
      if (!activeActivity?.id || activeActivity.type !== "EXERCISE") return;
      sendWSMessage({
        type: "snapshot",
        snapshot: base64,
        userId,
        workspaceId: studentId,
        activityId: activeActivity.id,
      });
    },
  });

  const htmlRef = useRef(html);
  htmlRef.current = html;

  useEffect(() => {
    if (!ready || !onReconnect) return;
    if (!activeActivity || activeActivity.type !== "EXERCISE") return;

    const sendSnapshot = async () => {
      const ws = wsRef?.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!htmlRef.current) return;
      const { compressSnapshot } = await import("@/utils/snapshot");
      const base64 = await compressSnapshot(htmlRef.current);
      sendWSMessage({
        type: "snapshot",
        snapshot: base64,
        userId,
        workspaceId: studentId,
        activityId: activeActivity.id,
      });
    };

    sendSnapshot();
    onReconnect(sendSnapshot);
  }, [ready, activeActivity?.id, wsRef]);

  // ─── Sincroniza atividade ─────────────────────────────────────────────────
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  // ✅ Limpa chat ao trocar atividade
  useEffect(() => {
    setChatMessages([]);
  }, [activeActivity?.id]);

  const handleSelectActivity = (activity: WorkspaceActivity): void => {
    setIsEditingNewWorkspace(false);
    setWorkspaceDraftFeedback(null);
    setActiveActivity(activity);
  };

  const handleCreateWorkspace = (): void => {
    setIsEditingNewWorkspace(true);
    setWorkspaceDraftFeedback(null);
    if (!newWorkspaceTitle.trim()) {
      setNewWorkspaceTitle(
        `Novo Workspace - ${new Date().toLocaleDateString("pt-BR")}`,
      );
    }
  };

  const handleWorkspaceDraftSave = (): void =>
    setWorkspaceDraftFeedback("Rascunho salvo localmente.");
  const handleCloseWorkspaceDraft = (): void => {
    setIsEditingNewWorkspace(false);
    setWorkspaceDraftFeedback(null);
  };

  const handleMoveActivity = async (
    activityId: string,
    targetFolderId: string,
  ): Promise<void> => {
    const moved = await moveActivity(activityId, targetFolderId);
    if (!moved) alert("Nao foi possivel mover a atividade. Tente novamente.");
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

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleSidebarResize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  const breadcrumbItems = [
    { label: "Meu Perfil", path: "/me" },
    { label: studentName || "Aluno", path: "/me" },
    { label: "Workspace" },
  ];

  const workspaceId = activeActivity
    ? `${activeActivity.id}-${studentId}`
    : null;

  // ✅ chatSendMessage estável via ref
  const chatSendMessage = useCallback((content: string) => {
    sendMessageRef.current(content);
  }, []);

  const registerAddIncoming = useCallback((fn: (data: any) => void) => {
    addIncomingMessageRef.current = fn;
  }, []);

  const userForChat = {
    id: userId,
    name: studentName,
    email: user?.email ?? "",
    role: user?.role ?? "STUDENT",
  };

  return (
    <div className={styles.page} data-student-id={studentId}>
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
          newItemForm={null}
          onChangeNewItemForm={() => {}}
          onCreateFolder={() => {}}
          onCreateWorkspace={handleCreateWorkspace}
          onOpenUploadForFolder={() => {}}
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
                  onChange={(event) => setNewWorkspaceTitle(event.target.value)}
                />
                <div className={styles.workspaceActions}>
                  <button
                    type="button"
                    className={styles.workspaceSecondaryBtn}
                    onClick={handleCloseWorkspaceDraft}
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    className={styles.workspacePrimaryBtn}
                    onClick={handleWorkspaceDraftSave}
                  >
                    Salvar
                  </button>
                </div>
              </div>
              {workspaceDraftFeedback && (
                <span className={styles.workspaceFeedback}>
                  {workspaceDraftFeedback}
                </span>
              )}
              <div className={styles.workspaceEditorBody}>
                <DocxPreviewEditor
                  html={newWorkspaceContent}
                  editable={true}
                  onChange={(h) => setNewWorkspaceContent(h)}
                />
              </div>
            </div>
          ) : workspaceId ? (
            // ✅ WebRTCProvider por atividade
            <WebRTCProvider
              key={workspaceId}
              workspaceId={workspaceId}
              role="student"
              onData={(data) => {
                // ✅ Redireciona chat do professor para o hook via ref
                if (data.type === "chat") addIncomingMessageRef.current?.(data);
              }}
            >
              {/* ✅ ChatBridge — acessa useWebRTC() e atualiza pai via setters diretos */}
              <ChatBridge
                activityId={activeActivity?.id ?? null}
                user={userForChat}
                setMessages={setChatMessages}
                setSendMessage={(fn) => {
                  sendMessageRef.current = fn;
                }}
                setConnected={setPeerConnected}
                registerAddIncoming={registerAddIncoming}
              />
              <WorkspaceEditor
                activity={activeActivity}
                studentId={studentId}
                editable={activeActivity?.type === "EXERCISE"}
                html={html}
                onContentChange={notifyChange}
                headerStatus={
                  saving ? (
                    <span className={styles.savingIndicator}>Salvando...</span>
                  ) : null
                }
              />
            </WebRTCProvider>
          ) : (
            <WorkspaceEditor
              activity={null}
              studentId={studentId}
              editable={false}
              html=""
              onContentChange={() => {}}
              headerStatus={null}
            />
          )}
        </div>

        <div
          className={`${styles.rightPanel} ${chatVisible ? "" : styles.rightPanelHidden}`}
        >
          <PresenceCard
            name={teacherName}
            label="Professor"
            connected={peerConnected}
          />

          <div className={styles.chatSection}>
            {/* ✅ chatMessages e chatSendMessage elevados do ChatBridge */}
            <WorkspaceChat
              activityTitle={activeActivity?.title ?? ""}
              messages={chatMessages}
              onSendMessage={chatSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Camada 2 ─────────────────────────────────────────────────────────────────

const StudentWorkspacePageContent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    fetchWorkspace,
    saveContent,
    moveActivity,
    workspaceActivities,
    exerciseFolders,
  } = useMyWorkspace();

  const breadcrumbItems = [
    { label: "Meu Perfil", path: "/me" },
    { label: studentName || user?.name || "Aluno", path: "/me" },
    { label: "Workspace" },
  ];

  useEffect(() => {
    if (accessDenied) navigate("/account-inactive", { replace: true });
  }, [accessDenied, navigate]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Header breadcrumbItems={breadcrumbItems} />
        <div className={styles.loadingState}>Carregando workspace...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Header breadcrumbItems={breadcrumbItems} />
        <div className={styles.errorState}>{error}</div>
      </div>
    );
  }

  if (!workspace || !studentId || !user?.id) return null;

  return (
    <WSProvider userId={user.id} workspaceId={studentId}>
      <StudentWorkspacePageInner
        userId={user.id}
        studentId={studentId}
        studentName={studentName}
        teacherName={teacherName}
        teacherOnline={teacherOnline}
        saving={saving}
        workspace={workspace}
        workspaceActivities={workspaceActivities}
        exerciseFolders={exerciseFolders}
        saveContent={saveContent}
        moveActivity={moveActivity}
      />
    </WSProvider>
  );
};

const StudentWorkspacePage: React.FC = () => <StudentWorkspacePageContent />;

export default StudentWorkspacePage;
