import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import { WorkspaceActivity } from '@/types/workspace.types';
import styles from './WorkspaceEditor.module.css';

interface PresenceUser {
  name: string;
  color: string;
}

export interface CursorPosition {
  /** Offset dentro do innerText do elemento ProseMirror */
  from: number;
  /** Offset dentro do innerText (end of selection) */
  to: number;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

interface WorkspaceEditorProps {
  activity: WorkspaceActivity | null;
  editable: boolean;
  presence?: PresenceUser[];
  onContentChange?: (html: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
  onScrollChange?: (pos: ScrollPosition) => void;
  headerStatus?: React.ReactNode;
}

/**
 * Dado o container ProseMirror e uma posição do editor,
 * calcula o offset em caracteres de texto puro (innerText)
 * criando um Range do início do container até a posição do cursor
 * e contando os caracteres dentro dele.
 */
function prosePosToTextOffset(view: { domAtPos: (pos: number) => { node: Node; offset: number } }, container: HTMLElement, pos: number): number {
  try {
    const resolved = view.domAtPos(pos);
    const node = resolved.node;
    const offset = resolved.offset;

    // Criar um range do início do container até o ponto do cursor
    const range = document.createRange();
    range.setStart(container, 0);

    if (node.nodeType === Node.TEXT_NODE) {
      range.setEnd(node, offset);
    } else {
      // Nó de elemento: posicionar no offset de filhos
      if (offset < node.childNodes.length) {
        range.setEnd(node, offset);
      } else {
        // Cursor no fim do elemento — posicionar depois do último filho
        range.setEndAfter(node.lastChild ?? node);
      }
    }

    // O texto dentro desse range é exatamente o que vem antes do cursor
    // Usar toString() que retorna apenas texto visível (como innerText, sem tags)
    return range.toString().length;
  } catch {
    return 0;
  }
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  activity,
  editable,
  presence = [],
  onContentChange,
  onCursorChange,
  onScrollChange,
  headerStatus,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;

  const emitCursor = (e: { view: { dom: HTMLElement; domAtPos: (pos: number) => { node: Node; offset: number } } | null; state: { selection: { from: number; to: number } } }) => {
    if (!onCursorChangeRef.current) return;
    const view = e.view;
    if (!view?.dom) return;

    const { from, to } = e.state.selection;
    const container = view.dom as HTMLElement;

    onCursorChangeRef.current({
      from: prosePosToTextOffset(view, container, from),
      to: prosePosToTextOffset(view, container, to),
    });
  };

  const editor = useEditor({
    extensions: [StarterKit, Typography],
    content: activity?.convertedHtml ?? '',
    editable,
    onUpdate: ({ editor: e }) => {
      if (activity?.id) onContentChange?.(e.getHTML());
    },
    onSelectionUpdate: ({ editor: e }) => {
      emitCursor(e);
    },
  });

  // Scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onScrollChange) return;
    const handleScroll = () => {
      onScrollChange({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [onScrollChange]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
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
        {activity.type === 'WORKSPACE' && (
          <span className={styles.collabTag}>+ Colaborativa</span>
        )}
      </div>
      <div className={styles.editorScroll} ref={scrollRef}>
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
