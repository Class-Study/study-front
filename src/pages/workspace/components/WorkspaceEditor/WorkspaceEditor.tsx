import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Collaboration from "@tiptap/extension-collaboration";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
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
  ydoc?: Y.Doc;
  onCursorChange?: (cursor: {
    activityId: string;
    from: number;
    to: number;
    userName: string;
  }) => void;
  remoteCursor?: { from: number; to: number; userName: string } | null;
  headerStatus?: React.ReactNode;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  activity,
  editable,
  presence = [],
  currentUserName = "Aluno",
  ydoc,
  onCursorChange,
  remoteCursor,
  headerStatus,
}) => {
  const remoteCursorRef = useRef(remoteCursor);
  remoteCursorRef.current = remoteCursor;

  const RemoteCursorExtension = useRef(
    Extension.create({
      name: "remoteCursor",
      addProseMirrorPlugins() {
        return [
          new Plugin({
            key: new PluginKey("remoteCursor"),
            props: {
              decorations(state) {
                const cursor = remoteCursorRef.current;
                if (!cursor) return DecorationSet.empty;
                const { from, to, userName } = cursor;
                const size = state.doc.content.size;
                const safeFrom = Math.min(Math.max(from, 0), size);
                const safeTo = Math.min(Math.max(to, 0), size);
                const widget = Decoration.widget(safeFrom, () => {
                  const el = document.createElement("span");
                  el.className = styles.remoteCursor;
                  el.setAttribute("data-name", userName);
                  return el;
                });
                const decos: Decoration[] = [widget];
                if (safeTo > safeFrom) {
                  decos.push(
                    Decoration.inline(safeFrom, safeTo, {
                      class: styles.remoteCursorSelection,
                    }),
                  );
                }
                return DecorationSet.create(state.doc, decos);
              },
            },
          }),
        ];
      },
    }),
  ).current;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false } as any),
        Typography,
        RemoteCursorExtension,
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
      onTransaction: ({ editor }) => {
          console.log("onTransaction fired", { editable, onCursorChange: !!onCursorChange, activityId: activity?.id });
        if (!editable || !onCursorChange || !activity?.id) return;
        const { from, to } = editor.state.selection;
        onCursorChange({
          activityId: activity.id,
          from,
          to,
          userName: currentUserName,
        });
      },
    },
    [ydoc],
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || ydoc) return;
    if (activity?.convertedHtml) {
      editor.commands.setContent(activity.convertedHtml);
    }
  }, [activity?.id]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dispatch(
      editor.state.tr.setMeta("remoteCursorUpdate", remoteCursor),
    );
  }, [editor, remoteCursor]);

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