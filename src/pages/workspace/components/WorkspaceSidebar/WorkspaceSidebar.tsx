import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, FolderClosed, PanelLeftClose } from 'lucide-react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { Modal } from '@/components/ui/Modal/Modal';
import { WorkspaceActivity, WorkspaceFolder } from '@/types/workspace.types';
import styles from './WorkspaceSidebar.module.css';

interface WorkspaceSidebarProps {
  folders: WorkspaceFolder[];
  workspaces: WorkspaceActivity[];
  activeActivityId: string | null;
  width: number;
  onSelectActivity: (activity: WorkspaceActivity) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onResizeStart: () => void;
  newItemForm: {
    title: string;
  } | null;
  onChangeNewItemForm: React.Dispatch<React.SetStateAction<{
    title: string;
  } | null>>;
  onCreateFolder: () => void;
  onCreateWorkspace: () => void;
  onOpenUploadForFolder: (folderId: string) => void;
  onMoveActivity: (activityId: string, targetFolderId: string) => Promise<void>;
}

interface PendingMove {
  activityId: string;
  activityTitle: string;
  sourceFolderId: string;
  sourceFolderName: string;
  targetFolderId: string;
  targetFolderName: string;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  folders,
  workspaces,
  activeActivityId,
  width,
  onSelectActivity,
  collapsed,
  onToggleCollapse,
  onResizeStart,
  newItemForm,
  onChangeNewItemForm,
  onCreateFolder,
  onCreateWorkspace,
  onOpenUploadForFolder,
  onMoveActivity,
}) => {
  const activeFolderId = folders.find((f) =>
    f.activities.some((a) => a.id === activeActivityId),
  )?.id;

  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(activeFolderId ? [activeFolderId] : []),
  );
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [confirmingMove, setConfirmingMove] = useState(false);

  const toggleFolder = (folderId: string): void => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!activeFolderId) return;

    setOpenFolders((prev) => {
      if (prev.has(activeFolderId)) return prev;
      const next = new Set(prev);
      next.add(activeFolderId);
      return next;
    });
  }, [activeFolderId]);

  const openCreateForm = (): void => {
    onChangeNewItemForm({
      title: '',
    });
  };

  const currentWidth = collapsed ? 0 : width;

  const handleDragEnd = (result: DropResult): void => {
    const destinationFolderId = result.destination?.droppableId;

    if (!destinationFolderId) {
      return;
    }

    const sourceFolder = folders.find((folder) =>
      folder.activities.some((activity) => activity.id === result.draggableId),
    );
    const targetFolder = folders.find((folder) => folder.id === destinationFolderId);
    const activity = sourceFolder?.activities.find((item) => item.id === result.draggableId);

    if (!sourceFolder || !targetFolder || !activity) {
      return;
    }

    if (sourceFolder.id === targetFolder.id) {
      return;
    }

    setPendingMove({
      activityId: result.draggableId,
      activityTitle: activity.title,
      sourceFolderId: sourceFolder.id,
      sourceFolderName: sourceFolder.name,
      targetFolderId: targetFolder.id,
      targetFolderName: targetFolder.name,
    });
  };

  const handleConfirmMove = async (): Promise<void> => {
    if (!pendingMove) {
      return;
    }

    setConfirmingMove(true);
    try {
      await onMoveActivity(pendingMove.activityId, pendingMove.targetFolderId);
      setPendingMove(null);
    } finally {
      setConfirmingMove(false);
    }
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
      style={{ width: `${currentWidth}px`, minWidth: `${currentWidth}px` }}
    >
      <div className={styles.header}>
        <span className={styles.headerLabel}>Arquivos &amp; WS</span>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleCollapse}
          title="Recolher sidebar"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
      <div className={styles.scrollArea}>
        {/* Workspaces section */}
        <div className={styles.sectionLabel}>Workspaces</div>

        <button
          type="button"
          className={styles.addWorkspaceMinimal}
          onClick={() => {
            void onCreateWorkspace();
          }}
          title="Criar workspace em branco"
        >
          <span>+ Novo Workspace</span>
        </button>

        <Droppable droppableId="workspace-pool">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {workspaces.map((ws, index) => (
                <Draggable key={ws.id} draggableId={ws.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      role="button"
                      tabIndex={0}
                      className={`${styles.activityItem} ${activeActivityId === ws.id ? styles.activityItemActive : ''} ${dragSnapshot.isDragging ? styles.activityDragging : ''}`}
                      onClick={() => onSelectActivity(ws)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectActivity(ws)}
                    >
                      <span className={styles.activityIcon}>■</span>
                      <span className={styles.activityLabel}>{ws.title}</span>
                      <span className={`${styles.badge} ${styles.badgeLive}`}>ao vivo</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Exercises section */}
        <div className={styles.sectionLabel}>Exercícios</div>
        {folders.map((folder) => {
          const isOpen = openFolders.has(folder.id);
          return (
            <Droppable key={folder.id} droppableId={folder.id}>
              {(provided, snapshot) => (
            <div key={folder.id} ref={provided.innerRef} {...provided.droppableProps}>
              <div
                role="button"
                tabIndex={0}
                className={`${styles.folderRow} ${snapshot.isDraggingOver ? styles.folderRowDragOver : ''}`}
                onClick={() => toggleFolder(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && toggleFolder(folder.id)}
              >
                <span className={styles.folderIcon}>📁</span>
                <span className={styles.folderName}>{folder.name}</span>
                <ChevronRight
                  size={12}
                  className={`${styles.folderChevron} ${isOpen ? styles.folderChevronOpen : ''}`}
                />
              </div>

              {isOpen && (
                <div className={styles.folderChildren}>
                  {folder.activities.length === 0 ? (
                    <div className={styles.emptyFolder}>Vazio</div>
                  ) : (
                    folder.activities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            role="button"
                            tabIndex={0}
                            className={`${styles.activityItem} ${
                              activeActivityId === activity.id ? styles.activityItemActive : ''
                            } ${dragSnapshot.isDragging ? styles.activityDragging : ''}`}
                            onClick={() => onSelectActivity(activity)}
                            onKeyDown={(e) => e.key === 'Enter' && onSelectActivity(activity)}
                          >
                            <span className={styles.activityIcon}>📄</span>
                            <span className={styles.activityLabel}>{activity.title}</span>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}

                  <button
                    type="button"
                    className={styles.newFileBtn}
                    onClick={() => onOpenUploadForFolder(folder.id)}
                  >
                    + Novo Arquivo
                  </button>
                </div>
              )}
            </div>
              )}
            </Droppable>
          );
        })}
      </div>
      </DragDropContext>

      <div className={styles.footer}>
        {newItemForm ? (
          <div className={styles.createForm}>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Nome da pasta"
              value={newItemForm.title}
              onChange={(event) => onChangeNewItemForm((prev) => prev ? {
                ...prev,
                title: event.target.value,
              } : prev)}
            />

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.formCancelBtn}
                onClick={() => onChangeNewItemForm(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={styles.formPrimaryBtn}
                onClick={onCreateFolder}
              >
                Criar pasta
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.addBtn} onClick={openCreateForm}>
            + Nova pasta
          </button>
        )}
      </div>

      {!collapsed && (
        <div
          className={styles.resizeHandle}
          role="separator"
          aria-orientation="vertical"
          onMouseDown={onResizeStart}
        />
      )}

      <Modal
        isOpen={pendingMove !== null}
        onClose={() => {
          if (!confirmingMove) {
            setPendingMove(null);
          }
        }}
        title="Confirmar Movimentação"
        size="sm"
      >
        {pendingMove && (
          <div className={styles.moveConfirmBody}>
            <p className={styles.moveConfirmText}>
              Deseja mover a atividade <strong>{pendingMove.activityTitle}</strong>?
            </p>

            <div className={styles.moveFlowRow}>
              <div className={styles.moveFolderBox}>
                <FolderClosed size={14} />
                <div className={styles.moveFolderInfo}>
                  <span className={styles.moveFolderLabel}>De</span>
                  <span className={styles.moveFolderName}>{pendingMove.sourceFolderName}</span>
                </div>
              </div>

              <ArrowRight size={16} className={styles.moveArrow} />

              <div className={`${styles.moveFolderBox} ${styles.moveFolderTarget}`}>
                <FolderClosed size={14} />
                <div className={styles.moveFolderInfo}>
                  <span className={styles.moveFolderLabel}>Para</span>
                  <span className={styles.moveFolderName}>{pendingMove.targetFolderName}</span>
                </div>
              </div>
            </div>

            <div className={styles.moveConfirmActions}>
              <button
                type="button"
                className={styles.moveCancelBtn}
                onClick={() => setPendingMove(null)}
                disabled={confirmingMove}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.moveConfirmBtn}
                onClick={() => {
                  void handleConfirmMove();
                }}
                disabled={confirmingMove}
              >
                {confirmingMove ? 'Movendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </aside>
  );
};
