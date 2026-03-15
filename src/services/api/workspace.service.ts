import api from './client';
import {
  WorkspaceData,
  WorkspaceActivity,
  WorkspaceFolder,
  CreateActivityRequest,
  CreateFolderRequest,
  AssignLevelFoldersRequest,
} from '@/types/workspace.types';

interface WorkspaceResponse {
  studentId: string;
  folders: WorkspaceFolder[];
}

interface AssignFoldersResponse {
  created: WorkspaceFolder[];
}

const workspaceService = {
  getWorkspace: async (studentId: string): Promise<WorkspaceData> => {
    const { data } = await api.get<WorkspaceResponse>(
      `/students/${studentId}/workspace`,
    );
    return data;
  },

  getMyWorkspace: async (): Promise<WorkspaceData> => {
    const { data } = await api.get<WorkspaceResponse>('/students/me/workspace');
    return data;
  },

  getActivity: async (id: string): Promise<WorkspaceActivity> => {
    const { data } = await api.get<WorkspaceActivity>(`/activities/${id}`);
    return data;
  },

  updateContent: async (id: string, convertedHtml: string): Promise<void> => {
    await api.patch(`/folders/activities/${id}/content`, { convertedHtml });
  },

  createActivity: async (
    studentId: string,
    folderId: string,
    payload: CreateActivityRequest,
  ): Promise<WorkspaceActivity> => {
    const { data } = await api.post<WorkspaceActivity>(
      `/students/${studentId}/folders/${folderId}/activities`,
      payload,
    );
    return data;
  },

  createFolder: async (
    studentId: string,
    payload: CreateFolderRequest,
  ): Promise<WorkspaceFolder> => {
    const { data } = await api.post<WorkspaceFolder>(
      `/students/${studentId}/folders`,
      payload,
    );
    return data;
  },

  assignLevelFolders: async (
    studentId: string,
    payload: AssignLevelFoldersRequest,
  ): Promise<WorkspaceFolder[]> => {
    const { data } = await api.post<AssignFoldersResponse>(
      `/students/${studentId}/folders/from-level-profile`,
      payload,
    );
    return data.created;
  },
};

export default workspaceService;