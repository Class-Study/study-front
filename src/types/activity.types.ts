export type ActivityType = 'EXERCISE' | 'WORKSPACE';

export interface Activity {
  id: string;
  folderId: string;
  title: string;
  type: ActivityType;
  contentHtml: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  title: string;
  type: ActivityType;
  contentHtml: string;
}

export interface UpdateActivityRequest {
  title?: string;
  type?: ActivityType;
  contentHtml?: string;
}
