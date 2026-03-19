import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { WorkspaceActivity } from "@/types/workspace.types";
import { useWebRTC } from "@/contexts/WebRTCContext";
import styles from "./WorkspaceEditor.module.css";

interface PresenceUser {
  name: string;
  color: string;
}

interface WorkspaceEditorProps {
  activity: WorkspaceActivity | null;
  studentId: string;
  editable: boolean;
  html?: string;
  presence?: PresenceUser[];
  currentUserName?: string;
  onContentChange?: (html: string) => void;
  onCursorChange?: (from: number, to: number) => void;
  remoteCursor?: { from: number; to: number; userName: string } | null;
  headerStatus?: React.ReactNode;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  activity,
  studentId,
  editable,
  html,
  presence = [],
  onContentChange,
  onCursorChange,
  remoteCursor,
  headerStatus,
}) => {
  const { send } = useWebRTC(); // ✅ pega do WebRTCProvider acima

  const cursorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const lastActivityIdRef = useRef<string | null>(null);
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

  const editor = useEditor({
    extensions: [StarterKit, Typography, RemoteCursorExtension],
    editable,
    content: html ?? activity?.convertedHtml ?? "",

    onUpdate: ({ editor }) => {
      const newHtml = editor.getHTML();
      onContentChange?.(newHtml);

      // ✅ Envia HTML em tempo real via WebRTC
      send({ type: "html", html: newHtml });

      const { from } = editor.state.selection;
      const textOffset = editor.state.doc.textBetween(0, from, "").length;
      onCursorChange?.(textOffset, textOffset);

      // ✅ Envia cursor junto com a atualização de conteúdo
      send({ type: "cursor", from: textOffset, to: textOffset });
      console.log("[Editor] enviando cursor:", textOffset); // ✅
    },

    onSelectionUpdate: ({ editor, transaction }) => {
      if (!editable) return;
      const isPointerSelection = transaction.getMeta("pointer");
      if (!isPointerSelection) return;

      const { from } = editor.state.selection;
      const textOffset = editor.state.doc.textBetween(0, from, "").length;

      if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
      cursorDebounceRef.current = setTimeout(() => {
        onCursorChange?.(textOffset, textOffset);
        // ✅ Envia cursor via WebRTC com debounce
        send({ type: "cursor", from: textOffset, to: textOffset });
      }, 100);
    },
  });

  // ✅ Listener de scroll no container do editor
  useEffect(() => {
    const scrollEl = editorScrollRef.current;
    if (!scrollEl || !editable) return;

    const handleScroll = () => {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = setTimeout(() => {
        send({ type: "scroll", top: scrollEl.scrollTop });
        console.log("[Editor] enviando scroll:", scrollEl.scrollTop); // ✅
      }, 50);
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [editable, send]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const content = html ?? activity?.convertedHtml;
    if (!content) return;

    const isActivityChange = activity?.id !== lastActivityIdRef.current;
    lastActivityIdRef.current = activity?.id ?? null;

    if (isActivityChange || !editable) {
      if (editor.getHTML() === content) return;

      queueMicrotask(() => {
        const { from, to } = editor.state.selection;
        const docSize = editor.state.doc.content.size;

        editor.commands.setContent(content);

        const newDocSize = editor.state.doc.content.size;
        if (from <= newDocSize && to <= newDocSize) {
          editor.commands.setTextSelection({ from, to });
        }
      });
    }
  }, [html, activity?.id, editable]);

  // Força re-render das decorações quando cursor remoto muda
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

      {/* ✅ ref no container de scroll para capturar eventos */}
      <div
        ref={editorScrollRef} 
        className={styles.editorScroll}
      >
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
