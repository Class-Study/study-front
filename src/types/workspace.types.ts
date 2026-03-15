export type ActivityType = 'EXERCISE' | 'WORKSPACE';

export interface WorkspaceActivity {
  id: string;
  title: string;
  type: ActivityType;
  contentHtml: string;
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

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  sentAt: string;
  isOwn: boolean;
}

export interface CreateActivityRequest {
  title: string;
  type: ActivityType;
  contentHtml: string;
}

export interface CreateFolderRequest {
  name: string;
}

export interface AssignLevelFoldersRequest {
  levelFolderIds: string[];
}
