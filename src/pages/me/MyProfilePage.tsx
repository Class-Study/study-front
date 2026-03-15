import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { Modal } from '@/components/ui/Modal/Modal';
import { useMyProfile } from '@/hooks/useMyProfile';
import { ActivityType } from '@/types/studentProfile.types';
import { formatClassDays, formatClassTime, formatShortDate } from '@/utils/classDay.utils';
import styles from './MyProfilePage.module.css';

type LevelTone = 'basic' | 'intermediate' | 'advanced';

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'EXERCISE': return 'var(--color-accent)';
    case 'WORKSPACE': return 'var(--color-blue)';
    default: return 'var(--color-text-tertiary)';
  }
};

const getInitials = (name: string): string => {
  if (!name.trim()) return '?';
  return name.trim().split(' ').filter((p) => p.length > 0).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const getAvatarTone = (name: string): string => {
  const tones = ['var(--color-accent-2)', 'var(--color-blue)', 'var(--color-accent)', 'var(--color-success)', 'var(--color-danger)'];
  if (!name.trim()) return tones[0];
  return tones[name.charCodeAt(0) % tones.length];
};

const getLevelTone = (code?: string): LevelTone => {
  if (code === 'intermediate') return 'intermediate';
  if (code === 'advanced') return 'advanced';
  return 'basic';
};

const FOLDER_ORDER = ['TO DO', 'IN PROGRESS', 'VOCABULARY', 'DONE'] as const;

const normalizeFolderName = (name?: string): string => (name ?? '').trim().toUpperCase();

const stripLeadingOrder = (name: string): string => name.replace(/^\s*\d+\s*-\s*/, '').trim();

const getTeacherDetails = (student: NonNullable<ReturnType<typeof useMyProfile>['student']>) => ({
  name: student.teacher?.name ?? student.teacherName ?? 'Professor nao informado',
  email: student.teacher?.email ?? student.teacherEmail ?? 'Email nao informado',
  phone: student.teacher?.phone ?? student.teacherPhone ?? 'Telefone nao informado',
});

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { student, notes, activities, loading, error, accountInactive, fetchAll } = useMyProfile();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (accountInactive) {
      navigate('/account-inactive', { replace: true });
    }
  }, [accountInactive, navigate]);

  const levelCode = student?.levelCode ?? student?.levelProfileCode ?? 'basic';
  const levelName = student?.levelName ?? student?.levelProfileName ?? stripLeadingOrder(student?.levelProfileId ?? 'Sem nivel');
  const levelTone = getLevelTone(levelCode);

  const exerciseActivities = useMemo(
    () => activities.filter((activity) => activity.type === 'EXERCISE'),
    [activities],
  );

  const doneExercises = useMemo(
    () => exerciseActivities.filter((activity) => normalizeFolderName(activity.folderName) === 'DONE').length,
    [exerciseActivities],
  );

  const exerciseTotal = exerciseActivities.length;
  const exercisePercent = exerciseTotal > 0 ? Math.round((doneExercises / exerciseTotal) * 100) : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const classesThisMonth = useMemo(
    () => activities.filter((activity) => {
      if (activity.type !== 'WORKSPACE') return false;
      const date = new Date(activity.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length,
    [activities, currentMonth, currentYear],
  );

  const classesPercent = clampPercent(classesThisMonth * 10);
  const overallPercent = exercisePercent;

  // Only PUBLIC notes are shown to the student
  const publicNotes = useMemo(() => notes.filter((n) => n.type === 'PUBLIC'), [notes]);

  const selectedActivity = useMemo(
    () => exerciseActivities.find((activity) => activity.id === selectedActivityId) ?? null,
    [exerciseActivities, selectedActivityId],
  );

  const exerciseSections = useMemo(() => {
    const grouped = new Map<string, typeof exerciseActivities>();

    exerciseActivities.forEach((activity) => {
      const normalized = stripLeadingOrder(normalizeFolderName(activity.folderName));
      const folderKey = FOLDER_ORDER.includes(normalized as (typeof FOLDER_ORDER)[number])
        ? normalized
        : 'TO DO';

      grouped.set(folderKey, [...(grouped.get(folderKey) ?? []), activity]);
    });

    return FOLDER_ORDER.map((folderName, index) => ({
      id: `${index + 1}-${folderName}`,
      label: `${index + 1} - ${folderName}`,
      activities: grouped.get(folderName) ?? [],
    }));
  }, [exerciseActivities]);

  const teacher = student ? getTeacherDetails(student) : null;
  const studentStatus = student?.status === 'ACTIVE' ? 'Ativo' : student?.status === 'BLOCKED' ? 'Bloqueado' : 'Inativo';

  const heroCardClass = `${styles.heroCard} ${
    levelTone === 'basic' ? styles.heroCardBasic : levelTone === 'intermediate' ? styles.heroCardIntermediate : styles.heroCardAdvanced
  }`;
  const levelTagClass = `${styles.levelTag} ${
    levelTone === 'basic' ? styles.levelTagBasic : levelTone === 'intermediate' ? styles.levelTagIntermediate : styles.levelTagAdvanced
  }`;

  const breadcrumbItems = [{ label: 'Meu Perfil' }];

  if (loading) {
    return (
      <div className={styles.page}>
        <Header breadcrumbItems={breadcrumbItems} />
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Header breadcrumbItems={breadcrumbItems} />
        <div className={styles.errorMsg}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header breadcrumbItems={breadcrumbItems} />

      <div className={styles.layout}>
        <main className={styles.main}>
          {student && (
            <>
              {/* Hero card */}
              <section className={heroCardClass}>
                <div className={styles.heroAvatar} style={{ backgroundColor: getAvatarTone(student.name) }}>
                  {getInitials(student.name)}
                </div>

                <div className={styles.heroInfo}>
                  <div className={styles.heroNameRow}>
                    <h1 className={styles.heroName}>{student.name}</h1>
                  </div>

                  <div className={styles.heroMeta}>
                    <span className={levelTagClass}>{levelName}</span>
                    <span className={styles.studentStatus}>Status: {studentStatus}</span>
                  </div>

                  <div className={styles.heroDetails}>
                    <span>📅 {formatClassDays(student.classDays)} às {formatClassTime(student.classTime)}</span>
                    <span>🖥️ {student.meetPlatform || 'Plataforma nao informada'}</span>
                    {student.meetLink && (
                      <a className={styles.meetLink} href={student.meetLink} target="_blank" rel="noreferrer">
                        Link da aula
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Teacher card */}
              <section className={styles.teacherCard}>
                <h2 className={styles.teacherTitle}>Professor</h2>
                <p className={styles.teacherName}>{teacher?.name}</p>
                <p className={styles.teacherMeta}>{teacher?.email}</p>
                <p className={styles.teacherMeta}>{teacher?.phone}</p>
              </section>

              {/* Stats */}
              <section className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <div className={styles.statLabel}>EXERCÍCIOS</div>
                  <div className={styles.statNumber}>{`${doneExercises}/${exerciseTotal}`}</div>
                  <div className={styles.statSubtitle}>entregues</div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${exercisePercent}%`, background: 'var(--color-accent-2)' }} />
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statLabel}>AULAS</div>
                  <div className={styles.statNumber}>{classesThisMonth}</div>
                  <div className={styles.statSubtitle}>do mês</div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${classesPercent}%`, background: 'var(--color-accent)' }} />
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statLabel}>PROGRESSO GERAL</div>
                  <div className={styles.statNumber}>{overallPercent}%</div>
                  <div className={styles.statSubtitle}>progresso</div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${overallPercent}%`, background: 'var(--color-blue)' }} />
                  </div>
                </article>
              </section>

              {/* Exercises — read-only */}
              <section className={styles.activitiesCard}>
                <div className={styles.activitiesHeader}>
                  <div>
                    <h2 className={styles.activitiesTitle}>MEUS EXERCÍCIOS</h2>
                    <p className={styles.activitiesSubtitle}>Lista de exercícios disponíveis para você.</p>
                  </div>
                </div>

                {exerciseSections.length === 0 ? (
                  <p className={styles.emptyState}>Nenhum exercício disponível no momento.</p>
                ) : (
                  exerciseSections.map((folder) => (
                    <div key={folder.id} className={styles.folderSection}>
                      <div className={styles.folderHeaderRow}>
                        <div className={styles.folderHeading}>📁 {folder.label}</div>
                        <span className={styles.folderCount}>{folder.activities.length} exercício(s)</span>
                      </div>

                      {folder.activities.length === 0 ? (
                        <p className={styles.folderEmpty}>Nenhum exercício nesta pasta.</p>
                      ) : (
                        folder.activities.map((activity) => (
                          <div
                            key={activity.id}
                            role="button"
                            tabIndex={0}
                            className={styles.activityItem}
                            onClick={() => setSelectedActivityId(activity.id)}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedActivityId(activity.id)}
                          >
                            <span className={styles.activityDot} style={{ backgroundColor: getActivityColor(activity.type) }} />
                            <div className={styles.activityInfo}>
                              <div className={styles.activityTitle}>{activity.title}</div>
                              <div className={styles.activityFolder}>{activity.folderName}</div>
                            </div>
                            <div className={styles.activityDate}>{formatShortDate(activity.createdAt)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </main>

        {/* Notes panel — PUBLIC only */}
        <aside className={styles.notesPanel}>
          <h3 className={styles.panelTitle}>ORIENTAÇÕES DO PROFESSOR</h3>
          <p className={styles.panelSubtitle}>Notas públicas deixadas pelo seu professor.</p>

          <div className={styles.historyList}>
            {publicNotes.length === 0 ? (
              <p className={styles.emptyState}>Nenhuma orientação registrada ainda.</p>
            ) : (
              publicNotes.map((note) => (
                <div key={note.id} className={styles.historyItem}>
                  <span className={styles.historyDate}>{formatShortDate(note.createdAt)}</span>
                  <span className={styles.historyText}>{note.content}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      <Modal
        isOpen={Boolean(selectedActivity)}
        onClose={() => setSelectedActivityId(null)}
        title={selectedActivity?.title ?? 'Exercício'}
        size="lg"
      >
        <div className={styles.previewMeta}>Criado em {selectedActivity?.createdAt ? formatShortDate(selectedActivity.createdAt) : '-'}</div>
        <div
          className={styles.previewContent}
          dangerouslySetInnerHTML={{ __html: selectedActivity?.convertedHtml || '<p>Conteudo indisponivel.</p>' }}
        />
      </Modal>
    </div>
  );
};

export default MyProfilePage;
