import { useCallback, useState } from 'react';
import meService from '@/services/api/me.service';
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
  fetchAll: () => Promise<void>;
}

export const useMyProfile = (): UseMyProfileResult => {
  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [folders, setFolders] = useState<StudentExerciseFolder[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const [profileData, notesData, activitiesData, foldersData, statsData] = await Promise.all([
        meService.getProfile(),
        meService.getNotes(),
        meService.getActivities(),
        meService.getFolders(),
        meService.getStats(),
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
