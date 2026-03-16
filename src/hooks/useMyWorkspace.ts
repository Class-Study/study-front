import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import studentService from '@/services/api/student.service';
import studentProfileService from '@/services/api/studentProfile.service';
import activityService from '@/services/api/activity.service';
import workspaceService from '@/services/api/workspace.service';
import { WorkspaceActivity, WorkspaceData } from '@/types/workspace.types';

const toWorkspaceActivity = (
  activity: {
    id: string;
    title: string;
    type: 'EXERCISE' | 'WORKSPACE';
    convertedHtml?: string;
    folderId?: string;
    createdAt: string;
  },
  folderId: string,
): WorkspaceActivity => ({
  id: activity.id,
  title: activity.title,
  type: activity.type,
  convertedHtml: activity.convertedHtml ?? '<p></p>',
  folderId: activity.folderId ?? folderId,
  createdAt: activity.createdAt,
});

export const useMyWorkspace = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [teacherName, setTeacherName] = useState('Professor');
  const [teacherOnline, setTeacherOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const updateTeacherInfo = useCallback((me: Awaited<ReturnType<typeof studentService.getMe>>) => {
    const resolvedTeacherName = me.teacher?.name ?? me.teacherName ?? 'Professor';
    const resolvedTeacherOnline = me.teacher?.isOnline ?? me.teacherOnline ?? false;

    setTeacherName(resolvedTeacherName);
    setTeacherOnline(resolvedTeacherOnline);
  }, []);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);

    try {
      const [me, folders] = await Promise.all([
        studentService.getMe(),
        studentProfileService.getMyActivityFolders(),
      ]);

      setStudentId(me.id);
      setStudentName(me.name);
      updateTeacherInfo(me);

      setWorkspace({
        studentId: me.id,
        folders: [...folders]
          .sort((a, b) => a.position - b.position)
          .map((folder) => ({
            id: folder.id,
            name: folder.name,
            position: folder.position,
            activities: (folder.activities ?? []).map((activity) =>
              toWorkspaceActivity(activity, folder.id),
            ),
          })),
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setAccessDenied(true);
        setError('Acesso negado a este workspace.');
      } else {
        setError('Erro ao carregar workspace.');
      }
    } finally {
      setLoading(false);
    }
  }, [updateTeacherInfo]);

  const refreshTeacherPresence = useCallback(async (): Promise<void> => {
    try {
      const me = await studentService.getMe();
      updateTeacherInfo(me);
    } catch {
      // Keep the last known presence state if refresh fails.
    }
  }, [updateTeacherInfo]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshTeacherPresence();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshTeacherPresence]);

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
        console.error('Erro ao salvar conteúdo do exercício');
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, []);

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
      await activityService.move(activityId, { targetFolderId });
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
    studentId,
    studentName,
    teacherName,
    teacherOnline,
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    accessDenied,
    saving,
    fetchWorkspace,
    saveContent,
    moveActivity,
  };
};
