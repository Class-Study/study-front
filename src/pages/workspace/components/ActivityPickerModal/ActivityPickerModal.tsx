import React, {useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, FileText, FolderClosed, FolderOpen} from 'lucide-react';
import {Modal} from '@/components/ui/Modal/Modal';
import {CreateExerciseModal} from '@/components/ui/CreateExerciseModal';
import {WorkspaceActivity, WorkspaceFolder} from '@/types/workspace.types';
import styles from './ActivityPickerModal.module.css';
import {ActivityType} from "@/types/activity.types.ts";
import {FreeTextExerciseModal} from "@/pages/students/components/FreeTextExerciseModal/FreeTextExerciseModal.tsx";
import {StudentActivity} from "@/types/studentProfile.types.ts";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    folders: WorkspaceFolder[];
    activities?: StudentActivity[];
    exerciseFolders?: { id: string; name: string; position: number }[];
    workspaces: WorkspaceActivity[];
    activeActivityId: string | null;
    onSelectActivity: (activity: WorkspaceActivity) => void;
    onCreateActivity?: (folderId: string, payload: { title: string; type: ActivityType; convertedHtml: string; originalFilename?: string }) => Promise<WorkspaceActivity | null>;
    onAfterSave?: () => Promise<void> | void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const ActivityPickerModal: React.FC<ActivityPickerModalProps> = ({
                                                                            isOpen,
                                                                            onClose,
                                                                            folders,
                                                                            activities = [],
                                                                            exerciseFolders = [],
                                                                            workspaces,
                                                                            activeActivityId,
                                                                            onSelectActivity,
                                                                            onCreateActivity,
                                                                            onAfterSave,
                                                                        }) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [previewActivity, setPreviewActivity] = useState<WorkspaceActivity | null>(null);
    const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
    const [isFreeTextExerciseModalOpen, setIsFreeTextExerciseModalOpen] = useState(false);
    const [exerciseFeedback, setExerciseFeedback] = useState('');

    const toggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.has(folderId) ? next.delete(folderId) : next.add(folderId);
            return next;
        });
    };

    const handlePickActivity = (activity: WorkspaceActivity) => {
        onSelectActivity(activity);
        onClose();
    };

    const exerciseSections = useMemo(() => {
        const exercises = activities.filter((activity) => activity.type === 'EXERCISE');
        const groupedActivities = new Map<string, typeof exercises>();

        exercises.forEach((activity) => {
            const current = groupedActivities.get(activity.folderId) ?? [];
            groupedActivities.set(activity.folderId, [...current, activity]);
        });

        const knownFolderIds = new Set<string>();
        const sections = exerciseFolders.map((folder) => {
            knownFolderIds.add(folder.id);
            return {
                id: folder.id,
                name: folder.name,
                position: folder.position,
                activities: groupedActivities.get(folder.id) ?? [],
            };
        });

        exercises.forEach((activity) => {
            if (knownFolderIds.has(activity.folderId)) return;
            sections.push({
                id: activity.folderId,
                name: activity.folderName || 'Sem pasta',
                position: Number.MAX_SAFE_INTEGER,
                activities: exercises.filter((item) => item.folderId === activity.folderId),
            });
            knownFolderIds.add(activity.folderId);
        });

        return sections.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    }, [activities, exerciseFolders]);

    const defaultExerciseFolderId = useMemo(() => {
        const firstFolder = exerciseSections[0];
        return firstFolder?.id ?? null;
    }, [exerciseSections]);

    const handleOpenFreeTextExercise = (): void => {
        setExerciseFeedback('');
        setIsFreeTextExerciseModalOpen(true);
    };

    const handleCreateExercise = async (payload: {
        folderId: string;
        title: string;
        type: ActivityType;
        convertedHtml: string;
        originalFilename: string;
    }) => {
        try {
            const created = onCreateActivity
                ? await onCreateActivity(payload.folderId, {
                    title: payload.title,
                    type: payload.type,
                    convertedHtml: payload.convertedHtml,
                    originalFilename: payload.originalFilename,
                })
                : null;

            // re-busca o workspace do backend para refletir instantaneamente no modal
            await onAfterSave?.();

            if (created) {
                onSelectActivity(created);
            }

            setShowCreateExerciseModal(false);
            setIsFreeTextExerciseModalOpen(false);

        } catch (error) {
            console.error('Erro ao criar atividade:', error);
        }
    };

    const hasContent = folders.length > 0 || workspaces.length > 0;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Atividades do aluno"
                size="full"
            >
                <div className={styles.container}>
                    {/* ── Painel esquerdo: árvore ───────────────────────────── */}
                    <div className={styles.tree}>
                        <div className={styles.treeHeader}>
                            <span className={styles.treeTitle}>Atividades</span>

                            <button
                                type="button"
                                className={styles.newExerciseBtn}
                                onClick={() => setShowCreateExerciseModal(true)}
                            >
                                + Novo
                            </button>
                        </div>
                        {exerciseFeedback && <p className={styles.successMsg}>{exerciseFeedback}</p>}
                        {!hasContent && (
                            <p className={styles.empty}>Nenhuma atividade encontrada.</p>
                        )}

                        {/* Atividades soltas */}
                        {workspaces.map((activity) => (
                            <ActivityRow
                                key={activity.id}
                                activity={activity}
                                isActive={activeActivityId === activity.id}
                                isPreviewing={previewActivity?.id === activity.id}
                                onPreview={setPreviewActivity}
                                onPick={handlePickActivity}
                            />
                        ))}

                        {/* Pastas */}
                        {folders.map((folder) => {
                            const isOpen = expandedFolders.has(folder.id);
                            return (
                                <div key={folder.id} className={styles.folderGroup}>
                                    <button
                                        type="button"
                                        className={styles.folderRow}
                                        onClick={() => toggleFolder(folder.id)}
                                    >
                                        {isOpen
                                            ? <ChevronDown size={14} className={styles.chevron}/>
                                            : <ChevronRight size={14} className={styles.chevron}/>
                                        }
                                        {isOpen
                                            ? <FolderOpen size={15} className={styles.folderIcon}/>
                                            : <FolderClosed size={15} className={styles.folderIcon}/>
                                        }
                                        <span className={styles.folderName}>{folder.name}</span>
                                        <span className={styles.folderCount}>
                                        {(folder.activities ?? []).length}
                                    </span>
                                    </button>

                                    {isOpen && (
                                        <div className={styles.folderChildren}>
                                            {(folder.activities ?? []).length === 0 && (
                                                <p className={styles.emptyFolder}>Pasta vazia</p>
                                            )}
                                            {(folder.activities ?? []).map((activity) => (
                                                <ActivityRow
                                                    key={activity.id}
                                                    activity={activity}
                                                    isActive={activeActivityId === activity.id}
                                                    isPreviewing={previewActivity?.id === activity.id}
                                                    onPreview={setPreviewActivity}
                                                    onPick={handlePickActivity}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Painel direito: preview ───────────────────────────── */}
                    <div className={styles.preview}>
                        {!previewActivity ? (
                            <div className={styles.previewEmpty}>
                                <FileText size={36} className={styles.previewEmptyIcon}/>
                                <p>Selecione um exercício para visualizar.</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.previewHeader}>
                <span className={styles.previewTitle}>
                    {previewActivity.title}
                </span>

                                    <span className={`${styles.previewBadge} ${styles.badge_exercise}`}>
                    Exercício
                </span>
                                </div>

                                <div className={styles.previewBody}>
                                    <div
                                        className={`${styles.previewContent} ${styles.richContent}`}
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                previewActivity.convertedHtml ||
                                                '<p><em>Sem conteúdo.</em></p>',
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
            <CreateExerciseModal
                isOpen={showCreateExerciseModal}
                onClose={() => setShowCreateExerciseModal(false)}
                folders={folders}
                selectedFolderId={folders[0]?.id || null}
                onSave={handleCreateExercise}
                onCreateFreeText={handleOpenFreeTextExercise}
            />
            <FreeTextExerciseModal
                isOpen={isFreeTextExerciseModalOpen}
                folders={
                    folders.length > 0
                        ? folders.map((folder) => ({
                            id: folder.id,
                            name: folder.name,
                            position: folder.position,
                        }))
                        : exerciseSections.map((folder) => ({
                            id: folder.id,
                            name: folder.name,
                            position: folder.position,
                        }))
                }
                selectedFolderId={folders[0]?.id ?? defaultExerciseFolderId}
                onClose={() => setIsFreeTextExerciseModalOpen(false)}
                onSave={handleCreateExercise}
            />
        </>
    );
};

// ─── ActivityRow (linha clicável da árvore) ───────────────────────────────────

interface ActivityRowProps {
    activity: WorkspaceActivity;
    isActive: boolean;
    isPreviewing: boolean;
    onPreview: (a: WorkspaceActivity) => void;
    onPick: (a: WorkspaceActivity) => void;
}

const ActivityRow: React.FC<ActivityRowProps> = ({
                                                     activity,
                                                     isActive,
                                                     isPreviewing,
                                                     onPreview,
                                                 }) => (
    <div
        className={[
            styles.activityRow,
            isPreviewing ? styles.activityRowPreviewing : '',
            isActive ? styles.activityRowActive : '',
        ].filter(Boolean).join(' ')}
    >
        <button
            type="button"
            className={styles.activityRowBtn}
            onClick={() => onPreview(activity)}
            title={activity.title}
        >
            <FileText size={13} className={styles.activityIcon}/>
            <span className={styles.activityTitle}>{activity.title}</span>
        </button>
    </div>
);
