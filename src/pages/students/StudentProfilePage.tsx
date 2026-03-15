import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useStudents } from '@/hooks/useStudents';
import studentService from '@/services/api/student.service';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { Student } from '@/types/student.types';
import { ActivityType } from '@/types/studentProfile.types';
import { formatClassDays, formatClassTime, formatShortDate } from '@/utils/classDay.utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import styles from './StudentProfilePage.module.css';

type NoteTab = 'private' | 'public';
type LevelTone = 'basic' | 'intermediate' | 'advanced';

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'EXERCISE':
      return 'var(--color-accent)';
    case 'WORKSPACE':
      return 'var(--color-blue)';
    default:
      return 'var(--color-text-tertiary)';
  }
};

const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?';
  return name
    .trim()
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const getAvatarTone = (name: string): string => {
  const tones = [
    'var(--color-accent-2)',
    'var(--color-blue)',
    'var(--color-accent)',
    'var(--color-success)',
    'var(--color-danger)',
  ];
  if (!name || name.trim() === '') return tones[0];
  return tones[name.charCodeAt(0) % tones.length];
};

const getLevelTone = (code?: string): LevelTone => {
  if (code === 'intermediate') return 'intermediate';
  if (code === 'advanced') return 'advanced';
  return 'basic';
};

export const StudentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getStudentById } = useStudents();
  const { fetchLevelProfiles, getProfileById } = useLevelProfiles();
  const {
    notes,
    activities,
    stats,
    loadingNotes,
    savingNote,
    fetchNotes,
    fetchActivities,
    fetchStats,
    saveNote,
  } = useStudentProfile(id ?? '');
  const [student, setStudent] = useState<Student | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; action: 'block' | 'unblock' }>({ isOpen: false, action: 'block' });
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notesTab, setNotesTab] = useState<NoteTab>('private');
  const [privateNoteDraft, setPrivateNoteDraft] = useState('');
  const [publicNoteDraft, setPublicNoteDraft] = useState('');

  const profile = getProfileById(student?.levelProfileId);
  const levelCode = profile?.code ?? 'basic';
  const levelName = profile?.name ?? 'Sem nivel';
  const levelTone = getLevelTone(levelCode);

  const exerciseDone = stats?.activitiesCompleted ?? 0;
  const exerciseTotal = stats?.activitiesTotal ?? 0;
  const exercisePercent = exerciseTotal > 0
    ? Math.round((exerciseDone / exerciseTotal) * 100)
    : 0;

  const classesDone = stats?.classesThisMonth ?? 0;
  const classesTotal = stats?.classesTotal ?? 0;
  const classesPercent = classesTotal > 0
    ? Math.round((classesDone / classesTotal) * 100)
    : 0;

  const overallPercent = clampPercent(stats?.overallProgress ?? 0);

  const filteredNotes = useMemo(
    () => notes.filter((n) => n.type === (notesTab === 'private' ? 'PRIVATE' : 'PUBLIC')),
    [notes, notesTab],
  );

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Alunos', path: '/dashboard' },
    { label: student?.name ?? 'Carregando...' },
  ];

  useEffect(() => {
    if (!id) return;

    setPageLoading(true);
    setPageError('');

    Promise.all([
      getStudentById(id).then(setStudent),
      fetchLevelProfiles(),
      fetchNotes(),
      fetchActivities(),
      fetchStats(),
    ])
      .catch(() => setPageError('Erro ao carregar perfil do aluno'))
      .finally(() => setPageLoading(false));
  }, [id, getStudentById, fetchLevelProfiles, fetchNotes, fetchActivities, fetchStats]);

  const handleBlockClick = (): void => {
    setConfirmModal({ isOpen: true, action: 'block' });
  };

  const handleUnblockClick = (): void => {
    setConfirmModal({ isOpen: true, action: 'unblock' });
  };

  const handleConfirmAction = async (): Promise<void> => {
    if (!student) return;
    setBlocking(true);
    try {
      if (confirmModal.action === 'block') {
        await studentService.block(student.id);
        setStudent(prev => prev ? { ...prev, status: 'BLOCKED' } : prev);
      } else {
        await studentService.unblock(student.id);
        setStudent(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
      }
      setConfirmModal({ isOpen: false, action: 'block' });
    } catch {
      alert(`Erro ao ${confirmModal.action === 'block' ? 'bloquear' : 'desbloquear'} aluno.`);
    } finally {
      setBlocking(false);
    }
  };

  const handleSaveNote = async (): Promise<void> => {
    const content = notesTab === 'private' ? privateNoteDraft : publicNoteDraft;
    const success = await saveNote(notesTab === 'private' ? 'PRIVATE' : 'PUBLIC', content);

    if (success) {
      if (notesTab === 'private') {
        setPrivateNoteDraft('');
      } else {
        setPublicNoteDraft('');
      }
    }
  };

  const heroCardClass = `${styles.heroCard} ${
    levelTone === 'basic'
      ? styles.heroCardBasic
      : levelTone === 'intermediate'
        ? styles.heroCardIntermediate
        : styles.heroCardAdvanced
  }`;

  const levelTagClass = `${styles.levelTag} ${
    levelTone === 'basic'
      ? styles.levelTagBasic
      : levelTone === 'intermediate'
        ? styles.levelTagIntermediate
        : styles.levelTagAdvanced
  }`;

  return (
    <div className={styles.page}>
      <Header
        breadcrumbItems={breadcrumbItems}
      />

      <div className={styles.layout}>
        <main className={styles.main}>
          {pageLoading && <p className={styles.loading}>Carregando...</p>}
          {pageError && <p className={styles.errorMsg}>{pageError}</p>}

          {!pageLoading && !pageError && student && (
            <>
              <section className={heroCardClass}>
                <div
                  className={styles.heroAvatar}
                  style={{ backgroundColor: getAvatarTone(student.name) }}
                >
                  {getInitials(student.name)}
                </div>

                <div className={styles.heroInfo}>
                  <h1 className={styles.heroName}>{student.name}</h1>

                  <div className={styles.heroMeta}>
                    <span className={levelTagClass}>{levelName}</span>
                    <span
                      className={
                        student.status === 'ACTIVE'
                          ? styles.statusActive
                          : styles.statusBlocked
                      }
                    >
                      {student.status === 'ACTIVE' ? '● Ativo' : '● Bloqueado'}
                    </span>
                  </div>

                  <div className={styles.heroDetails}>
                    <span>
                      📅 {formatClassDays(student.classDays)} as {formatClassTime(student.classTime)}
                    </span>
                    <span>📄 {stats ? `${exerciseDone}/${exerciseTotal} exercicios` : '—'}</span>
                    {student.meetLink && (
                      <a
                        className={styles.meetLink}
                        href={student.meetLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Link da aula
                      </a>
                    )}
                  </div>
                </div>

                <div className={styles.heroActions}>
                  {student.status === 'BLOCKED' ? (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnUnblock}`}
                      onClick={handleUnblockClick}
                      disabled={blocking}
                    >
                      ✓ Desbloquear
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnBlock}`}
                      onClick={handleBlockClick}
                      disabled={blocking}
                    >
                      🔒 Bloquear
                    </button>
                  )}

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnWorkspace}`}
                    onClick={() => navigate(`/dashboard/student/${student.id}/workspace`)}
                  >
                    ⊞ Workspace
                  </button>

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnMeet}`}
                    onClick={() => {
                      if (student.meetLink) {
                        window.open(student.meetLink, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    disabled={!student.meetLink}
                  >
                    🎥 Entrar na aula
                  </button>
                </div>
              </section>

              <section className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <div className={styles.statLabel}>EXERCICIOS</div>
                  <div className={styles.statNumber}>
                    {stats ? `${exerciseDone}/${exerciseTotal}` : '—'}
                  </div>
                  <div className={styles.statSubtitle}>entregues</div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${exercisePercent}%`, background: 'var(--color-accent-2)' }}
                    />
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statLabel}>AULAS</div>
                  <div className={styles.statNumber}>
                    {stats ? `${classesDone}/${classesTotal}` : '—'}
                  </div>
                  <div className={styles.statSubtitle}>do mes</div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${classesPercent}%`, background: 'var(--color-accent)' }}
                    />
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statLabel}>PROGRESSO GERAL</div>
                  <div className={styles.statNumber}>{overallPercent}%</div>
                  <div className={styles.statSubtitle}>progresso</div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${overallPercent}%`, background: 'var(--color-blue)' }}
                    />
                  </div>
                </article>
              </section>

              <section className={styles.activitiesCard}>
                <h2 className={styles.activitiesTitle}>📋 Atividades</h2>

                {activities.length === 0 ? (
                  <p className={styles.emptyState}>Nenhuma atividade ainda.</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className={styles.activityItem}>
                      <span
                        className={styles.activityDot}
                        style={{ backgroundColor: getActivityColor(activity.type) }}
                      />
                      <div className={styles.activityInfo}>
                        <div className={styles.activityTitle}>{activity.title}</div>
                        <div className={styles.activityFolder}>{activity.folderName}</div>
                      </div>
                      <div className={styles.activityDate}>{formatShortDate(activity.createdAt)}</div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </main>

        <aside className={styles.notesPanel}>
          <h3 className={styles.panelTitle}>NOTAS</h3>

          <div className={styles.notesTabs}>
            <button
              type="button"
              className={`${styles.notesTab} ${notesTab === 'private' ? styles.notesTabActive : ''}`}
              onClick={() => setNotesTab('private')}
            >
              🔒 Privada
            </button>
            <button
              type="button"
              className={`${styles.notesTab} ${notesTab === 'public' ? styles.notesTabActive : ''}`}
              onClick={() => setNotesTab('public')}
            >
              👁 Publica
            </button>
          </div>

          <textarea
            className={styles.notesTextarea}
            rows={5}
            value={notesTab === 'private' ? privateNoteDraft : publicNoteDraft}
            onChange={(event) => {
              if (notesTab === 'private') {
                setPrivateNoteDraft(event.target.value);
              } else {
                setPublicNoteDraft(event.target.value);
              }
            }}
            placeholder={
              notesTab === 'private'
                ? 'Observacoes internas...'
                : 'Observacoes visiveis ao aluno...'
            }
          />

          <button
            type="button"
            className={styles.saveNoteBtn}
            onClick={handleSaveNote}
            disabled={savingNote}
          >
            {savingNote ? 'Salvando...' : 'Salvar nota'}
          </button>

          <h4 className={styles.historyTitle}>HISTORICO</h4>
          <div className={styles.historyList}>
            {loadingNotes ? (
              <p className={styles.emptyState}>Carregando notas...</p>
            ) : filteredNotes.length === 0 ? (
              <p className={styles.emptyState}>Nenhuma nota ainda.</p>
            ) : (
              filteredNotes.map((note) => (
                <div key={note.id} className={styles.historyItem}>
                  <span className={styles.historyDate}>{formatShortDate(note.createdAt)}</span>
                  <span className={styles.historyText}>{note.content}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        loading={blocking}
        title={confirmModal.action === 'block'
          ? `Bloquear ${student?.name}?`
          : `Desbloquear ${student?.name}?`
        }
        description={confirmModal.action === 'block'
          ? 'O aluno não conseguirá mais fazer login na plataforma. Você poderá desbloquear a qualquer momento.'
          : 'O aluno voltará a ter acesso à plataforma normalmente.'
        }
        confirmLabel={confirmModal.action === 'block' ? 'Bloquear' : 'Desbloquear'}
        variant={confirmModal.action === 'block' ? 'danger' : 'default'}
      />
    </div>
  );
};

export default StudentProfilePage;
