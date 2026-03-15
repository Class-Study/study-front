import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import { ActivityType } from '@/types/studentProfile.types';
import studentService from '@/services/api/student.service';
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

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { student, notes, activities, folders, stats, loading, error, accountInactive, fetchAll } = useMyProfile();
  const { fetchLevelProfiles, getProfileById } = useLevelProfiles();
  const [newPublicNote, setNewPublicNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<'success' | 'error' | null>(null);
  const noteFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void fetchLevelProfiles();
    void fetchAll();
  }, [fetchAll, fetchLevelProfiles]);

  useEffect(() => {
    if (accountInactive) {
      navigate('/account-inactive', { replace: true });
    }
  }, [accountInactive, navigate]);

  useEffect(() => {
    return () => {
      if (noteFeedbackTimerRef.current) {
        clearTimeout(noteFeedbackTimerRef.current);
      }
    };
  }, []);

  const workspacePath = '/student/workspace';

  const handleSavePublicNote = async (): Promise<void> => {
    if (!newPublicNote.trim() || noteSaving) {
      return;
    }

    if (noteFeedbackTimerRef.current) {
      clearTimeout(noteFeedbackTimerRef.current);
    }

    setNoteSaving(true);
    try {
      await studentService.saveMyNote({
        type: 'PUBLIC',
        content: newPublicNote.trim(),
      });
      setNewPublicNote('');
      setNoteFeedback('success');
      await fetchAll();
    } catch {
      setNoteFeedback('error');
    } finally {
      setNoteSaving(false);
      noteFeedbackTimerRef.current = setTimeout(() => {
        setNoteFeedback(null);
      }, 3000);
    }
  };

  const profile = getProfileById(student?.levelProfileId);
  const levelCode = profile?.code ?? 'basic';
  const levelName = profile?.name ?? 'Sem nível';
  const levelTone = getLevelTone(levelCode);

  const exerciseDone = stats?.activitiesCompleted ?? 0;
  const exerciseTotal = stats?.activitiesTotal ?? 0;
  const exercisePercent = exerciseTotal > 0 ? Math.round((exerciseDone / exerciseTotal) * 100) : 0;

  const classesDone = stats?.classesThisMonth ?? 0;
  const classesTotal = stats?.classesTotal ?? 0;
  const classesPercent = classesTotal > 0 ? Math.round((classesDone / classesTotal) * 100) : 0;

  const overallPercent = clampPercent(stats?.overallProgress ?? 0);

  // Only PUBLIC notes are shown to the student
  const publicNotes = useMemo(() => notes.filter((n) => n.type === 'PUBLIC'), [notes]);

  const exerciseSections = useMemo(() => {
    const exercises = activities.filter((a) => a.type === 'EXERCISE');
    const grouped = new Map<string, typeof exercises>();
    exercises.forEach((a) => {
      grouped.set(a.folderId, [...(grouped.get(a.folderId) ?? []), a]);
    });

    const knownIds = new Set<string>();
    const sections = folders.map((f) => {
      knownIds.add(f.id);
      return { id: f.id, name: f.name, position: f.position, activities: grouped.get(f.id) ?? [] };
    });

    exercises.forEach((a) => {
      if (!knownIds.has(a.folderId)) {
        knownIds.add(a.folderId);
        sections.push({
          id: a.folderId,
          name: a.folderName || 'Sem pasta',
          position: Number.MAX_SAFE_INTEGER,
          activities: exercises.filter((x) => x.folderId === a.folderId),
        });
      }
    });

    return sections.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [activities, folders]);

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
                  </div>

                  <div className={styles.heroDetails}>
                    <span>📅 {formatClassDays(student.classDays)} às {formatClassTime(student.classTime)}</span>
                    <span>📄 {stats ? `${exerciseDone}/${exerciseTotal} exercícios` : '—'}</span>
                    {student.meetLink && (
                      <a className={styles.meetLink} href={student.meetLink} target="_blank" rel="noreferrer">
                        Link da aula
                      </a>
                    )}
                  </div>
                </div>

                <div className={styles.heroActions}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnWorkspace}`}
                    onClick={() => navigate(workspacePath)}
                  >
                    ⊞ Workspace
                  </button>

                  {student.meetLink && (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnMeet}`}
                      onClick={() => window.open(student.meetLink!, '_blank', 'noopener,noreferrer')}
                    >
                      🎥 Entrar na aula
                    </button>
                  )}
                </div>
              </section>

              {/* Stats */}
              <section className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <div className={styles.statLabel}>EXERCÍCIOS</div>
                  <div className={styles.statNumber}>{stats ? `${exerciseDone}/${exerciseTotal}` : '—'}</div>
                  <div className={styles.statSubtitle}>entregues</div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${exercisePercent}%`, background: 'var(--color-accent-2)' }} />
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statLabel}>AULAS</div>
                  <div className={styles.statNumber}>{stats ? `${classesDone}/${classesTotal}` : '—'}</div>
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
                        <div className={styles.folderHeading}>📁 {folder.name}</div>
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
                            onClick={() => navigate(workspacePath)}
                            onKeyDown={(e) => e.key === 'Enter' && navigate(workspacePath)}
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

          <div className={styles.noteForm}>
            <textarea
              className={styles.noteInput}
              placeholder="Escreva uma nota pública para seu professor..."
              value={newPublicNote}
              onChange={(event) => setNewPublicNote(event.target.value)}
              disabled={noteSaving}
            />
            {noteFeedback === 'success' && (
              <span className={styles.feedbackSuccess}>Nota pública salva com sucesso!</span>
            )}
            {noteFeedback === 'error' && (
              <span className={styles.feedbackError}>Erro ao salvar a nota. Tente novamente.</span>
            )}
            <button
              type="button"
              className={styles.noteSaveBtn}
              onClick={() => {
                void handleSavePublicNote();
              }}
              disabled={noteSaving || !newPublicNote.trim()}
            >
              {noteSaving ? 'Salvando...' : 'Salvar Nota Pública'}
            </button>
          </div>

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
    </div>
  );
};

export default MyProfilePage;
