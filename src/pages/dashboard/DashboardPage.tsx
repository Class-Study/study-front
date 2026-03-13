import React, { useState, useMemo } from 'react';
import { Bell, CreditCard, PlusSquare, Search, Target } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import styles from './DashboardPage.module.css';

interface Student {
  id: string;
  name: string;
  level: 'Básico' | 'Intermediário' | 'Avançado';
  status: 'ACTIVE' | 'BLOCKED';
  classDays: string[];
  classTime: string;
  progress: number;
  activities: number;
  total: number;
}

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Maria Silva',    level: 'Intermediário', status: 'ACTIVE',  classDays: ['Ter', 'Sex'],     classTime: '19:00', progress: 68, activities: 14, total: 20 },
  { id: '2', name: 'João Pereira',   level: 'Básico',        status: 'ACTIVE',  classDays: ['Seg', 'Qua'],     classTime: '18:00', progress: 42, activities: 8,  total: 20 },
  { id: '3', name: 'Carla Mendes',   level: 'Avançado',      status: 'ACTIVE',  classDays: ['Ter', 'Qui'],     classTime: '20:00', progress: 85, activities: 22, total: 25 },
  { id: '4', name: 'Lucas Ferreira', level: 'Intermediário', status: 'BLOCKED', classDays: ['Sex'],            classTime: '17:00', progress: 30, activities: 6,  total: 20 },
  { id: '5', name: 'Ana Rodrigues',  level: 'Básico',        status: 'ACTIVE',  classDays: ['Ter', 'Qui'],     classTime: '09:00', progress: 55, activities: 11, total: 20 },
  { id: '6', name: 'Pedro Costa',    level: 'Avançado',      status: 'ACTIVE',  classDays: ['Sáb'],            classTime: '10:00', progress: 90, activities: 24, total: 25 },
  { id: '7', name: 'Sofia Lima',     level: 'Intermediário', status: 'ACTIVE',  classDays: ['Dom', 'Seg'],     classTime: '18:30', progress: 72, activities: 16, total: 20 },
  { id: '8', name: 'Rafael Souza',   level: 'Básico',        status: 'ACTIVE',  classDays: ['Qui'],            classTime: '19:30', progress: 25, activities: 5,  total: 20 },
];

const DAYS = ['Todos', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

const getLevelClass = (level: Student['level']): LevelClass => {
  switch (level) {
    case 'Básico':
      return 'levelBasic';
    case 'Intermediário':
      return 'levelIntermediate';
    case 'Avançado':
      return 'levelAdvanced';
    default:
      return 'levelBasic';
  }
};

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('alunos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('Todos');

  const filteredStudents = useMemo(() => {
    return MOCK_STUDENTS.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDay =
        selectedDay === 'Todos' || student.classDays.includes(selectedDay);
      return matchesSearch && matchesDay;
    });
  }, [searchQuery, selectedDay]);

  const stats = {
    total: MOCK_STUDENTS.length,
    newThisMonth: Math.floor(MOCK_STUDENTS.length * 0.25),
    thisWeek: 12,
    delivered: Math.floor(MOCK_STUDENTS.reduce((acc, s) => acc + s.activities, 0) / 8),
    blocked: MOCK_STUDENTS.filter((s) => s.status === 'BLOCKED').length,
  };

  return (
    <div className={styles.dashboard}>
      <Header
        title="Alunos"
        breadcrumb="Dashboard › Alunos"
        onNewStudent={() => alert('Funcionalidade em desenvolvimento')}
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
          💳 Cobrança
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'niveis' ? styles.active : ''}`}
          onClick={() => setActiveTab('niveis')}
        >
          🎯 Níveis
        </button>
      </nav>

      <main className={styles.content}>
        <div className={styles.contentInner}>
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
                <div className={styles.statSubtitle}>Segunda a sábado</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>EXERCÍCIOS ENTREGUES</div>
                <div className={styles.statNumber}>{stats.delivered}</div>
                <div className={styles.statSubtitle}>↑ 12% vs semana passada</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>BLOQUEADOS</div>
                <div className={styles.statNumber}>{stats.blocked}</div>
                <div className={styles.statSubtitle}>Aguardando pagamento</div>
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
                {DAYS.map((day) => (
                  <button
                    key={day}
                    className={`${styles.pill} ${selectedDay === day ? styles.pillActive : ''}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Grid */}
            <div className={styles.gridHeader}>
              <h3 className={styles.gridTitle}>Alunos</h3>
              <span className={styles.gridCount}>{filteredStudents.length} encontrados</span>
            </div>

            <div className={styles.grid}>
              {filteredStudents.map((student) => (
                <div key={student.id} className={`${styles.studentCard} ${styles[getLevelClass(student.level)]}`}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.cardAvatar} ${styles[getAvatarToneClass(student.name)]}`}>
                      {getInitials(student.name)}
                    </div>
                    <div className={styles.cardTitle}>{student.name}</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={`${styles.levelTag} ${styles[getLevelClass(student.level)]}`}>
                      {student.level}
                    </span>
                    <span className={`${styles.statusBadge} ${student.status === 'ACTIVE' ? styles.statusActive : styles.statusBlocked}`}>
                      {student.status === 'ACTIVE' ? '● Ativo' : '⊘ Bloqueado'}
                    </span>
                  </div>

                  <div className={styles.classInfo}>
                    📅 {student.classDays.join(', ')} às {student.classTime}
                  </div>

                  <div className={styles.progressSection}>
                    <div className={styles.progressLabel}>
                      Progresso
                      <span className={styles.progressPercent}>{student.progress}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <progress
                        className={`${styles.progressFill} ${styles[getLevelClass(student.level)]}`}
                        value={student.progress}
                        max={100}
                      />
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.activities}>
                      📄 {student.activities}/{student.total}
                    </span>
                    <div className={styles.actionButtons}>
                      <button className={styles.iconBtn} title="Workspace" type="button">
                        <PlusSquare size={14} />
                      </button>
                      <button className={styles.iconBtn} title="Notificação" type="button">
                        <Bell size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {activeTab === 'cobranca' && (
            <div className={styles.placeholder}>
              <CreditCard size={28} className={styles.placeholderIcon} />
              <h2>Cobrança</h2>
              <p>Funcionalidade em desenvolvimento</p>
            </div>
          )}

          {activeTab === 'niveis' && (
            <div className={styles.placeholder}>
              <Target size={28} className={styles.placeholderIcon} />
              <h2>Níveis</h2>
              <p>Funcionalidade em desenvolvimento</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
