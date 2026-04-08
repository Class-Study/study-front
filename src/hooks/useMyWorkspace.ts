import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import studentService from '@/services/api/student.service';
import activityService from '@/services/api/activity.service';
import workspaceService from '@/services/api/workspace.service';
import {WorkspaceActivity, WorkspaceData, WorkspaceSubfolder} from '@/types/workspace.types';
import {Classroom} from "@/types/student.types.ts";

// ─── Normaliza resposta do backend ────────────────────────────────────────────
// Garante que cada folder tenha `subfolders`. Se o backend ainda retornar o
// formato legado (activities direto na pasta), envolve em uma subpasta padrão.

const normalizeFolders = (data: WorkspaceData): WorkspaceData => ({
    ...data,
    folders: [...data.folders]
        .sort((a, b) => a.position - b.position)
        .map((folder) => {
            // Backend já retornou subfolders → usa como está
            if (folder.subfolders && folder.subfolders.length > 0) return folder;

            // Legado: activities direto na pasta → wrap em subpasta padrão
            const legacyActivities = (folder.activities ?? []) as WorkspaceActivity[];
            if (legacyActivities.length === 0) return {...folder, subfolders: []};

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

// ─── Helper: encontra uma atividade percorrendo subpastas ─────────────────────

const findActivity = (
    workspace: WorkspaceData,
    activityId: string,
): {activity: WorkspaceActivity; folderId: string; subfolderId: string} | null => {
    for (const folder of workspace.folders) {
        for (const sf of (folder.subfolders ?? []) as WorkspaceSubfolder[]) {
            const found = (sf.activities ?? []).find((a) => a.id === activityId);
            if (found) return {activity: found, folderId: folder.id, subfolderId: sf.id};
        }
    }
    return null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMyWorkspace = () => {
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [studentName, setStudentName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [teacherName, setTeacherName] = useState('Professor');
    const [teacherOnline, setTeacherOnline] = useState(false);
    const [classDays, setClassDays] = useState<string[]>([]);
    const [classTime, setClassTime] = useState('');
    const [classDuration, setClassDuration] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const updateTeacherInfo = useCallback((me: Awaited<ReturnType<typeof studentService.getMe>>) => {
        setTeacherName(me.teacher?.name ?? me.teacherName ?? 'Professor');
        setTeacherOnline(me.teacher?.isOnline ?? me.teacherOnline ?? false);
    }, []);

    const fetchWorkspace = useCallback(async () => {
        setLoading(true);
        setError(null);
        setAccessDenied(false);

        try {
            // Dados do aluno SEMPRE vêm da API real
            const me = await studentService.getMe();

            setStudentId(me.id);
            setStudentName(me.name);
            setTeacherId(me.teacherId ?? me.teacher?.id ?? '');
            setClassDays(me.classDays ?? []);
            setClassTime(me.classTime ?? '');
            setClassDuration(me.classDuration ?? 0);
            setClassroom(me.classroom ?? null);
            updateTeacherInfo(me);

            // Workspace (pastas / subpastas / atividades)
            const data = await workspaceService.getMyWorkspace();
            setWorkspace(normalizeFolders({...data, studentId: me.id}));
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
            // mantém o último estado conhecido
        }
    }, [updateTeacherInfo]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const id = setInterval(() => void refreshTeacherPresence(), 30_000);
        return () => clearInterval(id);
    }, [refreshTeacherPresence]);

    // ── saveContent ───────────────────────────────────────────────────────────
    // Debounce de 1.2 s. Atualiza atividade dentro de subpastas (novo modelo)
    // e também em `workspaces` (atividades ao vivo).

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
                                    a.id === activityId ? {...a, convertedHtml: html} : a,
                                ),
                            })),
                        })),
                        workspaces: (prev.workspaces ?? []).map((ws) =>
                            ws.id === activityId ? {...ws, convertedHtml: html} : ws,
                        ),
                    };
                });
            } catch {
                console.error('Erro ao salvar conteúdo do exercício');
            } finally {
                setSaving(false);
            }
        }, 1200);
    }, []);

    // ── moveActivity ──────────────────────────────────────────────────────────
    // Busca a atividade em subpastas, remove da pasta origem e insere na
    // primeira subpasta da pasta destino (atualização otimista com rollback).

    const moveActivity = useCallback(async (
        activityId: string,
        targetFolderId: string,
    ): Promise<boolean> => {
        if (!workspace) return false;

        const location = findActivity(workspace, activityId);
        if (!location || location.folderId === targetFolderId) return true;

        const {activity: srcActivity, folderId: srcFolderId} = location;
        const previousWorkspace = workspace;

        setWorkspace((prev) => {
            if (!prev) return prev;

            const targetFolder = prev.folders.find((f) => f.id === targetFolderId);
            if (!targetFolder) return prev;

            const targetSubs = (targetFolder.subfolders ?? []) as WorkspaceSubfolder[];
            const destSubId = targetSubs[0]?.id ?? `${targetFolderId}-default`;

            return {
                ...prev,
                folders: prev.folders.map((folder) => {
                    // Remove da pasta origem
                    if (folder.id === srcFolderId) {
                        return {
                            ...folder,
                            subfolders: (folder.subfolders ?? []).map((sf) => ({
                                ...sf,
                                activities: (sf.activities ?? []).filter((a) => a.id !== activityId),
                            })),
                        };
                    }
                    // Insere na pasta destino (primeira subpasta)
                    if (folder.id === targetFolderId) {
                        const moved = {...srcActivity, folderId: targetFolderId, subfolderId: destSubId};
                        const updatedSubs = targetSubs.length > 0
                            ? targetSubs.map((sf, i) =>
                                i === 0
                                    ? {...sf, activities: [...(sf.activities ?? []), moved]}
                                    : sf,
                            )
                            : [{
                                id: destSubId,
                                name: targetFolder.name,
                                folderId: targetFolderId,
                                position: 0,
                                activities: [moved],
                            } as WorkspaceSubfolder];
                        return {...folder, subfolders: updatedSubs};
                    }
                    return folder;
                }),
            };
        });

        try {
            await activityService.move(activityId, {targetFolderId});
            return true;
        } catch {
            setWorkspace(previousWorkspace);
            return false;
        }
    }, [workspace]);

    // ── Derivados ─────────────────────────────────────────────────────────────

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
        studentId,
        studentName,
        teacherId,
        teacherName,
        teacherOnline,
        classDays,
        classTime,
        classDuration,
        workspaceActivities,
        exerciseFolders,
        loading,
        error,
        accessDenied,
        saving,
        fetchWorkspace,
        saveContent,
        moveActivity,
        classroom,
    };
};
