import React, { useEffect, useState } from 'react';
import { ChevronRight, PanelLeftClose } from 'lucide-react';
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
}) => {
  const activeFolderId = folders.find((f) =>
    f.activities.some((a) => a.id === activeActivityId),
  )?.id;

  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(activeFolderId ? [activeFolderId] : []),
  );

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

        {workspaces.map((ws) => (
          <div
            key={ws.id}
            role="button"
            tabIndex={0}
            className={`${styles.activityItem} ${activeActivityId === ws.id ? styles.activityItemActive : ''}`}
            onClick={() => onSelectActivity(ws)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectActivity(ws)}
          >
            <span className={styles.activityIcon}>■</span>
            <span className={styles.activityLabel}>{ws.title}</span>
            <span className={`${styles.badge} ${styles.badgeLive}`}>ao vivo</span>
          </div>
        ))}

        {/* Exercises section */}
        <div className={styles.sectionLabel}>Exercícios</div>
        {folders.map((folder) => {
          const isOpen = openFolders.has(folder.id);
          return (
            <div key={folder.id}>
              <div
                role="button"
                tabIndex={0}
                className={styles.folderRow}
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
                    folder.activities.map((activity) => (
                      <div
                        key={activity.id}
                        role="button"
                        tabIndex={0}
                        className={`${styles.activityItem} ${
                          activeActivityId === activity.id ? styles.activityItemActive : ''
                        }`}
                        onClick={() => onSelectActivity(activity)}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectActivity(activity)}
                      >
                        <span className={styles.activityIcon}>📄</span>
                        <span className={styles.activityLabel}>{activity.title}</span>
                      </div>
                    ))
                  )}

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
          );
        })}
      </div>

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
    </aside>
  );
};
