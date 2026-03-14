import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useFolders } from '@/hooks/useFolders';
import { useActivities } from '@/hooks/useActivities';
import { Activity } from '@/types/activity.types';
import {
  collectAnswers,
  hasUnansweredInputs,
  processDocxHtml,
} from '@/utils/docxHtmlProcessor';
import styles from './WorkspacePage.module.css';

interface ActivityCardProps {
  activity: Activity;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const exerciseRef = React.useRef<HTMLDivElement>(null);
  const processedHtml = React.useMemo(
    () => processDocxHtml(activity.contentHtml),
    [activity.contentHtml],
  );

  const handleSaveAnswers = (): void => {
    if (!exerciseRef.current) return;

    if (hasUnansweredInputs(exerciseRef.current)) {
      console.warn('Há campos não preenchidos');
    }

    const answers = collectAnswers(exerciseRef.current);
    console.log('Respostas do aluno:', answers);
    // TODO: enviar para API quando endpoint estiver pronto
  };

  return (
    <div className={styles.activityCard}>
      <div className={styles.activityHeader}>
        <h3 className={styles.activityTitle}>{activity.title}</h3>
        <span className={styles.activityType}>
          {activity.type === 'EXERCISE' ? '📝 Exercício' : '💼 Workspace'}
        </span>
      </div>
      <div
        ref={exerciseRef}
        className={`${styles.activityContent} exerciseContent`}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
      <div className={styles.activityActions}>
        <button type="button" className={styles.saveAnswersBtn} onClick={handleSaveAnswers}>
          Salvar respostas
        </button>
      </div>
    </div>
  );
};

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
                      <ActivityCard key={activity.id} activity={activity} />
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
