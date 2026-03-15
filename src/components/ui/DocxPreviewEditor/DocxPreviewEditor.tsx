import React, { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import styles from './DocxPreviewEditor.module.css';

interface DocxPreviewEditorProps {
  html: string;
  editable?: boolean;
  onChange?: (html: string) => void;
}

export const DocxPreviewEditor: React.FC<DocxPreviewEditorProps> = ({
  html,
  editable = false,
  onChange,
}) => {
  const editor = useEditor({
    extensions: [StarterKit, Typography],
    content: html,
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== html) {
      editor.commands.setContent(html);
    }
  }, [editor, html]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className={`${styles.wrapper} ${editable ? styles.editable : styles.readonly}`}>
      {editable && editor && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.toolButton} ${editor.isActive('bold') ? styles.toolButtonActive : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${editor.isActive('italic') ? styles.toolButtonActive : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${editor.isActive('bulletList') ? styles.toolButtonActive : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Lista
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${editor.isActive('orderedList') ? styles.toolButtonActive : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </button>
        </div>
      )}
      <EditorContent editor={editor} className={styles.editor} />
    </div>
  );
};

export default DocxPreviewEditor;
