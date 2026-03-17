import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
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
  onContentChange?: (
    html: string,
    operation?: {
      type: "insert" | "delete";
      position: number;
      text?: string;
      length?: number;
      docVersion: number;
    },
  ) => void;
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
  onContentChange,
  onCursorChange,
  headerStatus,
}) => {
  const docVersionRef = useRef(0);

  const editor = useEditor({
    extensions: [StarterKit, Typography],
    content: activity?.convertedHtml ?? "",
    editable,
    onUpdate: ({ editor: currentEditor, transaction }) => {
      if (!activity?.id) return;

      const html = currentEditor.getHTML();
      const operations: Array<{
        type: "insert" | "delete";
        position: number;
        text?: string;
        length?: number;
        docVersion: number;
      }> = [];

      transaction.steps.forEach((step) => {
        const stepJson = step.toJSON();

        if (stepJson.stepType === "replace") {
          const from: number = stepJson.from;
          const to: number = stepJson.to;

          const extractText = (nodes: any[]): string =>
            nodes
              ?.flatMap((node) => {
                if (node.type === "text") return node.text ?? "";
                if (node.content) return extractText(node.content);
                return "";
              })
              .join("") ?? "";

          const insertedText = extractText(stepJson.slice?.content ?? []);

          if (to > from) {
            operations.push({
              type: "delete",
              position: from,
              length: to - from,
              docVersion: docVersionRef.current,
            });
          }

          if (insertedText.length > 0) {
            operations.push({
              type: "insert",
              position: from,
              text: insertedText,
              docVersion: docVersionRef.current,
            });
          }
        }
      });

      docVersionRef.current += 1;
      onContentChange?.(
        html,
        operations.length > 0 ? operations[0] : undefined,
      );
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      if (!activity?.id) return;
      const { from, to } = currentEditor.state.selection;
      onCursorChange?.({
        activityId: activity.id,
        from,
        to,
        userName: currentUserName,
      });
    },
  });

  useEffect(() => {
    if (editor && activity) {
      editor.commands.setContent(activity.convertedHtml);
      docVersionRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

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
