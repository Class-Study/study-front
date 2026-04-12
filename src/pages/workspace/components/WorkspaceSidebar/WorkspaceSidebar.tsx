import React, {useEffect, useState} from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  FolderClosed,
  Link,
  PanelLeftClose,
  Video
} from 'lucide-react';
import {DragDropContext, Draggable, Droppable, DropResult,} from '@hello-pangea/dnd';
import {Modal} from '@/components/ui/Modal/Modal';
import {MaterialType, WorkspaceActivity, WorkspaceFolder, WorkspaceSubfolder} from '@/types/workspace.types';
import styles from './WorkspaceSidebar.module.css';

// ─── Helpers de material ──────────────────────────────────────────────────────

const MATERIAL_ICONS: Record<MaterialType, React.ReactNode> = {
  DOCUMENT: <FileText size={16} />,
  VIDEO: <Video size={16} />,
  LINK: <Link size={16} />,
};

const getMaterialIcon = (materialType?: MaterialType): React.ReactNode =>
  materialType ? (MATERIAL_ICONS[materialType] ?? '📚') : '📚';

/** Retorna true para materiais que abrem em nova aba (VIDEO e LINK) */
const isExternalMaterial = (activity: WorkspaceActivity): boolean =>
  activity.type === 'MATERIAL' &&
  (activity.materialType === 'VIDEO' || activity.materialType === 'LINK') &&
  !!activity.externalUrl;

const handleExternalClick = (activity: WorkspaceActivity): void => {
  if (activity.externalUrl) {
    window.open(activity.externalUrl, '_blank', 'noopener,noreferrer');
  }
};

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
  onCreateWorkspace?: () => void;
  onOpenUploadForFolder: (folderId: string) => void;
  onMoveActivity: (activityId: string, targetFolderId: string) => Promise<void>;
  readOnly?: boolean;
  allowCreate?: boolean;
  allowMove?: boolean;
  allowWorkspaceMove?: boolean;
  allowCreateWorkspace?: boolean;
  allowCreateFolder?: boolean;
  allowUploadToFolder?: boolean;
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
  onMoveActivity,
  readOnly = false,
  allowCreate,
  allowMove,
  allowWorkspaceMove = true,
  allowCreateWorkspace,
  allowCreateFolder,
}) => {
  const canCreate = allowCreate ?? !readOnly;
  const canMove = allowMove ?? !readOnly;
  const canCreateWorkspace = allowCreateWorkspace ?? canCreate;
  const canCreateFolder = allowCreateFolder ?? canCreate;

  const activeFolderId = folders.find((f) => {
    const subfolders = (f.subfolders as WorkspaceSubfolder[]) ?? [];
    return subfolders.some((sf) => sf.activities?.some((a) => a.id === activeActivityId));
  })?.id;

  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(activeFolderId ? [activeFolderId] : []),
  );
  const [openSubfolders, setOpenSubfolders] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set()); // "subfolderId-exercises" ou "subfolderId-materials"
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

  const toggleSubfolder = (subfolderId: string): void => {
    setOpenSubfolders((prev) => {
      const next = new Set(prev);
      if (next.has(subfolderId)) {
        next.delete(subfolderId);
      } else {
        next.add(subfolderId);
      }
      return next;
    });
  };

  const toggleGroup = (groupId: string): void => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
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
    if (!canMove) {
      return;
    }

    if (!allowWorkspaceMove && result.source.droppableId === 'workspace-pool') {
      return;
    }

    const destinationFolderId = result.destination?.droppableId;

    if (!destinationFolderId) {
      return;
    }

    // Busca a pasta source procurando a atividade em subfolders
    const sourceFolder = folders.find((folder) => folder.id === result.source.droppableId);

    const targetFolder = folders.find((folder) => folder.id === destinationFolderId);

    let activity: WorkspaceActivity | undefined;

    if (sourceFolder) {
      const subfolders = (sourceFolder.subfolders as WorkspaceSubfolder[]) ?? [];
      for (const subfolder of subfolders) {
        activity = subfolder.activities?.find((act) => act.id === result.draggableId);
        if (activity) break;
      }
    }

    // Fallback para atividades legado (se ainda existirem em folder.activities)
    if (!activity && sourceFolder?.activities) {
      activity = sourceFolder.activities.find((item) => item.id === result.draggableId);
    }

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

        <Droppable droppableId="workspace-pool">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {workspaces.map((ws, index) => (
                <Draggable
                  key={ws.id}
                  draggableId={ws.id}
                  index={index}
                  isDragDisabled={!canMove || !allowWorkspaceMove}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...(!canMove || !allowWorkspaceMove ? {} : dragProvided.dragHandleProps)}
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

        {canCreateWorkspace && onCreateWorkspace && (
          <button
            type="button"
            className={styles.addWorkspaceMinimal}
            onClick={onCreateWorkspace}
          >
            + Novo Workspace
          </button>
        )}

        {/* Exercises section */}
        <div className={styles.sectionLabel}>Exercícios</div>
        {folders.map((folder) => {
          const isOpen = openFolders.has(folder.id);
          // Conta atividades em subpastas
          const subfolders = (folder.subfolders as WorkspaceSubfolder[]) ?? [];
          const activitiesCount = subfolders
            .reduce((sum: number, sf) => sum + (sf.activities?.length ?? 0), 0);
          
          return (
            <div key={folder.id}>
              {/* PASTA ACCORDION */}
              <div
                role="button"
                tabIndex={0}
                className={`${styles.folderRow}`}
                onClick={() => toggleFolder(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && toggleFolder(folder.id)}
              >
                <span className={styles.folderIcon}>
                  {isOpen ? (
                    <FolderOpen size={20} className={`folderIconAnimated ${isOpen ? 'folderIconOpen' : ''}`} />
                  ) : (
                    <FolderClosed size={20} className="folderIconAnimated" />
                  )}
                </span>
                <span className={styles.folderName}>{folder.name}</span>
                <span className={styles.folderCount}>{activitiesCount}</span>
                <ChevronRight
                  size={12}
                  className={`${styles.folderChevron} ${isOpen ? styles.folderChevronOpen : ''}`}
                />
              </div>

              {/* CONTEÚDO DA PASTA (SUBPASTAS) */}
              {isOpen && (
                <div className={styles.folderChildren}>
                  {!subfolders || subfolders.length === 0 ? (
                    <div className={styles.emptyFolder}>Nenhuma subpasta</div>
                  ) : (
                    subfolders.map((subfolder: WorkspaceSubfolder) => {
                      const isSubfolderOpen = openSubfolders.has(subfolder.id);
                      const exercisesCount = (subfolder.activities ?? []).filter((a: WorkspaceActivity) => a.type === 'EXERCISE').length;
                      const materialsCount = (subfolder.activities ?? []).filter((a: WorkspaceActivity) => a.type === 'MATERIAL').length;

                      return (
                        <div key={subfolder.id} style={{ marginLeft: '12px' }}>
                          {/* SUBPASTA ACCORDION */}
                          <div
                            role="button"
                            tabIndex={0}
                            className={`${styles.folderRow}`}
                            onClick={() => toggleSubfolder(subfolder.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleSubfolder(subfolder.id)}
                          >
                            {isSubfolderOpen ? (
                              <FolderOpen size={16} className={`folderIconAnimated ${isSubfolderOpen ? 'folderIconOpen' : ''}`} />
                            ) : (
                              <FolderClosed size={16} className="folderIconAnimated" />
                            )}
                            <span className={styles.folderName}>{subfolder.name}</span>
                            <ChevronRight
                              size={12}
                              className={`${styles.folderChevron} ${isSubfolderOpen ? styles.folderChevronOpen : ''}`}
                            />
                          </div>

                          {/* CONTEÚDO DA SUBPASTA (EXERCÍCIOS E MATERIAIS) */}
                          {isSubfolderOpen && (
                            <div className={styles.folderChildren}>
                              {/* GRUPO: EXERCÍCIOS */}
                              {exercisesCount > 0 && (
                                <div style={{ marginLeft: '12px' }}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className={`${styles.folderRow}`}
                                    onClick={() => toggleGroup(`${subfolder.id}-exercises`)}
                                    onKeyDown={(e) => e.key === 'Enter' && toggleGroup(`${subfolder.id}-exercises`)}
                                  >
                                    <ClipboardList size={16} className="iconInline" />
                                    <span className={styles.folderName}>Exercícios</span>
                                    <span className={styles.folderCount}>{exercisesCount}</span>
                                    <ChevronRight
                                      size={12}
                                      className={`${styles.folderChevron} ${openGroups.has(`${subfolder.id}-exercises`) ? styles.folderChevronOpen : ''}`}
                                    />
                                  </div>

                                  {/* ATIVIDADES DE EXERCÍCIO */}
                                  {openGroups.has(`${subfolder.id}-exercises`) && (
                                    <div className={styles.folderChildren}>
                                      {(subfolder.activities ?? [])
                                        .filter((a: WorkspaceActivity) => a.type === 'EXERCISE')
                                        .map((activity: WorkspaceActivity) => (
                                            <div
                                            key={activity.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`${styles.activityItem} ${
                                              activeActivityId === activity.id ? styles.activityItemActive : ''
                                            }`}
                                            onClick={() => onSelectActivity(activity)}
                                            onKeyDown={(e) => e.key === 'Enter' && onSelectActivity(activity)}
                                            style={{ marginLeft: '12px' }}
                                          >
                                            <FileText size={14} className="iconInline" />
                                            <span className={styles.activityLabel}>{activity.title}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* GRUPO: MATERIAIS */}
                              {materialsCount > 0 && (
                                <div style={{ marginLeft: '12px' }}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className={`${styles.folderRow}`}
                                    onClick={() => toggleGroup(`${subfolder.id}-materials`)}
                                    onKeyDown={(e) => e.key === 'Enter' && toggleGroup(`${subfolder.id}-materials`)}
                                  >
                                    <BookOpen size={16} className="iconInline" />
                                    <span className={styles.folderName}>Materiais</span>
                                    <span className={styles.folderCount}>{materialsCount}</span>
                                    <ChevronRight
                                      size={12}
                                      className={`${styles.folderChevron} ${openGroups.has(`${subfolder.id}-materials`) ? styles.folderChevronOpen : ''}`}
                                    />
                                  </div>

                                  {/* ATIVIDADES DE MATERIAL */}
                                  {openGroups.has(`${subfolder.id}-materials`) && (
                                    <div className={styles.folderChildren}>
                                      {(subfolder.activities ?? [])
                                        .filter((a: WorkspaceActivity) => a.type === 'MATERIAL')
                                        .map((activity: WorkspaceActivity) => {
                                          const external = isExternalMaterial(activity);
                                          return (
                                            <div
                                              key={activity.id}
                                              role="button"
                                              tabIndex={0}
                                              title={external ? activity.externalUrl : activity.title}
                                              className={`${styles.activityItem} ${
                                                !external && activeActivityId === activity.id
                                                  ? styles.activityItemActive
                                                  : ''
                                              } ${external ? styles.activityItemExternal : ''}`}
                                              onClick={() =>
                                                external
                                                  ? handleExternalClick(activity)
                                                  : onSelectActivity(activity)
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  external
                                                    ? handleExternalClick(activity)
                                                    : onSelectActivity(activity);
                                                }
                                              }}
                                              style={{ marginLeft: '12px' }}
                                            >
                                              <span className={styles.activityIcon}>
                                                {getMaterialIcon(activity.materialType)}
                                              </span>
                                              <span className={styles.activityLabel}>{activity.title}</span>
                                              {external && (
                                                <ExternalLink
                                                  size={10}
                                                  className={styles.externalLinkIcon}
                                                />
                                              )}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* VAZIO */}
                              {exercisesCount === 0 && materialsCount === 0 && (
                                <div className={styles.emptyFolder}>Sem conteúdo</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </DragDropContext>

      {canCreateFolder && (
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
      )}

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
