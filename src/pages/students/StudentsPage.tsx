import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Input } from '@/components/ui/Input/Input';
import { Badge } from '@/components/ui/Badge/Badge';
import { useStudents } from '@/hooks/useStudents';
import styles from './StudentsPage.module.css';

export const StudentsPage: React.FC = () => {
  const { students, loading, error, fetchStudents } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className={styles.container}>
      <Header title="Alunos" breadcrumb="Dashboard › Alunos" />

      <main className={styles.content}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <Input
            type="text"
            placeholder="Buscar aluno por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading && <p className={styles.loading}>Carregando alunos...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && filteredStudents.length > 0 && (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div className={styles.colName}>Nome</div>
              <div className={styles.colEmail}>Email</div>
              <div className={styles.colStatus}>Status</div>
              <div className={styles.colActions}>Ações</div>
            </div>

            {filteredStudents.map((student) => (
              <div key={student.id} className={styles.tableRow}>
                <div className={styles.colName}>{student.name}</div>
                <div className={styles.colEmail}>{student.email}</div>
                <div className={styles.colStatus}>
                  <Badge variant={student.status === 'ACTIVE' ? 'success' : 'error'}>
                    {student.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                  </Badge>
                </div>
                <div className={styles.colActions}>
                  <Link
                    to={`/students/${student.id}`}
                    className={styles.linkButton}
                  >
                    Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredStudents.length === 0 && (
          <p className={styles.empty}>Nenhum aluno encontrado.</p>
        )}
      </main>
    </div>
  );
};
