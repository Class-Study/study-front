export type ActivityType = 'EXERCISE' | 'MATERIAL' | 'WORKSPACE';

/** Subtipo de material (só relevante quando type === 'MATERIAL') */
export type MaterialType = 'DOCUMENT' | 'LINK' | 'VIDEO';

export interface WorkspaceActivity {
  id: string;
  title: string;
  type: ActivityType;
  /** Subtipo do material: documento, link externo ou vídeo */
  materialType?: MaterialType;
  /** URL do recurso externo (usado em LINK e VIDEO) */
  externalUrl?: string;
  convertedHtml?: string;
  folderId?: string;
  subfolderId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceSubfolder {
  id: string;
  name: string;
  folderId: string;
  position: number;
  activities: WorkspaceActivity[];
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  position: number;
  activities?: WorkspaceActivity[]; // Legado (pode ser removido depois)
  subfolders?: WorkspaceSubfolder[]; // Novo
}

export interface WorkspaceData {
  studentId: string;
  folders: WorkspaceFolder[];
  workspaces?: WorkspaceActivity[];
}

export interface CreateActivityRequest {
  title: string;
  type: ActivityType;
  convertedHtml: string;
  originalFilename?: string;
}

export interface CreateFolderRequest {
  name: string;
}

export interface AssignLevelFoldersRequest {
  levelFolderIds: string[];
}

// ─── Tipos raw da resposta do backend (/students/me/workspace/folders) ────────

/** Exercício retornado pelo backend dentro de uma subpasta */
export interface WorkspaceExercise {
  id: string;
  subfolderId: string;
  title: string;
  type: 'EXERCISE';
  convertedHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Material de estudo retornado pelo backend */
export interface WorkspaceStudyMaterial {
  id: string;
  levelFolderId: string;
  subfolderId: string | null;
  subfolderType: string | null;
  title: string;
  type: 'VIDEO' | 'LINK' | 'DOCUMENT';
  url: string | null;
  convertedHtml: string | null;
  originalFilename: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Subpasta no formato bruto do backend */
export interface WorkspaceSubfolderResponse {
  id: string;
  name: string;
  position: number;
  exercises: WorkspaceExercise[];
  studyMaterials: WorkspaceStudyMaterial[];
  createdAt: string;
  updatedAt: string;
}

/** Pasta no formato bruto do backend */
export interface WorkspaceFolderResponse {
  id: string;
  name: string;
  position: number;
  initialFiles: number;
  subfolders: WorkspaceSubfolderResponse[];
}

/** Resposta completa de /students/me/workspace/folders */
export interface WorkspaceFoldersApiResponse {
  folders: WorkspaceFolderResponse[];
  createdAt: string;
}
