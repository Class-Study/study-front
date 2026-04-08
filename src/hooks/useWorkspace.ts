import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import workspaceService from '@/services/api/workspace.service';
import activityService from '@/services/api/activity.service';
import studentProfileService from '@/services/api/studentProfile.service';
import {
  WorkspaceActivity,
  WorkspaceData,
  WorkspaceFolder,
  WorkspaceSubfolder,
} from '@/types/workspace.types';


// ─── Normaliza resposta do backend ────────────────────────────────────────────

const normalizeFolders = (data: WorkspaceData): WorkspaceData => ({
  ...data,
  folders: [...data.folders]
    .sort((a, b) => a.position - b.position)
    .map((folder) => {
      if (folder.subfolders && folder.subfolders.length > 0) return folder;
      const legacyActivities = (folder.activities ?? []) as WorkspaceActivity[];
      if (legacyActivities.length === 0) return { ...folder, subfolders: [] };
      return {
        ...folder,
        subfolders: [
          {
            id: `${folder.id}-default`,
            name: folder.name,
            folderId: folder.id,
            position: 0,
            activities: legacyActivities,
          } as WorkspaceSubfolder,
        ],
      };
    }),
});

// ─── Helper: encontra atividade em subpastas ──────────────────────────────────

const findActivity = (
  workspace: WorkspaceData,
  activityId: string,
): { activity: WorkspaceActivity; folderId: string; subfolderId: string } | null => {
  for (const folder of workspace.folders) {
    for (const sf of (folder.subfolders ?? []) as WorkspaceSubfolder[]) {
      const found = (sf.activities ?? []).find((a) => a.id === activityId);
      if (found) return { activity: found, folderId: folder.id, subfolderId: sf.id };
    }
  }
  return null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWorkspace = (studentId: string, studentView: boolean = false) => {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchWorkspace = useCallback(async () => {
    if (!studentView && !studentId) return;

    setLoading(true);
    setError(null);
    setAccessDenied(false);


    try {
      const data = studentView
        ? await workspaceService.getMyWorkspace()
        : await workspaceService.getWorkspace(studentId);
      setWorkspace(normalizeFolders(data));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setAccessDenied(true);
        setError('Acesso negado a este workspace.');
      } else {
        setError('Erro ao carregar workspace do aluno.');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, studentView]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ── saveContent ─────────────────────────────────────────────────────────────

  const saveContent = useCallback((activityId: string, html: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

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
              subfolders: (folder.subfolders ?? []).map((sf) => ({
                ...sf,
                activities: (sf.activities ?? []).map((a) =>
                  a.id === activityId ? { ...a, convertedHtml: html } : a,
                ),
              })),
            })),
            workspaces: (prev.workspaces ?? []).map((ws) =>
              ws.id === activityId ? { ...ws, convertedHtml: html } : ws,
            ),
          };
        });
      } catch {
        console.error('Erro ao salvar conteúdo');
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, []);

  // ── createActivity ──────────────────────────────────────────────────────────

  const createActivity = useCallback(async (
    folderId: string,
    title: string,
    type: 'EXERCISE' | 'WORKSPACE',
    convertedHtml: string = '',
    originalFilename?: string,
  ): Promise<WorkspaceActivity | null> => {
    try {
      const activity = await studentProfileService.createExercise(studentId, folderId, {
        title,
        type: type as 'EXERCISE',
        convertedHtml,
        originalFilename: originalFilename ?? '',
      });

      const newActivity = activity as unknown as WorkspaceActivity;

      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          folders: prev.folders.map((folder) => {
            if (folder.id !== folderId) return folder;
            const subs = (folder.subfolders ?? []) as WorkspaceSubfolder[];
            if (subs.length > 0) {
              return {
                ...folder,
                subfolders: subs.map((sf, i) =>
                  i === 0 ? { ...sf, activities: [...(sf.activities ?? []), newActivity] } : sf,
                ),
              };
            }
            return {
              ...folder,
              subfolders: [{
                id: `${folderId}-default`,
                name: folder.name,
                folderId,
                position: 0,
                activities: [newActivity],
              } as WorkspaceSubfolder],
            };
          }),
        };
      });

      return newActivity;
    } catch {
      console.error('Erro ao criar atividade');
      return null;
    }
  }, [studentId]);

  // ── createFolder ────────────────────────────────────────────────────────────

  const createFolder = useCallback(async (name: string): Promise<WorkspaceFolder | null> => {
    try {
      const folder = await workspaceService.createFolder(studentId, { name });

      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          folders: [...prev.folders, { ...folder, subfolders: [] }]
            .sort((a, b) => a.position - b.position),
        };
      });

      return folder;
    } catch {
      console.error('Erro ao criar pasta');
      return null;
    }
  }, [studentId]);

  // ── moveActivity ────────────────────────────────────────────────────────────

  const moveActivity = useCallback(async (
    activityId: string,
    targetFolderId: string,
  ): Promise<boolean> => {
    if (!workspace) return false;

    const location = findActivity(workspace, activityId);
    if (!location || location.folderId === targetFolderId) return true;

    const { activity: srcActivity, folderId: srcFolderId } = location;
    const previousWorkspace = workspace;

    setWorkspace((prev) => {
      if (!prev) return prev;

      const targetFolder = prev.folders.find((f) => f.id === targetFolderId);
      if (!targetFolder) return prev;

      const targetSubs = (targetFolder.subfolders ?? []) as WorkspaceSubfolder[];
      const destSubId = targetSubs[0]?.id ?? `${targetFolderId}-default`;
      const moved = { ...srcActivity, folderId: targetFolderId, subfolderId: destSubId };

      return {
        ...prev,
        folders: prev.folders.map((folder) => {
          if (folder.id === srcFolderId) {
            return {
              ...folder,
              subfolders: (folder.subfolders ?? []).map((sf) => ({
                ...sf,
                activities: (sf.activities ?? []).filter((a) => a.id !== activityId),
              })),
            };
          }
          if (folder.id === targetFolderId) {
            const updatedSubs = targetSubs.length > 0
              ? targetSubs.map((sf, i) =>
                  i === 0 ? { ...sf, activities: [...(sf.activities ?? []), moved] } : sf,
                )
              : [{ id: destSubId, name: targetFolder.name, folderId: targetFolderId, position: 0, activities: [moved] } as WorkspaceSubfolder];
            return { ...folder, subfolders: updatedSubs };
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

  // ── Derivados ───────────────────────────────────────────────────────────────

  /** Atividades do tipo WORKSPACE (seção "Workspaces" da sidebar) */
  const workspaceActivities = useMemo(
    () => workspace?.workspaces ?? [],
    [workspace],
  );

  /** Pastas com subpastas para a seção "Exercícios" da sidebar */
  const exerciseFolders = useMemo(
    () => workspace?.folders ?? [],
    [workspace],
  );

  return {
    workspace,
    workspaceActivities,
    exerciseFolders,
    loading,
    error,
    accessDenied,
    saving,
    fetchWorkspace,
    saveContent,
    createActivity,
    createFolder,
    moveActivity,
  };
};