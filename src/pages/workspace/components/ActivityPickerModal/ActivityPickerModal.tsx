import React, {useState} from 'react';
import {ChevronDown, ChevronRight, FileText, FolderClosed, FolderOpen} from 'lucide-react';
import {Modal} from '@/components/ui/Modal/Modal';
import {CreateExerciseModal} from '@/components/ui/CreateExerciseModal';
import {CreateActivityRequest, WorkspaceActivity, WorkspaceFolder} from '@/types/workspace.types';
import activityService from '@/services/api/activity.service';
import styles from './ActivityPickerModal.module.css';
import {ActivityType} from "@/types/activity.types.ts";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    folders: WorkspaceFolder[];
    workspaces: WorkspaceActivity[];          // atividades soltas (sem pasta)
    activeActivityId: string | null;
    onSelectActivity: (activity: WorkspaceActivity) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const ActivityPickerModal: React.FC<ActivityPickerModalProps> = ({
                                                                            isOpen,
                                                                            onClose,
                                                                            folders,
                                                                            workspaces,
                                                                            activeActivityId,
                                                                            onSelectActivity,
                                                                        }) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [previewActivity, setPreviewActivity] = useState<WorkspaceActivity | null>(null);
    const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);

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

    const handleCreateExercise = async (payload: {
        folderId: string;
        title: string;
        type: ActivityType;
        convertedHtml: string;
        originalFilename: string;
    }) => {
        try {
            const created = await activityService.create(
                payload.folderId,
                {
                    title: payload.title,
                    type: payload.type,
                    convertedHtml: payload.convertedHtml,
                }
            );

            // seleciona a atividade criada
            onSelectActivity(created);

            // fecha o modal
            setShowCreateExerciseModal(false);

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
                                        {folder.activities.length}
                                    </span>
                                    </button>

                                    {isOpen && (
                                        <div className={styles.folderChildren}>
                                            {folder.activities.length === 0 && (
                                                <p className={styles.emptyFolder}>Pasta vazia</p>
                                            )}
                                            {folder.activities.map((activity) => (
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
