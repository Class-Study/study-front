import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import studentService from '@/services/api/student.service';
import { useWorkspace } from '@/hooks/useWorkspace';
import { WorkspaceSidebar } from './components/WorkspaceSidebar/WorkspaceSidebar';
import { WorkspaceEditor } from './components/WorkspaceEditor/WorkspaceEditor';
import { WorkspaceChat } from './components/WorkspaceChat/WorkspaceChat';
import { WorkspaceNotes } from './components/WorkspaceNotes/WorkspaceNotes';
import { ChatMessage, WorkspaceActivity } from '@/types/workspace.types';
import styles from './WorkspacePage.module.css';

const MOCK_CHAT: ChatMessage[] = [
  { id: '1', authorId: 'teacher', authorName: 'Professora Ana', content: 'Olá! Vamos começar. Escreva o que lembra do Past Simple 👋', sentAt: '10:30', isOwn: false },
  { id: '2', authorId: 'student', authorName: 'Você', content: 'Oi professora! Verbos regulares recebem -ed 😊', sentAt: '10:31', isOwn: true },
];

const MOCK_PRESENCE = [
  { name: 'Você (Professora)', color: '--color-accent' },
  { name: 'Aluna online', color: '--color-blue' },
];

export const WorkspacePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const {
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    saving,
    fetchWorkspace,
    saveContent,
    createActivity,
    createFolder,
  } = useWorkspace(studentId ?? '');

  const [activeActivity, setActiveActivity] = useState<WorkspaceActivity | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [studentName, setStudentName] = useState('');
  const [newItemForm, setNewItemForm] = useState<{
    type: 'folder' | 'activity';
    folderId?: string;
    title: string;
  } | null>(null);

  const allActivities = useMemo(
    () => [
      ...workspaceActivities,
      ...exerciseFolders.flatMap((folder) => folder.activities),
    ],
    [exerciseFolders, workspaceActivities],
  );

  const activeFolderId = useMemo(() => {
    if (newItemForm?.folderId) return newItemForm.folderId;
    if (activeActivity?.folderId) return activeActivity.folderId;
    return exerciseFolders[0]?.id;
  }, [activeActivity?.folderId, exerciseFolders, newItemForm?.folderId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace, studentId]);

  useEffect(() => {
    if (!studentId) return;

    studentService.getById(studentId)
      .then((student) => setStudentName(student.name))
      .catch(() => {});
  }, [studentId]);

  useEffect(() => {
    if (!activeActivity && allActivities.length > 0) {
      setActiveActivity(workspaceActivities[0] ?? allActivities[0]);
    }
  }, [activeActivity, allActivities, workspaceActivities]);

  useEffect(() => {
    if (!activeActivity) return;

    const updatedActivity = allActivities.find((activity) => activity.id === activeActivity.id);
    if (updatedActivity && updatedActivity !== activeActivity) {
      setActiveActivity(updatedActivity);
    }
  }, [activeActivity, allActivities]);

  const handleSendMessage = (content: string): void => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      authorId: 'teacher',
      authorName: 'Professor',
      content,
      sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: studentName || 'Aluno', path: `/dashboard/student/${studentId}` },
    { label: 'Workspace' },
  ];

  const handleCreateFolder = async (): Promise<void> => {
    if (!newItemForm?.title.trim()) return;

    const folder = await createFolder(newItemForm.title.trim());
    if (folder) {
      setNewItemForm(null);
    }
  };

  const handleCreateActivity = async (type: 'EXERCISE' | 'WORKSPACE'): Promise<void> => {
    const folderId = newItemForm?.folderId ?? activeFolderId;
    if (!folderId || !newItemForm?.title.trim()) return;

    const activity = await createActivity(folderId, newItemForm.title.trim(), type);
    if (activity) {
      setActiveActivity(activity);
      setNewItemForm(null);
    }
  };

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
          className={`${styles.chatToggleBtn} ${chatVisible ? styles.chatToggleBtnActive : ''}`}
          onClick={() => setChatVisible((v) => !v)}
        >
          ⇌ Chat
        </button>
      </div>

      <div className={styles.body}>
        <WorkspaceSidebar
          folders={exerciseFolders}
          workspaces={workspaceActivities}
          activeActivityId={activeActivity?.id ?? null}
          onSelectActivity={setActiveActivity}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          newItemForm={newItemForm}
          defaultFolderId={activeFolderId}
          onChangeNewItemForm={setNewItemForm}
          onCreateFolder={handleCreateFolder}
          onCreateExercise={() => handleCreateActivity('EXERCISE')}
          onCreateWorkspace={() => handleCreateActivity('WORKSPACE')}
        />

        <div className={styles.editorArea}>
          <WorkspaceEditor
            activity={activeActivity}
            editable={activeActivity?.type === 'WORKSPACE'}
            presence={MOCK_PRESENCE}
            onContentChange={(html) => {
              if (activeActivity?.id) {
                saveContent(activeActivity.id, html);
              }
            }}
            headerStatus={saving ? <span className={styles.savingIndicator}>Salvando...</span> : null}
          />
        </div>

        <div className={`${styles.rightPanel} ${chatVisible ? '' : styles.rightPanelHidden}`}>
          <div className={styles.chatSection}>
            <WorkspaceChat
              activityTitle={activeActivity?.title ?? ''}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
          <div className={styles.notesSection}>
            <WorkspaceNotes activityTitle={activeActivity?.title ?? ''} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;

