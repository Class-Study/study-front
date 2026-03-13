export type LevelName = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFICIENCY';

export interface LevelFolder {
  id: string;
  name: string;
  position: number;
  initialFiles: number;
}

export interface LevelProfile {
  id: string;
  name: LevelName;
  code?: string;
  icon?: string;
  description: string;
  isSystem?: boolean;
  createdBy?: string | null;
  minScore?: number;
  maxScore?: number;
  folders?: LevelFolder[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLevelProfileRequest {
  name: LevelName;
  description: string;
  minScore?: number;
  maxScore?: number;
}

export interface UpdateLevelProfileRequest {
  name?: LevelName;
  description?: string;
  minScore?: number;
  maxScore?: number;
}

export interface ListLevelProfilesResponse {
  levelProfiles: LevelProfile[];
}
