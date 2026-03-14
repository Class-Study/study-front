import { useState, useCallback } from 'react';
import studentProfileService from '@/services/api/studentProfile.service';
import {
  StudentNote,
  StudentActivity,
  StudentStats,
  NoteType,
} from '@/types/studentProfile.types';

export const useStudentProfile = (studentId: string) => {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!studentId) return;
    setLoadingNotes(true);
    try {
      const data = await studentProfileService.getNotes(studentId);
      setNotes(data);
    } catch {
      console.error('Erro ao carregar notas');
    } finally {
      setLoadingNotes(false);
    }
  }, [studentId]);

  const fetchActivities = useCallback(async () => {
    if (!studentId) return;
    setLoadingActivities(true);
    try {
      const data = await studentProfileService.getActivities(studentId);
      setActivities(data);
    } catch {
      console.error('Erro ao carregar atividades');
    } finally {
      setLoadingActivities(false);
    }
  }, [studentId]);

  const fetchStats = useCallback(async () => {
    if (!studentId) return;
    setLoadingStats(true);
    try {
      const data = await studentProfileService.getStats(studentId);
      setStats(data);
    } catch {
      console.error('Erro ao carregar stats');
    } finally {
      setLoadingStats(false);
    }
  }, [studentId]);

  const saveNote = useCallback(
    async (type: NoteType, content: string): Promise<boolean> => {
      if (!studentId || !content.trim()) return false;
      setSavingNote(true);
      try {
        const newNote = await studentProfileService.createNote(studentId, {
          type,
          content: content.trim(),
        });
        setNotes((prev) => [newNote, ...prev]);
        return true;
      } catch {
        console.error('Erro ao salvar nota');
        return false;
      } finally {
        setSavingNote(false);
      }
    },
    [studentId],
  );

  return {
    notes,
    activities,
    stats,
    loadingNotes,
    loadingActivities,
    loadingStats,
    savingNote,
    fetchNotes,
    fetchActivities,
    fetchStats,
    saveNote,
  };
};
