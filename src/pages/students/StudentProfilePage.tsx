import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useStudents } from '@/hooks/useStudents';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import { Student } from '@/types/student.types';
import { formatClassDays, formatClassTime } from '@/utils/classDay.utils';
import styles from './StudentProfilePage.module.css';

type NoteTab = 'private' | 'public';
type LevelTone = 'basic' | 'intermediate' | 'advanced';

interface MockActivity {
  id: string;
  title: string;
  folder: string;
  date: string;
  color: string;
}

interface MockNote {
  date: string;
  text: string;
}

const mockActivities: MockActivity[] = [
  {
    id: '1',
    title: 'Vocabulary Basics',
    folder: '1 - TO DO',
    date: '03 Mar',
    color: 'var(--color-accent)',
  },
  {
    id: '2',
    title: 'Pronunciation Drill',
    folder: '2 - IN PROGRESS',
    date: '08 Mar',
    color: 'var(--color-accent-2)',
  },
  {
    id: '3',
    title: 'Grammar Review',
    folder: '3 - DONE',
    date: '10 Mar',
    color: 'var(--color-blue)',
  },
];

const mockNotes: MockNote[] = [
  { date: '05 Mar', text: 'Reforco em pronuncia.' },
  { date: '10 Mar', text: 'Boa evolucao na confianca oral.' },
];

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

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
  const { getStudentById, loading, error } = useStudents();
  const { fetchLevelProfiles, getProfileById } = useLevelProfiles();
  const [student, setStudent] = useState<Student | null>(null);
  const [notesTab, setNotesTab] = useState<NoteTab>('private');
  const [privateNoteDraft, setPrivateNoteDraft] = useState('');
  const [publicNoteDraft, setPublicNoteDraft] = useState('');

  const profile = getProfileById(student?.levelProfileId);
  const levelCode = profile?.code ?? 'basic';
  const levelName = profile?.name ?? 'Sem nivel';
  const levelTone = getLevelTone(levelCode);

  const exerciseDone = student ? Math.min(student.classDuration, 20) : 0;
  const exerciseTotal = 20;

  const classesDone = useMemo(() => {
    if (!student) return 0;
    return Math.min(24, Math.max(student.classDays.length * 2, 1));
  }, [student]);
  const classesTotal = 24;

  const overallProgress = Math.round(
    ((exerciseDone / exerciseTotal) + (classesDone / classesTotal)) * 50,
  );

  const exercisePercent = clampPercent((exerciseDone / exerciseTotal) * 100);
  const classesPercent = clampPercent((classesDone / classesTotal) * 100);
  const overallPercent = clampPercent(overallProgress);

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Alunos', path: '/dashboard' },
    { label: student?.name ?? 'Carregando...' },
  ];

  useEffect(() => {
    if (id) {
      getStudentById(id).then(setStudent).catch(console.error);
    }
  }, [id, getStudentById]);

  useEffect(() => {
    fetchLevelProfiles();
  }, [fetchLevelProfiles]);

  const handleSaveNote = (): void => {
    const noteText = notesTab === 'private' ? privateNoteDraft : publicNoteDraft;
    console.log('Salvar nota:', { tab: notesTab, note: noteText, studentId: student?.id });
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
          {loading && <p className={styles.loading}>Carregando...</p>}
          {error && <p className={styles.errorMsg}>{error}</p>}

          {!loading && !error && student && (
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
                    <span>📄 {exerciseDone}/{exerciseTotal} exercicios</span>
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
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnBlock}`}>
                    🔒 Bloquear
                  </button>

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
                  <div className={styles.statNumber}>{exerciseDone}/{exerciseTotal}</div>
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
                  <div className={styles.statNumber}>{classesDone}/{classesTotal}</div>
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

                {mockActivities.map((activity) => (
                  <div key={activity.id} className={styles.activityItem}>
                    <span className={styles.activityDot} style={{ backgroundColor: activity.color }} />
                    <div className={styles.activityInfo}>
                      <div className={styles.activityTitle}>{activity.title}</div>
                      <div className={styles.activityFolder}>{activity.folder}</div>
                    </div>
                    <div className={styles.activityDate}>{activity.date}</div>
                  </div>
                ))}
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

          <button type="button" className={styles.saveNoteBtn} onClick={handleSaveNote}>
            Salvar nota
          </button>

          <h4 className={styles.historyTitle}>HISTORICO</h4>
          <div className={styles.historyList}>
            {mockNotes.map((note) => (
              <div key={`${note.date}-${note.text}`} className={styles.historyItem}>
                <span className={styles.historyDate}>{note.date}</span>
                <span className={styles.historyText}>{note.text}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StudentProfilePage;
