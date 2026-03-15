import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import workspaceService from '@/services/api/workspace.service';
import activityService from '@/services/api/activity.service';
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
                  ? { ...activity, convertedHtml: html }
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
    convertedHtml: string = '',
    originalFilename?: string,
  ): Promise<WorkspaceActivity | null> => {
    try {
      const activity = await workspaceService.createActivity(studentId, folderId, {
        title,
        type,
        convertedHtml,
        originalFilename,
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
  }, [studentId]);

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

  const moveActivity = useCallback(async (
    activityId: string,
    targetFolderId: string,
  ): Promise<boolean> => {
    if (!workspace) {
      return false;
    }

    let sourceFolderId: string | null = null;
    let sourceActivity: WorkspaceActivity | null = null;

    workspace.folders.forEach((folder) => {
      const found = folder.activities.find((activity) => activity.id === activityId);
      if (found) {
        sourceFolderId = folder.id;
        sourceActivity = found;
      }
    });

    if (!sourceFolderId || !sourceActivity || sourceFolderId === targetFolderId) {
      return true;
    }

    const previousWorkspace = workspace;

    setWorkspace((prev) => {
      if (!prev) return prev;

      const targetFolderExists = prev.folders.some((folder) => folder.id === targetFolderId);
      if (!targetFolderExists) {
        return prev;
      }

      return {
        ...prev,
        folders: prev.folders.map((folder) => {
          if (folder.id === sourceFolderId) {
            return {
              ...folder,
              activities: folder.activities.filter((activity) => activity.id !== activityId),
            };
          }

          if (folder.id === targetFolderId && sourceActivity) {
            return {
              ...folder,
              activities: [
                ...folder.activities,
                {
                  ...sourceActivity,
                  folderId: targetFolderId,
                },
              ],
            };
          }

          return folder;
        }),
      };
    });

    try {
      await activityService.update(activityId, {
        folderId: targetFolderId,
      });
      return true;
    } catch {
      setWorkspace(previousWorkspace);
      return false;
    }
  }, [workspace]);

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
    moveActivity,
  };
};