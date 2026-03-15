import { useState, useCallback } from 'react';
import studentProfileService from '@/services/api/studentProfile.service';
import {
  StudentNote,
  StudentActivity,
  StudentStats,
  NoteType,
  StudentExerciseFolder,
} from '@/types/studentProfile.types';

export const useStudentProfile = (studentId: string) => {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [exerciseFolders, setExerciseFolders] = useState<StudentExerciseFolder[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);

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

  const fetchFolders = useCallback(async () => {
    if (!studentId) return;
    setLoadingFolders(true);
    try {
      const data = await studentProfileService.getExerciseFolders(studentId);
      setExerciseFolders(data);
    } catch {
      console.error('Erro ao carregar pastas do aluno');
    } finally {
      setLoadingFolders(false);
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

  const createExercise = useCallback(
    async (
      folderId: string,
      title: string,
      convertedHtml: string,
      originalFilename: string,
    ): Promise<StudentActivity | null> => {
      if (!studentId) return null;

      setCreatingExercise(true);
      try {
        const newActivity = await studentProfileService.createExercise(studentId, folderId, {
          title,
          type: 'EXERCISE',
          convertedHtml,
          originalFilename,
        });
        setActivities((prev) => [newActivity, ...prev]);
        return newActivity;
      } catch {
        console.error('Erro ao criar exercício');
        return null;
      } finally {
        setCreatingExercise(false);
      }
    },
    [studentId],
  );

  return {
    notes,
    activities,
    exerciseFolders,
    stats,
    loadingNotes,
    loadingActivities,
    loadingFolders,
    loadingStats,
    savingNote,
    creatingExercise,
    fetchNotes,
    fetchActivities,
    fetchFolders,
    fetchStats,
    saveNote,
    createExercise,
  };
};
