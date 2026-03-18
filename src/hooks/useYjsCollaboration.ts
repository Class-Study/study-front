// src/hooks/useYjsCollaboration.ts
import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";

interface UseYjsCollaborationProps {
  activityId: string;
  initialHtml?: string;
  onUpdate: (update: Uint8Array) => void; // chamado quando o doc local muda
}

interface UseYjsCollaborationReturn {
  ydoc: Y.Doc;
  applyRemoteUpdate: (base64: string) => void;
}

export const useYjsCollaboration = ({
  activityId,
  initialHtml,
  onUpdate,
}: UseYjsCollaborationProps): UseYjsCollaborationReturn => {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      onUpdate(update);
    };

    ydoc.on("update", handleUpdate);

    // 🔥 POPULAR CORRETAMENTE O Yjs
    if (initialHtml) {
      const fragment = ydoc.getXmlFragment("content");

      // limpa qualquer coisa
      fragment.delete(0, fragment.length);

      // ⚠️ isso aqui sozinho NÃO converte HTML
      // então precisamos do TipTap mesmo — MAS DO JEITO CERTO
      const tempEditor = new Editor({
        extensions: [
          StarterKit,
          Collaboration.configure({
            document: ydoc,
            field: "content",
          }),
        ],
      });

      tempEditor.commands.setContent(initialHtml);

      tempEditor.destroy();
    }

    return () => {
      ydoc.off("update", handleUpdate);
      ydoc.destroy();
    };
  }, [activityId, initialHtml]);

  const applyRemoteUpdate = (base64: string) => {
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    Y.applyUpdate(ydocRef.current, binary, "remote");
  };

  return {
    ydoc: ydocRef.current,
    applyRemoteUpdate,
  };
};
