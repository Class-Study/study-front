import React from 'react';
import {CreateLevelForm} from './components/CreateLevelForm.tsx';
import {LevelGrid} from './components/LevelGrid.tsx';
import {ManagementModal} from './components/ManagementModal.tsx';
import {PreviewModal} from './components/PreviewModal.tsx';
import {useLevelTabState} from '@/hooks/useLevelTabState.ts';
import styles from './LevelTab.module.css';

export const LevelTab: React.FC = () => {
    const state = useLevelTabState();

    return (
        <>
            <section className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2 className={styles.title}>Perfis de Nível</h2>
                        <span className={styles.counter}>{state.levelProfiles.length} perfis</span>
                    </div>

                    <button type="button" className={styles.createBtn} onClick={state.toggleForm}>
                        + Criar nível
                    </button>
                </div>

                {state.showForm && (
                    <CreateLevelForm
                        form={state.form}
                        formError={state.formError}
                        creating={state.creating}
                        handleNameChange={state.handleNameChange}
                        handleFieldChange={state.handleFieldChange}
                        updateFolder={state.updateFolder}
                        addFolder={state.addFolder}
                        removeFolder={state.removeFolder}
                        handleCreateLevel={state.handleCreateLevel}
                        resetForm={state.resetForm}
                        setShowForm={() => state.toggleForm()}
                    />
                )}

                {state.loading && <div className={styles.counter}>Carregando perfis...</div>}
                {state.error && <div className={styles.formError}>{state.error}</div>}

                <LevelGrid
                    levelProfiles={state.levelProfiles}
                    openManagementModal={state.openManagementModal}
                />
            </section>

            <ManagementModal
                selectedLevel={state.selectedLevel}
                selectedLevelToneClass={state.selectedLevelToneClass}
                managementTab={state.managementTab}
                setManagementTab={state.setManagementTab}
                closeManagementModal={state.closeManagementModal}
                hasPendingContent={state.hasPendingContent}
                hasPendingPropagation={state.hasPendingPropagation}
                totalPending={state.totalPending}
                saving={state.saving}
                handleSaveAll={state.handleSaveAll}
                saveSuccess={state.saveSuccess}
                saveSuccessMessage={state.saveSuccessMessage}
                saveError={state.saveError}
                setSaveError={() => {
                }}
                pendingTemplates={state.pendingTemplates}
                pendingMaterials={state.pendingMaterials}
                setPendingMaterials={state.setPendingMaterials}
                subfolderInnerTab={state.subfolderInnerTab}
                setSubfolderInnerTab={state.setSubfolderInnerTab}
                activeUploadSubfolder={state.activeUploadSubfolder}
                setActiveUploadSubfolder={state.setActiveUploadSubfolder}
                isConverting={state.isConverting}
                isDragging={state.isDragging}
                setIsDragging={state.setIsDragging}
                fileInputRef={state.fileInputRef}
                newSubfolderName={state.newSubfolderName}
                setNewSubfolderName={state.setNewSubfolderName}
                creatingSubfolder={null}
                handleCreateSubfolder={state.handleCreateSubfolder}
                pendingSubfolders={state.pendingSubfolders}
                handleDeletePendingSubfolder={state.handleDeletePendingSubfolder}
                handleRenamePendingSubfolder={state.handleRenamePendingSubfolder}
                handleTogglePropagateSubfolder={state.handleTogglePropagateSubfolder}
                handleRenameSubfolder={state.handleRenameSubfolder}
                handleDeleteSubfolder={state.handleDeleteSubfolder}
                handleFileConvert={state.handleFileConvert}
                handleViewSavedTemplate={state.handleViewSavedTemplate}
                removePendingTemplate={state.removePendingTemplate}
                handleDeleteTemplate={state.handleDeleteTemplate}
                handleDeleteMaterial={state.handleDeleteMaterial}
                handleSaveSubfolderEdits={state.handleSaveSubfolderEdits}
                clearPendingForSubfolder={state.clearPendingForSubfolder}
                setPreview={state.setPreview}
                editForm={state.editForm}
                editError={state.editError}
                savingEdit={state.savingEdit}
                updateEditField={state.updateEditField}
                updateEditFolder={state.updateEditFolder}
                addEditFolder={state.addEditFolder}
                removeEditFolder={state.removeEditFolder}
                handleSaveLevelChanges={state.handleSaveLevelChanges}
            />

            <PreviewModal
                preview={state.preview}
                setPreview={state.setPreview}
                savingTemplate={state.savingTemplate}
                setPendingMaterials={state.setPendingMaterials}
                handleSaveTemplate={state.handleSaveTemplate}
            />
        </>
    );
};
