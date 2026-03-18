import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header/Header";
import DocxPreviewEditor from "@/components/ui/DocxPreviewEditor/DocxPreviewEditor";
import studentService from "@/services/api/student.service";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useYjsCollaboration } from "@/hooks/useYjsCollaboration";
import { useWS, WSProvider } from "@/contexts/WSContext";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar/WorkspaceSidebar";
import { WorkspaceEditor } from "./components/WorkspaceEditor/WorkspaceEditor";
import { WorkspaceChat } from "./components/WorkspaceChat/WorkspaceChat";
import { WorkspaceNotes } from "./components/WorkspaceNotes/WorkspaceNotes";
import { UploadActivityModal } from "./components/UploadActivityModal/UploadActivityModal";
import { ChatMessage, WorkspaceActivity } from "@/types/workspace.types";
import styles from "./WorkspacePage.module.css";

const MOCK_CHAT: ChatMessage[] = [
  {
    id: "1",
    authorId: "teacher",
    authorName: "Professora Ana",
    content: "Olá! Vamos começar. Escreva o que lembra do Past Simple 👋",
    sentAt: "10:30",
    isOwn: false,
  },
  {
    id: "2",
    authorId: "student",
    authorName: "Você",
    content: "Oi professora! Verbos regulares recebem -ed 😊",
    sentAt: "10:31",
    isOwn: true,
  },
];

const MOCK_PRESENCE = [
  { name: "Você (Professora)", color: "--color-accent" },
  { name: "Aluna online", color: "--color-blue" },
];

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = "workspace.sidebar.width";

const WorkspacePageContent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const { ws } = useWS();
  const isStudent = user?.role === "STUDENT";
  const targetStudentId = studentId ?? user?.id ?? "";
  const {
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    accessDenied,
    saving,
    fetchWorkspace,
    createActivity,
    createFolder,
    moveActivity,
  } = useWorkspace(targetStudentId, isStudent);

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
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [studentName, setStudentName] = useState("");
  const [isEditingNewWorkspace, setIsEditingNewWorkspace] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState(
    `Novo Workspace - ${new Date().toLocaleDateString("pt-BR")}`,
  );
  const [newWorkspaceContent, setNewWorkspaceContent] = useState("<p></p>");
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

  // ─── Yjs collaboration — professor só recebe, não envia ─────────────────
  const { ydoc, applyRemoteUpdate } = useYjsCollaboration({
    activityId: activeActivity?.id ?? "",
    initialHtml: activeActivity?.convertedHtml,
    onUpdate: () => {},
  });

  console.log("HTML vindo:", activeActivity?.convertedHtml);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (message.type === "yjs-update" && message.update) {
        applyRemoteUpdate(message.update);
        return;
      }

      if (message.type === "cursor") {
        console.log("[WS] Cursor do aluno:", message);
        return;
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, applyRemoteUpdate]);

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
      setActiveActivity(workspaceActivities[0] ?? allActivities[0]);
    }
  }, [activeActivity, allActivities, workspaceActivities]);

  useEffect(() => {
    if (!activeActivity) return;
    const updatedActivity = allActivities.find(
      (a) => a.id === activeActivity.id,
    );
    if (updatedActivity && updatedActivity !== activeActivity) {
      setActiveActivity(updatedActivity);
    }
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

  const handleSendMessage = (content: string): void => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      authorId: "teacher",
      authorName: "Professor",
      content,
      sentAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

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
  };

  const handleSelectActivity = (activity: WorkspaceActivity): void => {
    setIsEditingNewWorkspace(false);
    setWorkspaceDraftFeedback(null);
    setActiveActivity(activity);
  };

  const handleMoveActivity = async (
    activityId: string,
    targetFolderId: string,
  ): Promise<void> => {
    const moved = await moveActivity(activityId, targetFolderId);
    if (!moved) alert("Nao foi possivel mover a atividade. Tente novamente.");
  };

  const handleWorkspaceDraftSave = (): void => {
    setWorkspaceDraftFeedback("Rascunho salvo localmente.");
  };

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
            <WorkspaceEditor
              activity={activeActivity}
              editable={false}
              presence={MOCK_PRESENCE}
              ydoc={activeActivity?.type === "EXERCISE" ? ydoc : undefined}
              onContentChange={undefined} // ← professor não salva
              headerStatus={
                saving ? (
                  <span className={styles.savingIndicator}>Salvando...</span>
                ) : null
              }
            />
          )}
        </div>

        <div
          className={`${styles.rightPanel} ${chatVisible ? "" : styles.rightPanelHidden}`}
        >
          <div className={styles.chatSection}>
            <WorkspaceChat
              activityTitle={activeActivity?.title ?? ""}
              messages={messages}
              onSendMessage={handleSendMessage}
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

const WorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const targetStudentId = studentId ?? user?.id ?? "";

  if (!user?.id || !targetStudentId) return null;

  return (
    <WSProvider userId={user.id} workspaceId={targetStudentId}>
      <WorkspacePageContent />
    </WSProvider>
  );
};

export { WorkspacePage };
export default WorkspacePage;
