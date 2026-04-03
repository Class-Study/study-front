import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calendar, Clock, User } from 'lucide-react';
import { useStudentSchedule } from '@/hooks/useStudentSchedule';
import { formatClassDays } from '@/utils/classDay.utils';
import styles from './StudentScheduleTab.module.css';

export const StudentScheduleTab: React.FC = () => {
  const navigate = useNavigate();
  const {
    studentName,
    classDays,
    classTime,
    classDuration,
    teacherName,
    classDates,
    loading,
    error
  } = useStudentSchedule();

  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const classListRef = useRef<HTMLDivElement>(null);
  const currentClassRef = useRef<HTMLDivElement>(null);

  // Scroll automático para a aula atual quando os dados carregarem
  useEffect(() => {
    if (!loading && classDates.length > 0) {
      const timer = setTimeout(() => {
        if (currentClassRef.current && classListRef.current) {
          const container = classListRef.current;
          const currentElement = currentClassRef.current;
          
          // offsetTop do elemento é relativo ao offsetParent,
          // precisamos da posição relativa ao container de scroll
          const scrollTop = currentElement.offsetTop - container.offsetTop;
          
          container.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [loading, classDates]);

  if (loading) {
    return <div className={styles.loading}>Carregando agenda...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  // Encontrar a próxima aula
  const nextClass = classDates.find(classDate => classDate.isNextClass || classDate.isToday);

  const classTypeLabel: Record<string, string> = {
    RECORRENTE: 'Recorrente',
    EXTRA: 'Extra',
    REMARCADA: 'Remarcada',
  };

  const classTypeBadgeClass: Record<string, string> = {
    RECORRENTE: styles.badgeRecorrente,
    EXTRA: styles.badgeExtra,
    REMARCADA: styles.badgeRemarcada,
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Minhas Aulas</h2>
        <p className={styles.subtitle}>Acompanhe suas aulas</p>
      </div>

      {/* Card da próxima aula em destaque */}
      {nextClass && (
        <div
          className={`${styles.nextClassCard} ${nextClass.isToday ? styles.nextClassCardToday : ''}`}
          onClick={nextClass.isToday ? () => navigate('/me/workspace') : undefined}
          role={nextClass.isToday ? 'button' : undefined}
          tabIndex={nextClass.isToday ? 0 : undefined}
          onKeyDown={nextClass.isToday ? (e) => e.key === 'Enter' && navigate('/me/workspace') : undefined}
        >
          <div className={styles.nextClassHeader}>
            <h3 className={styles.nextClassTitle}>
              {nextClass.isToday
                ? <><span className={styles.pulseDot} />Aula Agora</>
                : '→ Próxima Aula'
              }
            </h3>
            <span className={`${styles.classTypeBadge} ${classTypeBadgeClass[nextClass.classType]}`}>
              {classTypeLabel[nextClass.classType]}
            </span>
          </div>
          <div className={styles.nextClassContent}>
            <div className={styles.nextClassDate}>
              <Calendar size={16} />
              <span>{nextClass.date.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}</span>
            </div>
            <div className={styles.nextClassTime}>
              <Clock size={16} />
              <span>{nextClass.time.substring(0, 5)} ({classDuration} min)</span>
            </div>
            <div className={styles.nextClassTeacher}>
              <User size={16} />
              <span>{teacherName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Informações da aula (colapsável) */}
      <div className={styles.classInfo}>
        <div className={styles.infoCard}>
          <div className={styles.infoHeader} onClick={() => setIsInfoExpanded(!isInfoExpanded)}>
            <h3 className={styles.infoTitle}>Informações da Aula</h3>
            <button className={styles.toggleBtn}>
              {isInfoExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {isInfoExpanded && (
            <div className={styles.infoContent}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Aluno:</span>
                  <span className={styles.infoValue}>{studentName}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Dias da Semana:</span>
                  <span className={styles.infoValue}>
                    {formatClassDays(classDays)}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Horário:</span>
                  <span className={styles.infoValue}>
                    {classTime.substring(0, 5)}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Duração:</span>
                  <span className={styles.infoValue}>
                    {classDuration} minutos
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Professor:</span>
                  <span className={styles.infoValue}>
                    {teacherName}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de aulas com scroll próprio */}
      <div className={styles.classListSection}>
        <h3 className={styles.sectionTitle}>Cronograma de Aulas</h3>
        
        {classDates.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma aula programada encontrada.</p>
          </div>
        ) : (
          <div className={styles.classListContainer}>
            <div className={styles.classList} ref={classListRef}>
              {classDates.map((classDate) => {
                const isCurrentClass = classDate.isToday || classDate.isNextClass;
                return (
                  <div 
                    key={classDate.id}
                    ref={isCurrentClass ? currentClassRef : null}
                    className={`${styles.classItem} ${
                      classDate.isPast ? styles.past : ''
                    } ${
                      classDate.isToday ? styles.today : ''
                    } ${
                      classDate.isNextClass ? styles.next : ''
                    }`}
                  >
                  <div className={styles.classDate}>
                    <div className={styles.dateDay}>
                      {classDate.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className={styles.dateNumber}>
                      {classDate.date.getDate()}
                    </div>
                    <div className={styles.dateMonth}>
                      {classDate.date.toLocaleDateString('pt-BR', { month: 'short' })}
                    </div>
                  </div>
                  
                  <div className={styles.classDetails}>
                    <div className={styles.classTime}>
                      {classDate.time.substring(0, 5)}
                    </div>
                    <div className={styles.classDuration}>
                      {classDuration} min
                    </div>
                  </div>
                  
                  <div className={styles.classStatus}>
                    {classDate.isPast && <span className={styles.statusCompleted}>✓ Realizada</span>}
                    {classDate.isToday && <span className={styles.statusToday}><span className={styles.pulseDotSmall} />Hoje</span>}
                    {classDate.isNextClass && <span className={styles.statusNext}>→ Próxima</span>}
                    {!classDate.isPast && !classDate.isToday && !classDate.isNextClass && (
                      <span className={styles.statusScheduled}>⏰ Agendada</span>
                    )}
                    <span className={`${styles.classTypeTag} ${classTypeBadgeClass[classDate.classType]}`}>
                      {classTypeLabel[classDate.classType]}
                    </span>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
