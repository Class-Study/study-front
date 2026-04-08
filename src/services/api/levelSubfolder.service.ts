import api from './client';
import type {
  CreateLevelSubfolderRequest,
  UpdateLevelSubfolderRequest,
  CreateSubfoldersBatchRequest,
  UpdateSubfolderWithContentsRequest,
  LevelSubfolder,
} from '@/types/levelProfile.types';

export interface LevelSubfolderResponse {
  id: string;
  levelFolderId: string;
  name: string;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const levelSubfolderService = {
  list: async (profileId: string, folderId: string): Promise<LevelSubfolderResponse[]> => {
    const { data } = await api.get<LevelSubfolderResponse[]>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders`,
    );
    return data;
  },

  create: async (
    profileId: string,
    folderId: string,
    payload: CreateLevelSubfolderRequest,
  ): Promise<LevelSubfolderResponse> => {
    const { data } = await api.post<LevelSubfolderResponse>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders`,
      payload,
    );
    return data;
  },

  createBatch: async (
    profileId: string,
    folderId: string,
    payload: CreateSubfoldersBatchRequest,
  ): Promise<any> => {
    const { data } = await api.post<any>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/batch`,
      payload,
    );
    return data;
  },

  update: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    payload: UpdateLevelSubfolderRequest,
  ): Promise<LevelSubfolderResponse> => {
    const { data } = await api.patch<LevelSubfolderResponse>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}`,
      payload,
    );
    return data;
  },

  updateWithContents: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    payload: UpdateSubfolderWithContentsRequest,
  ): Promise<void> => {
    await api.put(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}`,
      payload,
    );
  },

  delete: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
  ): Promise<void> => {
    await api.delete(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}`,
    );
  },
};

export default levelSubfolderService;

