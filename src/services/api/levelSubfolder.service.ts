import api from './client';
import type { LevelSubfolder, CreateLevelSubfolderRequest, UpdateLevelSubfolderRequest } from '@/types/levelProfile.types';

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

