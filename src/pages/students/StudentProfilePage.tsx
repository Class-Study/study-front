import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { Badge } from '@/components/ui/Badge/Badge';
import { useStudents } from '@/hooks/useStudents';
import { Student } from '@/types/student.types';
import styles from './StudentProfilePage.module.css';

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getStudentById, loading, error } = useStudents();
  const [student, setStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'folders' | 'billing'>('info');
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

  return (
    <div className={styles.container}>
      <Header
        breadcrumbItems={breadcrumbItems}
      />

      <main className={styles.content}>
        {loading && <p className={styles.loading}>Carregando...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {student && (
          <>
            <div className={styles.profileHeader}>
              <div className={styles.profileInfo}>
                <h1 className={styles.studentName}>{student.name}</h1>
                <p className={styles.studentEmail}>{student.email}</p>
                {student.phone && (
                  <p className={styles.studentPhone}>{student.phone}</p>
                )}
                <Badge
                  variant={
                    student.status === 'ACTIVE' ? 'success' : 'error'
                  }
                >
                  {student.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                </Badge>
              </div>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tabButton} ${
                  activeTab === 'info' ? styles.activeTab : ''
                }`}
                onClick={() => setActiveTab('info')}
              >
                Informações
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === 'folders' ? styles.activeTab : ''
                }`}
                onClick={() => setActiveTab('folders')}
              >
                Pastas
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === 'billing' ? styles.activeTab : ''
                }`}
                onClick={() => setActiveTab('billing')}
              >
                Cobrança
              </button>
            </div>

            {activeTab === 'info' && (
              <div className={styles.tabContent}>
                <div className={styles.card}>
                  <h2>Informações da Aula</h2>
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <label>Dias</label>
                      <p>{student.classDays.join(', ')}</p>
                    </div>
                    <div className={styles.field}>
                      <label>Horário</label>
                      <p>{student.classTime}</p>
                    </div>
                    <div className={styles.field}>
                      <label>Duração</label>
                      <p>{student.classDuration} minutos</p>
                    </div>
                    <div className={styles.field}>
                      <label>Valor/Aula</label>
                      <p>R$ {student.classRate.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'folders' && (
              <div className={styles.tabContent}>
                <div className={styles.card}>
                  <h2>Pastas de Conteúdo</h2>
                  <p className={styles.placeholder}>
                    Nenhuma pasta vinculada no momento.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className={styles.tabContent}>
                <div className={styles.card}>
                  <h2>Informações de Cobrança</h2>
                  <p className={styles.placeholder}>
                    Nenhuma informação de cobrança disponível.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default StudentProfilePage;
