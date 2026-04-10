import api from './client';
import {
  LevelFolderExercise,
  CreateLevelFolderTemplateRequest,
} from '@/types/levelProfile.types';

const levelFolderTemplateService = {
  // ─── Legado (sem subfolder) ───────────────────────────
  create: async (
    profileId: string,
    folderId: string,
    payload: CreateLevelFolderTemplateRequest,
  ): Promise<LevelFolderExercise> => {
    const { data } = await api.post<LevelFolderExercise>(
      `/level-profiles/${profileId}/folders/${folderId}/templates`,
      payload,
    );
    return data;
  },

  listAll: async (
    profileId: string,
    folderId: string,
  ): Promise<LevelFolderExercise[]> => {
    const { data } = await api.get<LevelFolderExercise[]>(
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

  // ─── Novo — via subfolder real ────────────────────────
  createInSubfolder: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    payload: CreateLevelFolderTemplateRequest,
  ): Promise<LevelFolderExercise> => {
    const { data } = await api.post<LevelFolderExercise>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/templates`,
      payload,
    );
    return data;
  },

  listBySubfolder: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
  ): Promise<LevelFolderExercise[]> => {
    const { data } = await api.get<LevelFolderExercise[]>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/templates`,
    );
    return data;
  },

  deleteFromSubfolder: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    templateId: string,
  ): Promise<void> => {
    await api.delete(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/templates/${templateId}`,
    );
  },
};

export default levelFolderTemplateService;
