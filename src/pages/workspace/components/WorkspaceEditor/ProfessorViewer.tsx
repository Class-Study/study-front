import React, { useEffect, useRef } from "react";
import styles from "./ProfessorViewer.module.css";

interface Props {
  html: string;
  cursor: { from: number; to: number; userName?: string } | null;
  scroll?: number | null;
  studentName?: string;
}

export const ProfessorViewer: React.FC<Props> = ({
  html,
  cursor,
  scroll,
  studentName,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // ✅ Aplica scroll no wrapper (quem tem overflow-y: auto)
  useEffect(() => {
    if (scroll == null || !wrapperRef.current) return;
    wrapperRef.current.scrollTop = scroll;
  }, [scroll]);

  // ✅ Posiciona cursor remoto
  useEffect(() => {
    if (!cursor || !containerRef.current || !cursorRef.current) return;

    const container = containerRef.current;
    const cursorEl = cursorRef.current;

    const totalLength = container.innerText.length;
    const safeFrom = Math.min(cursor.from, totalLength);

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

    if (!targetNode) return;

    const range = document.createRange();
    range.setStart(targetNode, offset);
    range.setEnd(targetNode, offset);

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const top = rect.top - containerRect.top + container.scrollTop;
    const left = rect.left - containerRect.left + container.scrollLeft;

    cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  }, [cursor]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* ✅ data-name alimenta o ::after do CSS com o nome do aluno */}
      <div
        ref={cursorRef}
        className={styles.cursor}
        data-name={studentName ?? "Aluno"}
      >
        <div className={styles.cursorBar} />
      </div>
    </div>
  );
};