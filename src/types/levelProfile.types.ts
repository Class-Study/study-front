export type LevelName = string;

// Tipos estendidos para incluir materiais de estudo
export type ContentType = 'EXERCISE' | 'WORKSPACE' | 'STUDY_MATERIAL';
export type StudyMaterialType = 'VIDEO' | 'DOCUMENT' | 'LINK';

export interface StudyMaterial {
  id: string;
  levelFolderId: string;
  subfolderType: string;
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'LINK';
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LevelFolderTemplate {
  id: string;
  levelFolderId: string;
  title: string;
  type: 'EXERCISE' | 'WORKSPACE';
  originalFilename?: string;
  convertedHtml?: string;
  createdAt: string;
}

export interface CreateLevelFolderTemplateRequest {
  title: string;
  type: 'EXERCISE' | 'WORKSPACE';
  originalFilename?: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}

// Nova estrutura para subpastas
export interface LevelSubfolder {
  id: string;
  name: string;
  type: 'EXERCISES' | 'STUDY_MATERIALS';
  position: number;
  templates: LevelFolderTemplate[];
  studyMaterials: StudyMaterial[];
}

export interface LevelFolder {
  id: string;
  name: string;
  position: number;
  initialFiles: number;
  // Nova estrutura hierárquica
  subfolders: LevelSubfolder[];
  // Manter compatibilidade com estrutura antiga (será removido no futuro)
  templates: LevelFolderTemplate[];
}

export interface LevelProfile {
  id: string;
  name: LevelName;
  code: string;
  icon: string;
  description?: string;
  isSystem: boolean;
  createdBy: string | null;
  minScore?: number;
  maxScore?: number;
  folders: LevelFolder[];
  createdAt: string;
}

export interface CreateLevelProfileRequest {
  name: LevelName;
  code: string;
  icon: string;
  description?: string;
  folders: {
    name: string;
    position: number;
  }[];
  minScore?: number;
  maxScore?: number;
}

export interface UpdateLevelProfileRequest {
  name?: LevelName;
  icon?: string;
  description?: string;
  folders?: {
    name: string;
    position: number;
  }[];
}

export interface ListLevelProfilesResponse {
  levelProfiles: LevelProfile[];
}

export interface ActivityTemplate {
  tempId: string;
  folderId: string;
  subfolderId?: string; // Nova propriedade para subpastas
  title: string;
  type: 'EXERCISE' | 'WORKSPACE';
  file: File;
  fileName: string;
  previewHtml?: string;
}

// Novos tipos para requests de material de estudo
export interface CreateStudyMaterialRequest {
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'LINK';
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  propagateToStudents: boolean;
}

export interface PendingStudyMaterial {
  tempId: string;
  subfolderId: string;
  title: string;
  type: StudyMaterialType;
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  propagateToStudents: boolean;
}

export interface PendingTemplate {
  tempId: string;
  subfolderId: string; // Atualizado para usar subpasta
  folderId: string;
  title: string;
  type: ContentType;
  fileName: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}

