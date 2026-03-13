import api from './client';
import {
  Folder,
  CreateFolderRequest,
  UpdateFolderRequest,
} from '@/types/folder.types';

const folderService = {
  listAll: async (): Promise<Folder[]> => {
    const { data } = await api.get<Folder[]>('/folders');
    return data;
  },

  listByLevelProfile: async (levelProfileId: string): Promise<Folder[]> => {
    const { data } = await api.get<Folder[]>(
      `/level-profiles/${levelProfileId}/folders`,
    );
    return data;
  },

  getById: async (id: string): Promise<Folder> => {
    const { data } = await api.get<Folder>(`/folders/${id}`);
    return data;
  },

  create: async (payload: CreateFolderRequest): Promise<Folder> => {
    const { data } = await api.post<Folder>('/folders', payload);
    return data;
  },

  update: async (
    id: string,
    payload: UpdateFolderRequest,
  ): Promise<Folder> => {
    const { data } = await api.patch<Folder>(`/folders/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/folders/${id}`);
  },
};

export default folderService;
