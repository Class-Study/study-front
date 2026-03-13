export type LevelName = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFICIENCY';

export interface LevelProfile {
  id: string;
  name: LevelName;
  description: string;
  minScore?: number;
  maxScore?: number;
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
