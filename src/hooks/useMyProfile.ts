import { useCallback, useState } from 'react';
import axios from 'axios';
import studentService from '@/services/api/student.service';
import studentProfileService from '@/services/api/studentProfile.service';
import { Student } from '@/types/student.types';
import {
  StudentActivity,
  StudentNote,
} from '@/types/studentProfile.types';

interface UseMyProfileResult {
  student: Student | null;
  notes: StudentNote[];
  activities: StudentActivity[];
  loading: boolean;
  error: string;
  accountInactive: boolean;
  fetchAll: () => Promise<void>;
}

export const useMyProfile = (): UseMyProfileResult => {
  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountInactive, setAccountInactive] = useState(false);

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    setAccountInactive(false);
    try {
      const [profileData, activitiesData, notesData] = await Promise.all([
        studentService.getMe(),
        studentProfileService.getMyActivities(),
        studentProfileService.getMyNotes(),
      ]);
      setStudent(profileData);
      setNotes(notesData);
      setActivities(activitiesData);
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

  return { student, notes, activities, loading, error, accountInactive, fetchAll };
};
