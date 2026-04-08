import React from 'react';
import type {LevelProfile} from '@/types/levelProfile.types.ts';
import type {ModalTab} from '@/types/levelTab.types.ts';
import {getFolderName, getLevelTone, getLevelToneClass} from '@/utils/levelTab.utils.ts';
import styles from '../LevelTab.module.css';

interface LevelGridProps {
    levelProfiles: LevelProfile[];
    openManagementModal: (level: LevelProfile, tab: ModalTab) => Promise<void>;
}

export const LevelGrid: React.FC<LevelGridProps> = ({levelProfiles, openManagementModal}) => (
    <div className={styles.levelsGrid}>
        {levelProfiles.map((level) => {
            const folders = level.folders ?? [];
            const tone = getLevelTone(level.code);
            const toneClass = getLevelToneClass(tone);

            return (
                <article
                    key={level.id}
                    className={styles.levelCard}
                    onClick={() => void openManagementModal(level, 'activities')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            void openManagementModal(level, 'activities');
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir atividades do nível ${level.name}`}
                >
                    <div className={styles.levelCardHeader}>
                        <div className={styles.levelMarkerWrap}>
                            <span className={`${styles.levelDot} ${toneClass}`}/>
                            <div className={styles.levelIcon}>{level.icon || '⭐'}</div>
                        </div>
                        <div className={styles.levelInfo}>
                            <div className={styles.levelName}>{level.name}</div>
                            <div className={styles.levelDesc}>{level.description || 'Sem descrição cadastrada.'}</div>
                        </div>
                        {level.isSystem ? <span className={styles.systemBadge}>Sistema</span> : null}
                    </div>

                    <div className={styles.divider}/>

                    <div className={styles.folderList}>
                        {[...folders]
                            .sort((a, b) => a.position - b.position)
                            .map((folder, index) => {
                                const totalTemplates =
                                    (folder.subfolders ?? []).reduce((acc, sf) => acc + (sf.templates?.length ?? 0), 0) +
                                    (folder.templates?.length ?? 0);
                                const totalMaterials = (folder.subfolders ?? []).reduce(
                                    (acc, sf) => acc + (sf.studyMaterials?.length ?? 0),
                                    0,
                                );
                                const totalSubfolders = (folder.subfolders ?? []).length;
                                const totalContent = totalTemplates + totalMaterials;

                                return (
                                    <div key={folder.id} className={styles.folderListItem}>
                                        <span className={styles.folderListName}>{getFolderName(folder, index)}</span>
                                        <span className={styles.folderListCount}>
                      {totalSubfolders > 0 ? `${totalSubfolders} subpastas · ` : ''}
                                            {totalContent > 0 ? `${totalContent} itens` : '0 itens'}
                    </span>
                                    </div>
                                );
                            })}
                    </div>

                    <div className={styles.cardActions}>
                        <button
                            type="button"
                            className={styles.editBtn}
                            disabled={level.isSystem}
                            title={level.isSystem ? 'Perfil de sistema' : 'Editar nível'}
                            onClick={(event) => {
                                event.stopPropagation();
                                void openManagementModal(level, 'edit');
                            }}
                        >
                            Editar
                        </button>
                    </div>
                </article>
            );
        })}
    </div>
);

