import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useFolders } from '@/hooks/useFolders';
import { useActivities } from '@/hooks/useActivities';
import styles from './WorkspacePage.module.css';

export const WorkspacePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { folders, fetchFolders } = useFolders();
  const { activities, fetchActivitiesByFolder } = useActivities();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (selectedFolderId) {
      fetchActivitiesByFolder(selectedFolderId);
    }
  }, [selectedFolderId, fetchActivitiesByFolder]);

  return (
    <div className={styles.container}>
      <Header breadcrumb="Dashboard › Workspace" />

      <main className={styles.content}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Pastas</h3>
            <div className={styles.foldersList}>
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <button
                    key={folder.id}
                    className={`${styles.folderItem} ${
                      selectedFolderId === folder.id ? styles.active : ''
                    }`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <span className={styles.folderIcon}>📁</span>
                    <span className={styles.folderName}>{folder.name}</span>
                  </button>
                ))
              ) : (
                <p className={styles.empty}>Nenhuma pasta disponível</p>
              )}
            </div>
          </aside>

          <section className={styles.main}>
            {selectedFolderId ? (
              <>
                <h2 className={styles.mainTitle}>
                  {folders.find((f) => f.id === selectedFolderId)?.name}
                </h2>

                {activities.length > 0 ? (
                  <div className={styles.activitiesList}>
                    {activities.map((activity) => (
                      <div key={activity.id} className={styles.activityCard}>
                        <div className={styles.activityHeader}>
                          <h3 className={styles.activityTitle}>
                            {activity.title}
                          </h3>
                          <span className={styles.activityType}>
                            {activity.type === 'EXERCISE'
                              ? '📝 Exercício'
                              : '💼 Workspace'}
                          </span>
                        </div>
                        <div
                          className={styles.activityContent}
                          dangerouslySetInnerHTML={{ __html: activity.contentHtml }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noActivities}>
                    Nenhuma atividade nesta pasta
                  </p>
                )}
              </>
            ) : (
              <div className={styles.placeholder}>
                <p>Selecione uma pasta para visualizar o conteúdo</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
