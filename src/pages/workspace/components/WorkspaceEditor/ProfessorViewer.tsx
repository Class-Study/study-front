// components/ProfessorViewer.tsx
import React, { useEffect, useRef } from "react";
import styles from "./ProfessorViewer.module.css";

interface Props {
  html?: string;
  remoteCursor?: {
    from: number;
    to: number;
    userName: string;
  } | null;
}

export const ProfessorViewer: React.FC<Props> = ({ html, remoteCursor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!remoteCursor || !containerRef.current || !cursorRef.current) return;

    const container = containerRef.current;
    const cursorEl = cursorRef.current;
    const totalLength = container.innerText.length;
    const safeFrom = Math.min(remoteCursor.from, totalLength);

    cursorEl.setAttribute("data-name", remoteCursor.userName ?? "");

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

    let currentPos = 0;
    let targetNode: Node | null = null;
    let offset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.textContent?.length ?? 0;

      if (currentPos + length >= safeFrom) {
        targetNode = node;
        offset = safeFrom - currentPos;
        break;
      }

      currentPos += length;
    }

    if (!targetNode) {
      cursorEl.style.top = `${container.scrollHeight - 20}px`;
      cursorEl.style.left = `0px`;
      return;
    }

    const range = document.createRange();
    range.setStart(targetNode, offset);
    range.setEnd(targetNode, offset);

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.closest(`.${styles.wrapper}`)?.scrollTop ?? 0;
    const scrollLeft = container.closest(`.${styles.wrapper}`)?.scrollLeft ?? 0;

    const top = rect.top - containerRect.top + scrollTop;
    const left = rect.left - containerRect.left + scrollLeft;

    // Esconde brevemente e reposiciona
    cursorEl.classList.add(styles.cursorHidden);

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      cursorEl.style.top = `${top}px`;
      cursorEl.style.left = `${left}px`;
      cursorEl.classList.remove(styles.cursorHidden);
    }, 100);
  }, [html, remoteCursor]);

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
      <div ref={cursorRef} className={styles.cursor}>
        <div className={styles.cursorBar} />
      </div>
    </div>
  );
};
