export type ActivityType = 'EXERCISE' | 'WORKSPACE';

export interface Activity {
  id: string;
  folderId: string;
  title: string;
  type: ActivityType;
  convertedHtml: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  title: string;
  type: ActivityType;
  convertedHtml: string;
}

export interface MoveActivityRequest {
  targetFolderId: string;
}

export interface UpdateActivityRequest {
  title?: string;
  type?: ActivityType;
  convertedHtml?: string;
  folderId?: string;
}
