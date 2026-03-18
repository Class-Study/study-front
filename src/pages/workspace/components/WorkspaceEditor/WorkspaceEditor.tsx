import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { WorkspaceActivity } from "@/types/workspace.types";
import styles from "./WorkspaceEditor.module.css";

interface PresenceUser {
  name: string;
  color: string;
}

interface WorkspaceEditorProps {
  activity: WorkspaceActivity | null;
  editable: boolean;
  presence?: PresenceUser[];
  currentUserName?: string;
  currentUserColor?: string;
  ydoc?: Y.Doc; // doc Yjs compartilhado
  onContentChange?: (html: string) => void;
  onCursorChange?: (cursor: {
    activityId: string;
    from: number;
    to: number;
    userName: string;
  }) => void;
  headerStatus?: React.ReactNode;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  activity,
  editable,
  presence = [],
  currentUserName = "Aluno",
  currentUserColor = "#F59E0B",
  ydoc,
  onContentChange,
  onCursorChange,
  headerStatus,
}) => {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false } as any),
        Typography,
        ...(ydoc
          ? [
              Collaboration.configure({
                document: ydoc,
                field: "content",
              }),
            ]
          : []),
      ],
      editable,
    },
    [ydoc],
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Quando não tem Yjs (fallback), carrega o HTML diretamente
  useEffect(() => {
    if (!editor || ydoc) return;
    if (activity?.convertedHtml) {
      editor.commands.setContent(activity.convertedHtml);
    }
  }, [activity?.id]);

  if (!activity) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>📂</span>
        <p className={styles.emptyText}>Selecione uma atividade na sidebar</p>
      </div>
    );
  }

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.topBar}>
        <h2 className={styles.activityTitle}>{activity.title}</h2>
        {headerStatus}
        {activity.type === "WORKSPACE" && (
          <span className={styles.collabTag}>+ Colaborativa</span>
        )}
      </div>

      <div className={styles.editorScroll}>
        <EditorContent editor={editor} className={styles.editorContent} />
      </div>

      <div className={styles.footer}>
        {presence.map((user) => (
          <div key={user.name} className={styles.presenceItem}>
            <span
              className={styles.presenceDot}
              style={{ background: `var(${user.color}, ${user.color})` }}
            />
            <span className={styles.presenceName}>{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
