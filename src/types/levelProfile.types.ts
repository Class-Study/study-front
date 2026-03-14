export type LevelName = string;

export interface LevelFolder {
  id: string;
  name: string;
  position: number;
  initialFiles: number;
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
    initialFiles: number;
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
    initialFiles: number;
  }[];
}

export interface ListLevelProfilesResponse {
  levelProfiles: LevelProfile[];
}

export interface ActivityTemplate {
  tempId: string;
  folderId: string;
  title: string;
  type: 'EXERCISE' | 'WORKSPACE';
  file: File;
  fileName: string;
  previewHtml?: string;
}
