import { useCallback, useState } from 'react';
import studentService from '@/services/api/student.service';
import studentProfileService from '@/services/api/studentProfile.service';
import { Student } from '@/types/student.types';
import {
  StudentActivity,
  StudentExerciseFolder,
  StudentNote,
  StudentStats,
} from '@/types/studentProfile.types';

interface UseMyProfileResult {
  student: Student | null;
  notes: StudentNote[];
  activities: StudentActivity[];
  folders: StudentExerciseFolder[];
  stats: StudentStats | null;
  loading: boolean;
  error: string;
  fetchAll: (studentId: string) => Promise<void>;
}

export const useMyProfile = (): UseMyProfileResult => {
  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [folders, setFolders] = useState<StudentExerciseFolder[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async (studentId: string): Promise<void> => {
    if (!studentId) {
      setError('Aluno nao identificado. Faca login novamente.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [profileData, notesData, activitiesData, foldersData, statsData] = await Promise.all([
        studentService.getById(studentId),
        studentProfileService.getNotes(studentId),
        studentProfileService.getActivities(studentId),
        studentProfileService.getExerciseFolders(studentId),
        studentProfileService.getStats(studentId),
      ]);
      setStudent(profileData);
      setNotes(notesData);
      setActivities(activitiesData);
      setFolders(foldersData);
      setStats(statsData);
    } catch {
      setError('Erro ao carregar seu perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { student, notes, activities, folders, stats, loading, error, fetchAll };
};
