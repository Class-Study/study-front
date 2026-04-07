export type LevelName = string;

// Tipos estendidos para incluir materiais de estudo
export type ContentType = 'EXERCISE' | 'WORKSPACE' | 'STUDY_MATERIAL';
export type StudyMaterialType = 'VIDEO' | 'DOCUMENT' | 'LINK';

export interface StudyMaterial {
  id: string;
  levelFolderId: string;
  subfolderId?: string;
  subfolderType?: string; // legado — mantido para compatibilidade
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
  subfolderId?: string;
  title: string;
  type: 'EXERCISE' | 'WORKSPACE';
  originalFilename?: string;
  convertedHtml?: string;
  createdAt: string;
}

export interface CreateLevelFolderTemplateRequest {
  title: string;
  type: string;
  originalFilename?: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}

// Subpasta real persistida no banco
export interface LevelSubfolder {
  id: string;
  levelFolderId: string;
  name: string;
  position: number;
  templates: LevelFolderTemplate[];
  studyMaterials: StudyMaterial[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLevelSubfolderRequest {
  name: string;
  position?: number;
}

export interface UpdateLevelSubfolderRequest {
  name?: string;
  position?: number;
}

export interface LevelFolder {
  id: string;
  name: string;
  position: number;
  initialFiles: number;
  subfolders: LevelSubfolder[];
  // Legado — templates sem subfolder
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
  subfolderId?: string;
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
  subfolderId: string;
  folderId: string;
  title: string;
  type: ContentType;
  fileName: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}
