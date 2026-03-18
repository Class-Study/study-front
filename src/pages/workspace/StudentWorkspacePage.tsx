import { WSProvider, useWS } from "@/contexts/WSContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header/Header";
import DocxPreviewEditor from "@/components/ui/DocxPreviewEditor/DocxPreviewEditor";
import { useAuth } from "@/hooks/useAuth";
import { useMyWorkspace } from "@/hooks/useMyWorkspace";
import { useYjsCollaboration } from "@/hooks/useYjsCollaboration";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar/WorkspaceSidebar";
import { WorkspaceEditor } from "./components/WorkspaceEditor/WorkspaceEditor";
import { WorkspaceChat } from "./components/WorkspaceChat/WorkspaceChat";
import {
  ChatMessage,
  WorkspaceActivity,
  WorkspaceData,
  WorkspaceFolder,
} from "@/types/workspace.types";
import * as Y from "yjs";
import styles from "./WorkspacePage.module.css";

const MOCK_CHAT: ChatMessage[] = [
  {
    id: "1",
    authorId: "teacher",
    authorName: "Professor",
    content:
      "Oi! Pode comecar este exercicio e me chamar aqui no chat se precisar.",
    sentAt: "10:00",
    isOwn: false,
  },
];

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 450;
const SIDEBAR_WIDTH_STORAGE_KEY = "workspace.student.sidebar.width";

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
  saveContent,
  moveActivity,
}) => {
  const { ws, sendWSMessage } = useWS();

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

  const allActivities = useMemo(
    () => workspace.folders.flatMap((folder) => folder.activities),
    [workspace],
  );

  // ─── Yjs collaboration ───────────────────────────────────────────────────
  const { ydoc, applyRemoteUpdate } = useYjsCollaboration({
    activityId: activeActivity?.id ?? "",
    initialHtml: activeActivity?.convertedHtml,
    onUpdate: (update) => {
      if (!activeActivity?.id || activeActivity.type !== "EXERCISE") return;
      const base64 = btoa(
        Array.from(update)
          .map((b) => String.fromCharCode(b))
          .join(""),
      );
      if (ydoc.getXmlFragment("content").length === 0) {
        sendWSMessage({
          type: "yjs-update",
          update: base64,
          userId,
          workspaceId: studentId,
          activityId: activeActivity.id,
        });
      }
    },
  });

  // Recebe updates remotos do professor (se houver edição futura) ou eco
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        message.type === "yjs-update" &&
        message.activityId === activeActivity?.id
      ) {
        applyRemoteUpdate(message.update);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, applyRemoteUpdate]);

  // ─── Sincroniza estado inicial quando atividade muda ────────────────────
  // StudentWorkspacePage.tsx
  useEffect(() => {
    if (!activeActivity || activeActivity.type !== "EXERCISE") return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const fullUpdate = Y.encodeStateAsUpdate(ydoc);
    const base64 = btoa(
      Array.from(fullUpdate)
        .map((b) => String.fromCharCode(b))
        .join(""),
    );

    sendWSMessage({
      type: "yjs-full-sync",
      update: base64,
      userId,
      workspaceId: studentId,
      activityId: activeActivity.id,
    });
  }, [activeActivity?.id, ws]);

  // ─── Sincroniza activeActivity com atualizações do workspace ────────────
  useEffect(() => {
    if (!activeActivity && allActivities.length > 0) {
      setActiveActivity(allActivities[0]);
    }
  }, [activeActivity, allActivities]);

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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  const handleSendMessage = (content: string): void => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      authorId: userId,
      authorName: studentName || "Voce",
      content,
      sentAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

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

  const handleWorkspaceDraftSave = (): void => {
    setWorkspaceDraftFeedback("Rascunho salvo localmente.");
  };

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
                  onChange={(html) => {
                    setNewWorkspaceContent(html);
                    sendWSMessage({
                      type: "sync",
                      html,
                      userId,
                      workspaceId: studentId,
                      activityId: "new",
                    });
                  }}
                />
              </div>
            </div>
          ) : (
            <WorkspaceEditor
              activity={activeActivity}
              editable={activeActivity?.type === "EXERCISE"}
              ydoc={activeActivity?.type === "EXERCISE" ? ydoc : undefined}
              onCursorChange={({ activityId, from, to, userName }) => {
                sendWSMessage({
                  type: "cursor",
                  activityId,
                  from,
                  to,
                  userName: userName || "Aluno",
                  userId,
                  workspaceId: studentId,
                });
              }}
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
          <div className={styles.teacherPresenceSection}>
            <span className={styles.teacherPresenceLabel}>Professor</span>
            <div className={styles.teacherPresenceCard}>
              <span
                className={`${styles.teacherPresenceDot} ${
                  teacherOnline
                    ? styles.teacherPresenceDotOnline
                    : styles.teacherPresenceDotOffline
                }`}
                aria-hidden="true"
              />
              <div className={styles.teacherPresenceInfo}>
                <span className={styles.teacherPresenceName}>
                  {teacherName}
                </span>
                <span className={styles.teacherPresenceStatus}>
                  {teacherOnline ? "Online agora" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.chatSection}>
            <WorkspaceChat
              activityTitle={activeActivity?.title ?? ""}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Camada 2: aguarda carregamento, monta WSProvider com dados prontos ───────

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
    if (accessDenied) {
      navigate("/account-inactive", { replace: true });
    }
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

  if (!workspace || !studentId || !user?.id) {
    return null;
  }

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

// ─── Camada 1: raiz da página ─────────────────────────────────────────────────

const StudentWorkspacePage: React.FC = () => {
  return <StudentWorkspacePageContent />;
};

export default StudentWorkspacePage;
