import { useCallback, useState } from 'react';
import axios from 'axios';
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
  accountInactive: boolean;
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
  const [accountInactive, setAccountInactive] = useState(false);

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    setAccountInactive(false);
    try {
      const [profileData, notesData, activitiesData, foldersData, statsData] = await Promise.all([
        studentService.getMe(),
        studentProfileService.getMyNotes(),
        studentProfileService.getMyActivities(),
        studentProfileService.getMyExerciseFolders(),
        studentProfileService.getMyStats(),
      ]);
      setStudent(profileData);
      setNotes(notesData);
      setActivities(activitiesData);
      setFolders(foldersData);
      setStats(statsData);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setAccountInactive(true);
        setError('Sua conta esta inativa. Entre em contato com seu professor.');
      } else {
        setError('Erro ao carregar seu perfil. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { student, notes, activities, folders, stats, loading, error, accountInactive, fetchAll };
};
