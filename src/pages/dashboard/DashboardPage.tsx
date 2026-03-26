import React, { useState, useMemo, useEffect } from 'react';
import { PlusSquare, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useStudents } from '@/hooks/useStudents';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import { ClassDay } from '@/types/student.types';
import { formatClassDays, formatClassTime, DAY_FILTER_OPTIONS } from '@/utils/classDay.utils';
import { NiveisTab } from '@/pages/dashboard/tabs/NiveisTab';
import { BillingTab } from '@/pages/dashboard/tabs/BillingTab';
import styles from './DashboardPage.module.css';

type TabType = 'alunos' | 'cobranca' | 'niveis';

type LevelClass = 'levelBasic' | 'levelIntermediate' | 'levelAdvanced';

const AVATAR_TONE_CLASSES = [
  'avatarTone0',
  'avatarTone1',
  'avatarTone2',
  'avatarTone3',
  'avatarTone4',
  'avatarTone5',
] as const;

const getAvatarToneClass = (name: string): (typeof AVATAR_TONE_CLASSES)[number] => {
  if (!name || name.trim() === '') return 'avatarTone0';
  return AVATAR_TONE_CLASSES[name.charCodeAt(0) % AVATAR_TONE_CLASSES.length];
};

const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?';
  return name
    .trim()
    .split(' ')
    .filter((item) => item.length > 0)
    .slice(0, 2)
    .map((item) => item[0])
    .join('')
    .toUpperCase();
};

const getLevelClassByCode = (code?: string): LevelClass => {
  switch (code) {
    case 'basic':        return 'levelBasic';
    case 'intermediate': return 'levelIntermediate';
    case 'advanced':     return 'levelAdvanced';
    default:             return 'levelBasic';
  }
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { students, loading, error, fetchStudents } = useStudents();
  const { fetchLevelProfiles, getProfileById } = useLevelProfiles();

  const [activeTab, setActiveTab] = useState<TabType>('alunos');
  const [searchQuery, setSearchQuery] = useState('');

  const TODAY_DAY_VALUE = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY_VALUE);
  const TAB_LABELS: Record<TabType, string> = {
    alunos: 'Alunos',
    cobranca: 'Financeiro',
    niveis: 'Níveis & Atividades',
  };

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: TAB_LABELS[activeTab] },
  ];

  const handleNewStudent = () => {
    navigate('/dashboard/student/new');
  };

  // Carrega dados ao montar o componente
  useEffect(() => {
    fetchStudents();
    fetchLevelProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDay =
        selectedDay === 'ALL' ||
        student.classDays.includes(selectedDay as ClassDay);
      return matchesSearch && matchesDay;
    });
  }, [searchQuery, selectedDay, students]);

  const stats = useMemo(() => ({
    total: students.length,
    newThisMonth: students.filter(s => {
      const created = new Date(s.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() &&
             created.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: students.filter(s => s.status === 'ACTIVE').length,
    delivered: students.reduce((acc) => acc + 0, 0), // placeholder
    blocked: students.filter(s => s.status === 'BLOCKED').length,
  }), [students]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Header
          breadcrumbItems={breadcrumbItems}
        />
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'alunos' ? styles.active : ''}`}
            onClick={() => setActiveTab('alunos')}
          >
            👥 Alunos
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'cobranca' ? styles.active : ''}`}
            onClick={() => setActiveTab('cobranca')}
          >
            💳 Financeiro
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'niveis' ? styles.active : ''}`}
            onClick={() => setActiveTab('niveis')}
          >
            🎯 Níveis & Atividades
          </button>
        </nav>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Header
          breadcrumbItems={breadcrumbItems}
        />
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'alunos' ? styles.active : ''}`}
            onClick={() => setActiveTab('alunos')}
          >
            👥 Alunos
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'cobranca' ? styles.active : ''}`}
            onClick={() => setActiveTab('cobranca')}
          >
            💳 Financeiro
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'niveis' ? styles.active : ''}`}
            onClick={() => setActiveTab('niveis')}
          >
            🎯 Níveis & Atividades
          </button>
        </nav>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header
        breadcrumbItems={breadcrumbItems}
      />

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'alunos' ? styles.active : ''}`}
          onClick={() => setActiveTab('alunos')}
        >
          👥 Alunos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cobranca' ? styles.active : ''}`}
          onClick={() => setActiveTab('cobranca')}
        >
          💳 Financeiro
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'niveis' ? styles.active : ''}`}
          onClick={() => setActiveTab('niveis')}
        >
          🎯 Níveis & Atividades
        </button>
      </nav>

      <main className={styles.content}>
        <div className={styles.inner}>
          {activeTab === 'alunos' && (
            <>
            {/* Stats Cards */}
            <div className={styles.statsContainer}>
              <div className={`${styles.statCard} ${styles.primary}`}>
                <div className={styles.statLabel}>TOTAL DE ALUNOS</div>
                <div className={styles.statNumber}>{stats.total}</div>
                <div className={styles.statSubtitle}>{stats.newThisMonth} novos este mês</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>AULAS ESTA SEMANA</div>
                <div className={styles.statNumber}>{stats.thisWeek}</div>
                <div className={styles.statSubtitle}>Segunda a domingo</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>EXERCÍCIOS ENTREGUES</div>
                <div className={styles.statNumber}>{stats.delivered}</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>BLOQUEADOS</div>
                <div className={styles.statNumber}>{stats.blocked}</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className={styles.filterSection}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.dayPills}>
                {DAY_FILTER_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    className={`${styles.pill} ${selectedDay === value ? styles.pillActive : ''}`}
                    onClick={() => setSelectedDay(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Grid */}
            <div className={styles.gridHeader}>
              <h3 className={styles.gridTitle}>Alunos</h3>
              <span className={styles.gridCount}>{filteredStudents.length} encontrados</span>
              <button
                onClick={handleNewStudent}
                className={styles.newStudentBtn}
                type="button"
              >
                + Novo aluno
              </button>
            </div>

            <div className={styles.grid}>
              {filteredStudents.map((student) => {
                const profile = getProfileById(student.levelProfileId);
                const levelName = profile?.name ?? 'Sem nível';
                const levelClass = getLevelClassByCode(profile?.code);
                
                return (
                  <div
                    key={student.id}
                    className={`${styles.studentCard} ${styles[levelClass]}`}
                    onClick={() => navigate(`/dashboard/student/${student.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/dashboard/student/${student.id}`);
                      }
                    }}
                    aria-label={`Ver perfil de ${student.name}`}
                  >
                    <div className={styles.cardHeader}>
                      <div className={`${styles.cardAvatar} ${styles[getAvatarToneClass(student.name)]}`}>
                        {getInitials(student.name)}
                      </div>
                      <div className={styles.cardTitle}>{student.name}</div>
                    </div>

                    <div className={styles.cardMeta}>
                      <span className={`${styles.levelTag} ${styles[levelClass]}`}>
                        {levelName}
                      </span>
                      <span className={`${styles.statusBadge} ${student.status === 'ACTIVE' ? styles.statusActive : styles.statusBlocked}`}>
                        {student.status === 'ACTIVE' ? '● Ativo' : '⊘ Bloqueado'}
                      </span>
                    </div>

                    <div className={styles.classInfo}>
                      📅 {formatClassDays(student.classDays)} às {formatClassTime(student.classTime)}
                    </div>

                    <div className={styles.progressSection}>
                      <div className={styles.progressLabel}>
                        Duração
                        <span className={styles.progressPercent}>{student.classDuration}min</span>
                      </div>
                      <div className={styles.progressBar}>
                        <progress
                          className={`${styles.progressFill} ${styles[levelClass]}`}
                          value={Math.min(student.classDuration, 100)}
                          max={100}
                        />
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.activities}>
                        💰 R$ {student.classRate?.toFixed(2)}
                      </span>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconBtn}
                          title="Abrir Workspace"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/dashboard/student/${student.id}/workspace`);
                          }}
                        >
                          <PlusSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {activeTab === 'cobranca' && (
            <BillingTab />
          )}

          {activeTab === 'niveis' && (
            <NiveisTab />
          )}
        </div>
      </main>
    </div>
  );
};
