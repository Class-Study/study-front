import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import workspaceService from '@/services/api/workspace.service';
import {
  WorkspaceActivity,
  WorkspaceData,
  WorkspaceFolder,
} from '@/types/workspace.types';

export const useWorkspace = (studentId: string) => {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchWorkspace = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await workspaceService.getWorkspace(studentId);
      setWorkspace({
        ...data,
        folders: [...data.folders].sort((a, b) => a.position - b.position),
      });
    } catch {
      setError('Erro ao carregar workspace do aluno.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveContent = useCallback((activityId: string, html: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await workspaceService.updateContent(activityId, html);
        setWorkspace((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            folders: prev.folders.map((folder) => ({
              ...folder,
              activities: folder.activities.map((activity) => (
                activity.id === activityId
                  ? { ...activity, contentHtml: html }
                  : activity
              )),
            })),
          };
        });
      } catch {
        console.error('Erro ao salvar conteúdo');
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, []);

  const createActivity = useCallback(async (
    folderId: string,
    title: string,
    type: 'EXERCISE' | 'WORKSPACE',
  ): Promise<WorkspaceActivity | null> => {
    try {
      const activity = await workspaceService.createActivity(folderId, {
        title,
        type,
        contentHtml: '',
      });

      setWorkspace((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          folders: prev.folders.map((folder) => (
            folder.id === folderId
              ? { ...folder, activities: [...folder.activities, activity] }
              : folder
          )),
        };
      });

      return activity;
    } catch {
      console.error('Erro ao criar atividade');
      return null;
    }
  }, []);

  const createFolder = useCallback(async (name: string): Promise<WorkspaceFolder | null> => {
    try {
      const folder = await workspaceService.createFolder(studentId, { name });

      setWorkspace((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          folders: [...prev.folders, folder].sort((a, b) => a.position - b.position),
        };
      });

      return folder;
    } catch {
      console.error('Erro ao criar pasta');
      return null;
    }
  }, [studentId]);

  const workspaceActivities = useMemo(
    () => workspace?.folders
      .flatMap((folder) => folder.activities)
      .filter((activity) => activity.type === 'WORKSPACE') ?? [],
    [workspace],
  );

  const exerciseFolders = useMemo(
    () => workspace?.folders.map((folder) => ({
      ...folder,
      activities: folder.activities.filter((activity) => activity.type === 'EXERCISE'),
    })) ?? [],
    [workspace],
  );

  return {
    workspace,
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    saving,
    fetchWorkspace,
    saveContent,
    createActivity,
    createFolder,
  };
};