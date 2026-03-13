import api from './client';
import {
  LevelProfile,
  CreateLevelProfileRequest,
  UpdateLevelProfileRequest,
  ListLevelProfilesResponse,
} from '@/types/levelProfile.types';

const levelProfileService = {
  listAll: async (): Promise<LevelProfile[]> => {
    const { data } = await api.get<ListLevelProfilesResponse>('/level-profiles');
    return data.levelProfiles;
  },

  getById: async (id: string): Promise<LevelProfile> => {
    const { data } = await api.get<LevelProfile>(`/level-profiles/${id}`);
    return data;
  },

  create: async (
    payload: CreateLevelProfileRequest,
  ): Promise<LevelProfile> => {
    const { data } = await api.post<LevelProfile>(
      '/level-profiles',
      payload,
    );
    return data;
  },

  update: async (
    id: string,
    payload: UpdateLevelProfileRequest,
  ): Promise<LevelProfile> => {
    const { data } = await api.patch<LevelProfile>(
      `/level-profiles/${id}`,
      payload,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/level-profiles/${id}`);
  },
};

export default levelProfileService;
