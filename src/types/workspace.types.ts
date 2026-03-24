export type ActivityType = 'EXERCISE' | 'WORKSPACE';

export interface WorkspaceActivity {
  id: string;
  title: string;
  type: ActivityType;
  convertedHtml: string;
  folderId: string;
  createdAt: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  position: number;
  activities: WorkspaceActivity[];
}

export interface WorkspaceData {
  studentId: string;
  folders: WorkspaceFolder[];
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
