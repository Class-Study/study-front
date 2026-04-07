import React from 'react';
import type { LevelFolderTemplate, LevelSubfolder } from '@/types/levelProfile.types.ts';
import type { PendingMaterial, PendingTemplateExtended, PreviewState } from '../../../../../types/levelTab.types.ts';
import { convertMaterialType, getMaterialTypeLabel, getTemplateTypeLabel } from '../../../../../utils/levelTab.utils.ts';
import styles from '../LevelTab.module.css';

interface SubfolderCardProps {
  subfolder: LevelSubfolder;
  folderId: string;
  selectedLevelId: string;

  // Pending items
  sfPendingTemplates: PendingTemplateExtended[];
  sfPendingMaterials: PendingMaterial[];

  // Inner tab
  activeTab: 'exercises' | 'materials';
  setSubfolderInnerTab: React.Dispatch<React.SetStateAction<Record<string, 'exercises' | 'materials'>>>;

  // Upload state
  isSubfolderUploadOpen: boolean;
  setActiveUploadSubfolder: React.Dispatch<React.SetStateAction<string | null>>;
  isConverting: boolean;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement> | React.MutableRefObject<HTMLInputElement | null>;

  // Subfolder edit state
  isEditing: boolean;
  editingSubfolderName: string;
  setEditingSubfolderId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingSubfolderName: React.Dispatch<React.SetStateAction<string>>;
  handleRenameSubfolder: (folderId: string, subfolderId: string) => Promise<void>;
  handleDeleteSubfolder: (folderId: string, subfolderId: string, name: string) => Promise<void>;

  // Handlers
  handleFileConvert: (file: File, folderId: string, subfolderId: string, contentMode: 'exercise' | 'material') => Promise<void>;
  handleViewSavedTemplate: (template: LevelFolderTemplate, folderId: string, subfolderId: string) => void;
  removePendingTemplate: (subfolderId: string, tempId: string) => void;
  handleDeleteTemplate: (profileId: string, folderId: string, subfolderId: string, templateId: string) => Promise<void>;
  handleDeleteMaterial: (profileId: string, folderId: string, subfolderId: string, materialId: string) => Promise<void>;

  // Preview
  setPreview: React.Dispatch<React.SetStateAction<PreviewState>>;
  setPendingMaterials: React.Dispatch<React.SetStateAction<Record<string, PendingMaterial[]>>>;
}

export const SubfolderCard: React.FC<SubfolderCardProps> = ({
  subfolder,
  folderId,
  selectedLevelId,
  sfPendingTemplates,
  sfPendingMaterials,
  activeTab,
  setSubfolderInnerTab,
  isSubfolderUploadOpen,
  setActiveUploadSubfolder,
  isConverting,
  isDragging,
  setIsDragging,
  fileInputRef,
  isEditing,
  editingSubfolderName,
  setEditingSubfolderId,
  setEditingSubfolderName,
  handleRenameSubfolder,
  handleDeleteSubfolder,
  handleFileConvert,
  handleViewSavedTemplate,
  removePendingTemplate,
  handleDeleteTemplate,
  handleDeleteMaterial,
  setPreview,
  setPendingMaterials,
}) => {
  const savedTemplates = subfolder.templates ?? [];
  const savedMaterials = subfolder.studyMaterials ?? [];

  return (
    <div className={styles.subfolderCard}>
      {/* Header */}
      <div className={styles.subfolderHeader}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
            <input
              className={styles.folderNameInput}
              type="text"
              value={editingSubfolderName}
              onChange={(e) => setEditingSubfolderName(e.target.value)}
              style={{ flex: 1, fontSize: '13px', padding: '2px 6px' }}
              autoFocus
            />
            <button
              type="button"
              className={styles.addSubfolderBtn}
              onClick={() => void handleRenameSubfolder(folderId, subfolder.id)}
            >
              ✓
            </button>
            <button
              type="button"
              className={styles.removeTemplateBtn}
              onClick={() => setEditingSubfolderId(null)}
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className={styles.subfolderName}>📂 {subfolder.name}</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={styles.viewTemplateBtn}
                title="Renomear"
                onClick={() => {
                  setEditingSubfolderId(subfolder.id);
                  setEditingSubfolderName(subfolder.name);
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className={styles.removeTemplateBtn}
                title="Deletar subpasta"
                onClick={() => void handleDeleteSubfolder(folderId, subfolder.id, subfolder.name)}
              >
                🗑️
              </button>
            </div>
          </>
        )}
      </div>

      {/* Inner tabs: Exercícios | Material de Estudos */}
      <div className={styles.managementTabs} style={{ padding: '0 8px', marginBottom: '4px' }}>
        <button
          type="button"
          className={`${styles.managementTab} ${activeTab === 'exercises' ? styles.managementTabActive : ''}`}
          onClick={() => setSubfolderInnerTab((prev) => ({ ...prev, [subfolder.id]: 'exercises' }))}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          📝 Exercícios ({savedTemplates.length + sfPendingTemplates.length})
        </button>
        <button
          type="button"
          className={`${styles.managementTab} ${activeTab === 'materials' ? styles.managementTabActive : ''}`}
          onClick={() => setSubfolderInnerTab((prev) => ({ ...prev, [subfolder.id]: 'materials' }))}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          📚 Materiais ({savedMaterials.length + sfPendingMaterials.length})
        </button>
        <button
          type="button"
          className={styles.addSubfolderBtn}
          onClick={() => setActiveUploadSubfolder(isSubfolderUploadOpen ? null : subfolder.id)}
          style={{ marginLeft: 'auto', fontSize: '11px' }}
        >
          {isSubfolderUploadOpen ? 'Fechar' : '+ Adicionar'}
        </button>
      </div>

      {/* Exercises tab content */}
      {activeTab === 'exercises' && (
        <>
          {savedTemplates.length === 0 && sfPendingTemplates.length === 0 && !isSubfolderUploadOpen && (
            <div className={styles.emptyTemplates}>Nenhum exercício ainda.</div>
          )}
          {savedTemplates.map((template) => (
            <div key={template.id} className={styles.templateItem}>
              <div className={styles.templateInfo}>
                <span className={styles.templateTitle}>{template.title}</span>
                <span className={styles.templateType}>{getTemplateTypeLabel(template.type)}</span>
                {template.originalFilename && (
                  <span className={styles.templateFile}>{template.originalFilename}</span>
                )}
              </div>
              <div className={styles.templateActions}>
                <button
                  type="button"
                  className={styles.viewTemplateBtn}
                  title="Visualizar"
                  onClick={() => handleViewSavedTemplate(template, folderId, subfolder.id)}
                >
                  👁
                </button>
                <button
                  type="button"
                  className={styles.removeTemplateBtn}
                  onClick={() => void handleDeleteTemplate(selectedLevelId, folderId, subfolder.id, template.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {sfPendingTemplates.map((template) => (
            <div key={template.tempId} className={`${styles.templateItem} ${styles.templatePending}`}>
              <div className={styles.templateInfo}>
                <span className={styles.templateTitle}>{template.title}</span>
                <span className={styles.templateType}>{getTemplateTypeLabel(template.type)}</span>
                <span className={styles.pendingBadge}>Não salvo</span>
              </div>
              <div className={styles.templateActions}>
                <button
                  type="button"
                  className={styles.viewTemplateBtn}
                  onClick={() => {
                    setPreview({
                      isOpen: true,
                      html: template.convertedHtml,
                      fileName: template.fileName,
                      folderId,
                      subfolderId: subfolder.id,
                      title: template.title,
                      type: template.type,
                      propagateToStudents: template.propagateToStudents,
                      mode: 'view',
                    });
                  }}
                >
                  👁
                </button>
                <button
                  type="button"
                  className={styles.removeTemplateBtn}
                  onClick={() => removePendingTemplate(subfolder.id, template.tempId)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {isSubfolderUploadOpen && (
            <div className={styles.uploadSection}>
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) void handleFileConvert(f, folderId, subfolder.id, 'exercise');
                }}
                onClick={() => fileInputRef.current?.click()}
                role="presentation"
              >
                {isConverting ? (
                  <span className={styles.dropzoneConverting}>Convertendo...</span>
                ) : (
                  <>
                    <span className={styles.dropzoneText}>Arraste um arquivo .docx aqui</span>
                    <span className={styles.dropzoneSubtext}>ou clique para selecionar</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileConvert(f, folderId, subfolder.id, 'exercise');
                  e.target.value = '';
                }}
              />
              <div className={styles.freeTextDivider}>
                <span className={styles.freeTextDividerLine} />
                <span className={styles.freeTextDividerText}>ou</span>
                <span className={styles.freeTextDividerLine} />
              </div>
              <button
                type="button"
                className={styles.btnFreeText}
                onClick={() => {
                  setActiveUploadSubfolder(null);
                  setPreview({
                    isOpen: true,
                    html: '<p></p>',
                    fileName: '',
                    folderId,
                    subfolderId: subfolder.id,
                    title: '',
                    type: 'EXERCISE',
                    propagateToStudents: false,
                    mode: 'freetext_exercise',
                  });
                }}
              >
                ✏️ Criar atividade manualmente (texto livre)
              </button>
            </div>
          )}
        </>
      )}

      {/* Materials tab content */}
      {activeTab === 'materials' && (
        <>
          {savedMaterials.length === 0 && sfPendingMaterials.length === 0 && !isSubfolderUploadOpen && (
            <div className={styles.emptyTemplates}>Nenhum material ainda.</div>
          )}
          {savedMaterials.map((material) => (
            <div key={material.id} className={styles.materialItem}>
              <div className={styles.materialInfo}>
                <span className={styles.materialTitle}>{material.title}</span>
                <span className={styles.materialType}>
                  {getMaterialTypeLabel(convertMaterialType(material.type))}
                </span>
                {material.originalFilename && (
                  <span className={styles.templateFile}>{material.originalFilename}</span>
                )}
                {material.description && (
                  <span className={styles.materialDescription}>{material.description}</span>
                )}
              </div>
              <div className={styles.materialActions}>
                {material.convertedHtml && (
                  <button
                    type="button"
                    className={styles.viewTemplateBtn}
                    title="Visualizar"
                    onClick={() => {
                      setPreview({
                        isOpen: true,
                        html: material.convertedHtml ?? '',
                        fileName: material.originalFilename ?? material.title,
                        folderId,
                        subfolderId: subfolder.id,
                        title: material.title,
                        type: 'EXERCISE',
                        propagateToStudents: false,
                        mode: 'view',
                      });
                    }}
                  >
                    👁
                  </button>
                )}
                {material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.viewMaterialBtn}
                  >
                    {convertMaterialType(material.type) === 'VIDEO' ? '🎥' : '🔗'}
                  </a>
                )}
                <button
                  type="button"
                  className={styles.removeMaterialBtn}
                  onClick={() => void handleDeleteMaterial(selectedLevelId, folderId, subfolder.id, material.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {sfPendingMaterials.map((material) => (
            <div key={material.tempId} className={`${styles.materialItem} ${styles.materialPending}`}>
              <div className={styles.materialInfo}>
                <span className={styles.materialTitle}>{material.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={styles.materialType}>{getMaterialTypeLabel(material.type)}</span>
                  <span className={styles.pendingBadge}>Não salvo</span>
                </div>
                {material.originalFilename && (
                  <span className={styles.templateFile}>{material.originalFilename}</span>
                )}
                {material.description && (
                  <span className={styles.materialDescription}>{material.description}</span>
                )}
              </div>
              <div className={styles.materialActions}>
                {material.convertedHtml && (
                  <button
                    type="button"
                    className={styles.viewTemplateBtn}
                    onClick={() => {
                      setPreview({
                        isOpen: true,
                        html: material.convertedHtml ?? '',
                        fileName: material.originalFilename ?? material.title,
                        folderId,
                        subfolderId: subfolder.id,
                        title: material.title,
                        type: 'EXERCISE',
                        propagateToStudents: false,
                        mode: 'view',
                      });
                    }}
                  >
                    👁
                  </button>
                )}
                {material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.viewMaterialBtn}
                  >
                    {material.type === 'VIDEO' ? '🎥' : '🔗'}
                  </a>
                )}
                <button
                  type="button"
                  className={styles.removeMaterialBtn}
                  onClick={() => {
                    setPendingMaterials((prev) => ({
                      ...prev,
                      [subfolder.id]: (prev[subfolder.id] ?? []).filter((m) => m.tempId !== material.tempId),
                    }));
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {isSubfolderUploadOpen && (
            <div className={styles.uploadSection}>
              <div className={styles.materialUploadOptions}>
                <button
                  type="button"
                  className={styles.btnUploadMaterial}
                  onClick={() => {
                    setActiveUploadSubfolder(null);
                    setPreview({
                      isOpen: true,
                      html: '',
                      fileName: '',
                      folderId,
                      subfolderId: subfolder.id,
                      title: '',
                      type: 'EXERCISE',
                      materialType: 'LINK',
                      url: '',
                      description: '',
                      propagateToStudents: false,
                      mode: 'link_material',
                    });
                  }}
                >
                  🔗 Adicionar Link
                </button>
                <div className={styles.freeTextDivider}>
                  <span className={styles.freeTextDividerLine} />
                  <span className={styles.freeTextDividerText}>ou</span>
                  <span className={styles.freeTextDividerLine} />
                </div>
                <div
                  className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) void handleFileConvert(f, folderId, subfolder.id, 'material');
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="presentation"
                >
                  {isConverting ? (
                    <span className={styles.dropzoneConverting}>Convertendo documento...</span>
                  ) : (
                    <>
                      <span className={styles.dropzoneText}>Arraste um documento .docx aqui</span>
                      <span className={styles.dropzoneSubtext}>ou clique para selecionar</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  className={styles.fileInput}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileConvert(f, folderId, subfolder.id, 'material');
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};



