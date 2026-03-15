import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import { WorkspaceActivity } from '@/types/workspace.types';
import styles from './WorkspaceEditor.module.css';

interface PresenceUser {
  name: string;
  color: string;
}

interface WorkspaceEditorProps {
  activity: WorkspaceActivity | null;
  editable: boolean;
  presence?: PresenceUser[];
  onContentChange?: (html: string) => void;
  headerStatus?: React.ReactNode;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({
  activity,
  editable,
  presence = [],
  onContentChange,
  headerStatus,
}) => {
  const editor = useEditor({
    extensions: [StarterKit, Typography],
    content: activity?.contentHtml ?? '',
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      if (activity?.id) {
        onContentChange?.(currentEditor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editor && activity) {
      editor.commands.setContent(activity.contentHtml);
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
        {activity.type === 'WORKSPACE' && (
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
