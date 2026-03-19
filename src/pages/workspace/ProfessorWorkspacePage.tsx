import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header/Header";
import DocxPreviewEditor from "@/components/ui/DocxPreviewEditor/DocxPreviewEditor";
import studentService from "@/services/api/student.service";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSnapshot } from "@/hooks/useSnapshot";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useWS, WSProvider } from "@/contexts/WSContext";
import { WebRTCProvider, useWebRTC } from "@/contexts/WebRTCContext";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar/WorkspaceSidebar";
import { ProfessorViewer } from "./components/WorkspaceEditor/ProfessorViewer";
import { WorkspaceChat } from "./components/WorkspaceChat/WorkspaceChat";
import { WorkspaceNotes } from "./components/WorkspaceNotes/WorkspaceNotes";
import { UploadActivityModal } from "./components/UploadActivityModal/UploadActivityModal";
import { WorkspaceActivity, ChatMessage } from "@/types/workspace.types";
import styles from "./WorkspacePage.module.css";
import { PresenceCard } from "@/components/ui/PresenceCard/PresenceCard";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = "workspace.sidebar.width";

// ─── ChatBridge — estado de chat vive aqui, dentro do WebRTCProvider ─────────

const ProfessorChatBridge: React.FC<{
  activityId: string | null;
  user: { id: string; name: string; email: string; role: any };
  messagesRef: React.MutableRefObject<ChatMessage[]>;
  sendMessageRef: React.MutableRefObject<(content: string) => void>;
  addIncomingRef: React.MutableRefObject<((data: any) => void) | null>;
  onMessagesChange: () => void;
  onConnectedChange: (v: boolean) => void;
}> = ({
  activityId,
  user,
  messagesRef,
  sendMessageRef,
  addIncomingRef,
  onMessagesChange,
  onConnectedChange,
}) => {
  const { send, connected } = useWebRTC();

  const { messages, sendMessage, addIncomingMessage } = useChatMessages({
    activityId,
    user,
    send,
  });

  const prevLengthRef = useRef(-1);

  useEffect(() => {
    onConnectedChange(connected);
  }, [connected]);

  useEffect(() => {
    console.log("[Bridge] messages mudou, length:", messages.length);
    messagesRef.current = messages;
    onMessagesChange();
  }, [messages]);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    addIncomingRef.current = addIncomingMessage;
  }, [addIncomingMessage]);

  return null;
};

// ─── Camada interna — sem hooks de WebRTC ────────────────────────────────────

const ProfessorWorkspacePageContent: React.FC<{
  rtcHtml: string;
  rtcCursor: { from: number; to: number; userName?: string } | null;
  rtcScroll: number | null;
  onActivityChange: (activityId: string | null) => void;
  chatMessages: ChatMessage[];
  chatSendMessage: (content: string) => void;
  peerConnected: boolean;
}> = ({
  rtcHtml,
  rtcCursor,
  rtcScroll,
  onActivityChange,
  chatMessages,
  chatSendMessage,
  peerConnected,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const { wsRef } = useWS();
  const isStudent = user?.role === "STUDENT";
  const targetStudentId = studentId ?? user?.id ?? "";

  const {
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    accessDenied,
    fetchWorkspace,
    createActivity,
    createFolder,
    moveActivity,
  } = useWorkspace(targetStudentId, isStudent);

  const [activeActivity, setActiveActivity] =
    useState<WorkspaceActivity | null>(null);
  const [studentName, setStudentName] = useState("");
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
  const [newWorkspaceContent, setNewWorkspaceContent] =
    useState<string>("<p></p>");
  const [workspaceDrafts, setWorkspaceDrafts] = useState<
    Record<string, { title: string; convertedHtml: string }>
  >({});
  const [workspaceDraftFeedback, setWorkspaceDraftFeedback] = useState<
    string | null
  >(null);
  const [newItemForm, setNewItemForm] = useState<{ title: string } | null>(
    null,
  );
  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean;
    folderId: string | null;
  }>({ isOpen: false, folderId: null });
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);

  const allActivities = useMemo(
    () => [
      ...workspaceActivities,
      ...exerciseFolders.flatMap((folder) => folder.activities),
    ],
    [exerciseFolders, workspaceActivities],
  );

  const { html: snapshotHtml, applyRemoteSnapshot } = useSnapshot({
    activityId: activeActivity?.id ?? "",
    initialHtml: activeActivity?.convertedHtml,
    onSnapshot: () => {},
  });

  useEffect(() => {
    if (!wsRef.current) return;
    const handleMessage = (event: MessageEvent) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === "snapshot" && message.snapshot) {
        applyRemoteSnapshot(message.snapshot);
      }
    };
    wsRef.current.addEventListener("message", handleMessage);
    return () => wsRef.current?.removeEventListener("message", handleMessage);
  }, [wsRef, applyRemoteSnapshot]);

  useEffect(() => {
    if (accessDenied) {
      navigate(isStudent ? "/account-inactive" : "/access-denied", {
        replace: true,
      });
    }
  }, [accessDenied, isStudent, navigate]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace, targetStudentId]);

  useEffect(() => {
    if (!targetStudentId) return;
    if (isStudent) {
      setStudentName(user?.name ?? "Aluno");
      return;
    }
    studentService
      .getById(targetStudentId)
      .then((student) => setStudentName(student.name))
      .catch(() => {});
  }, [isStudent, targetStudentId, user?.name]);

  useEffect(() => {
    if (!activeActivity && allActivities.length > 0) {
      const first = workspaceActivities[0] ?? allActivities[0];
      setActiveActivity(first);
      onActivityChange(first.id);
    }
  }, [activeActivity, allActivities, workspaceActivities]);

  useEffect(() => {
    if (!activeActivity) return;
    const updated = allActivities.find((a) => a.id === activeActivity.id);
    if (updated && updated !== activeActivity) setActiveActivity(updated);
  }, [activeActivity, allActivities]);

  useEffect(() => {
    if (activeActivity?.type !== "WORKSPACE") return;
    setWorkspaceDrafts((prev) => {
      if (prev[activeActivity.id]) return prev;
      return {
        ...prev,
        [activeActivity.id]: {
          title: activeActivity.title,
          convertedHtml: activeActivity.convertedHtml,
        },
      };
    });
  }, [activeActivity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

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

  const handleCreateWorkspace = async (): Promise<void> => {
    setIsEditingNewWorkspace(true);
    setWorkspaceDraftFeedback(null);
    if (!newWorkspaceTitle.trim()) {
      setNewWorkspaceTitle(
        `Novo Workspace - ${new Date().toLocaleDateString("pt-BR")}`,
      );
    }
  };

  const handleOpenUploadForFolder = (folderId: string): void => {
    setUploadModalState({ isOpen: true, folderId });
  };

  const handleSaveUploadedActivity = async (payload: {
    folderId: string;
    title: string;
    type: "EXERCISE";
    convertedHtml: string;
    originalFilename: string;
  }): Promise<void> => {
    const activity = await createActivity(
      payload.folderId,
      payload.title,
      payload.type,
      payload.convertedHtml,
      payload.originalFilename,
    );
    if (!activity) throw new Error("Falha ao criar atividade");
    setActiveActivity(activity);
    onActivityChange(activity.id);
  };

  const handleSelectActivity = (activity: WorkspaceActivity): void => {
    setIsEditingNewWorkspace(false);
    setWorkspaceDraftFeedback(null);
    setActiveActivity(activity);
    onActivityChange(activity.id);
  };

  const handleMoveActivity = async (
    activityId: string,
    targetFolderId: string,
  ): Promise<void> => {
    const moved = await moveActivity(activityId, targetFolderId);
    if (!moved) alert("Nao foi possivel mover a atividade. Tente novamente.");
  };

  const handleWorkspaceDraftSave = (): void =>
    setWorkspaceDraftFeedback("Rascunho salvo localmente.");
  const handleCloseWorkspaceDraft = (): void => {
    setIsEditingNewWorkspace(false);
    setWorkspaceDraftFeedback(null);
  };

  const isWorkspaceActive =
    isEditingNewWorkspace || activeActivity?.type === "WORKSPACE";
  const selectedWorkspaceDraft =
    activeActivity?.type === "WORKSPACE"
      ? workspaceDrafts[activeActivity.id]
      : null;

  const workspaceTitle = isEditingNewWorkspace
    ? newWorkspaceTitle
    : (selectedWorkspaceDraft?.title ?? activeActivity?.title ?? "");

  const workspaceContent = isEditingNewWorkspace
    ? newWorkspaceContent
    : (selectedWorkspaceDraft?.convertedHtml ??
      activeActivity?.convertedHtml ??
      "<p></p>");

  const updateWorkspaceTitle = (nextTitle: string): void => {
    if (isEditingNewWorkspace) {
      setNewWorkspaceTitle(nextTitle);
      return;
    }
    if (!activeActivity || activeActivity.type !== "WORKSPACE") return;
    setWorkspaceDrafts((prev) => ({
      ...prev,
      [activeActivity.id]: {
        title: nextTitle,
        convertedHtml:
          prev[activeActivity.id]?.convertedHtml ??
          activeActivity.convertedHtml,
      },
    }));
  };

  const updateWorkspaceContent = (nextHtml: string): void => {
    setWorkspaceDraftFeedback(null);
    if (isEditingNewWorkspace) {
      setNewWorkspaceContent(nextHtml);
      return;
    }
    if (!activeActivity || activeActivity.type !== "WORKSPACE") return;
    setWorkspaceDrafts((prev) => ({
      ...prev,
      [activeActivity.id]: {
        title: prev[activeActivity.id]?.title ?? activeActivity.title,
        convertedHtml: nextHtml,
      },
    }));
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

  const viewerHtml = rtcHtml || snapshotHtml || "";

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

  return (
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
          onCreateWorkspace={handleCreateWorkspace}
          onOpenUploadForFolder={handleOpenUploadForFolder}
          onMoveActivity={handleMoveActivity}
          readOnly={isStudent}
        />

        <div className={styles.editorArea}>
          {isWorkspaceActive ? (
            <div className={styles.workspaceContainer}>
              <div className={styles.workspaceHeaderRow}>
                <input
                  className={styles.workspaceTitleInput}
                  placeholder="Titulo do Workspace..."
                  value={workspaceTitle}
                  onChange={(event) => updateWorkspaceTitle(event.target.value)}
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
                  html={workspaceContent}
                  editable={true}
                  onChange={updateWorkspaceContent}
                />
              </div>
            </div>
          ) : (
            activeActivity && (
              <ProfessorViewer
                html={viewerHtml}
                cursor={rtcCursor}
                scroll={rtcScroll}
                studentName={studentName}
              />
            )
          )}
        </div>

        <div
          className={`${styles.rightPanel} ${chatVisible ? "" : styles.rightPanelHidden}`}
        >
          <div className={styles.chatSection}>
            <PresenceCard
              name={studentName}
              label="Aluno"
              connected={peerConnected}
            />
            <WorkspaceChat
              activityTitle={activeActivity?.title ?? ""}
              messages={chatMessages}
              onSendMessage={chatSendMessage}
            />
          </div>
          <div className={styles.notesSection}>
            <WorkspaceNotes
              activityTitle={activeActivity?.title ?? ""}
              studentId={targetStudentId}
            />
          </div>
        </div>
      </div>

      <UploadActivityModal
        isOpen={!isStudent && uploadModalState.isOpen}
        folders={exerciseFolders}
        selectedFolderId={uploadModalState.folderId}
        onClose={() => setUploadModalState({ isOpen: false, folderId: null })}
        onSave={handleSaveUploadedActivity}
      />
    </div>
  );
};

// ─── Camada externa ───────────────────────────────────────────────────────────

const ProfessorWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const targetStudentId = studentId ?? user?.id ?? "";

  const [rtcHtml, setRtcHtml] = useState("");
  const [rtcCursor, setRtcCursor] = useState<{
    from: number;
    to: number;
    userName?: string;
  } | null>(null);
  const [rtcScroll, setRtcScroll] = useState<number | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);

  // ✅ Chat via refs + estado separado para forçar re-render com nova referência
  const messagesRef = useRef<ChatMessage[]>([]);
  const [peerConnected, setPeerConnected] = useState(false);
  const sendMessageRef = useRef<(content: string) => void>(() => {});
  const addIncomingRef = useRef<((data: any) => void) | null>(null);

  // ✅ chatMessages é um estado real — nova referência a cada update
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleData = useCallback((data: any) => {
    if (data.type === "html") setRtcHtml(data.html);
    if (data.type === "cursor") setRtcCursor(data);
    if (data.type === "scroll") setRtcScroll(data.top);
    if (data.type === "chat") addIncomingRef.current?.(data);
  }, []);

  const activeActivityIdRef = useRef<string | null>(null);

  const handleActivityChange = useCallback((activityId: string | null) => {
    if (activityId === activeActivityIdRef.current) {
      return;
    }
    activeActivityIdRef.current = activityId;
    setActiveActivityId(activityId);
    setRtcHtml("");
    setRtcCursor(null);
    setRtcScroll(null);
    messagesRef.current = [];
    setChatMessages([]);
  }, []);

  const handleMessagesChange = useCallback(() => {
    console.log(
      "[Pai] onMessagesChange chamado, messagesRef.current.length:",
      messagesRef.current.length,
    );
    setChatMessages([...messagesRef.current]);
  }, []);

  const workspaceId = activeActivityId
    ? `${activeActivityId}-${targetStudentId}`
    : null;

  if (!user?.id || !targetStudentId) return null;

  const userForChat = useMemo(
    () => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }),
    [user.id, user.name, user.email, user.role],
  );

  const chatSendMessage = useCallback((content: string) => {
    sendMessageRef.current(content);
  }, []);

  const { send, connected } = useWebRTC();

  return (
    <WSProvider userId={user.id} workspaceId={targetStudentId}>
      {workspaceId ? (
        <WebRTCProvider
          key={workspaceId}
          workspaceId={workspaceId}
          role="teacher"
          onData={handleData}
        >
          <ProfessorChatBridge
            activityId={activeActivityId}
            user={userForChat}
            messagesRef={messagesRef}
            sendMessageRef={sendMessageRef}
            addIncomingRef={addIncomingRef}
            // ✅ Cria nova referência de array ao notificar — React detecta a mudança
            onMessagesChange={handleMessagesChange}
            onConnectedChange={setPeerConnected}
          />
          <ProfessorWorkspacePageContent
            rtcHtml={rtcHtml}
            rtcCursor={rtcCursor}
            rtcScroll={rtcScroll}
            onActivityChange={handleActivityChange}
            chatMessages={chatMessages}
            chatSendMessage={chatSendMessage}
            peerConnected={peerConnected}
          />
        </WebRTCProvider>
      ) : (
        <ProfessorWorkspacePageContent
          rtcHtml=""
          rtcCursor={null}
          rtcScroll={null}
          onActivityChange={handleActivityChange}
          chatMessages={chatMessages}
          chatSendMessage={chatSendMessage}
          peerConnected={peerConnected}
        />
      )}
    </WSProvider>
  );
};

export { ProfessorWorkspacePage };
export default ProfessorWorkspacePage;
