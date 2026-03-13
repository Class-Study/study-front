import { useState, useCallback } from 'react';
import { Student } from '@/types/student.types';
import studentService from '@/services/api/student.service';

interface UseStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  getStudentById: (id: string) => Promise<Student>;
}

export const useStudents = (): UseStudentsReturn => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.listAll();
      setStudents(data);
    } catch {
      setError('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }, []);

  const getStudentById = useCallback(async (id: string): Promise<Student> => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.getById(id);
      return data;
    } catch {
      setError('Erro ao carregar aluno');
      throw new Error('Erro ao carregar aluno');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    students,
    loading,
    error,
    fetchStudents,
    getStudentById,
  };
};
