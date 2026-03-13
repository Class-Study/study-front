export interface Folder {
  id: string;
  name: string;
  levelProfileId: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  levelProfileId: string;
  description?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
}
