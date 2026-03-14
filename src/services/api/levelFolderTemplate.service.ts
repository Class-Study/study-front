import api from './client';
import {
  LevelFolderTemplate,
  CreateLevelFolderTemplateRequest,
} from '@/types/levelProfile.types';

const levelFolderTemplateService = {
  create: async (
    profileId: string,
    folderId: string,
    payload: CreateLevelFolderTemplateRequest,
  ): Promise<LevelFolderTemplate> => {
    const { data } = await api.post<LevelFolderTemplate>(
      `/level-profiles/${profileId}/folders/${folderId}/templates`,
      payload,
    );
    return data;
  },

  listAll: async (
    profileId: string,
    folderId: string,
  ): Promise<LevelFolderTemplate[]> => {
    const { data } = await api.get<LevelFolderTemplate[]>(
      `/level-profiles/${profileId}/folders/${folderId}/templates`,
    );
    return data;
  },

  delete: async (
    profileId: string,
    folderId: string,
    templateId: string,
  ): Promise<void> => {
    await api.delete(
      `/level-profiles/${profileId}/folders/${folderId}/templates/${templateId}`,
    );
  },
};

export default levelFolderTemplateService;
