import api from './client';
import {
  Activity,
  CreateActivityRequest,
  UpdateActivityRequest,
} from '../../types/activity.types';

const activityService = {
  listAll: async (): Promise<Activity[]> => {
    const { data } = await api.get<Activity[]>('/activities');
    return data;
  },

  listByFolder: async (folderId: string): Promise<Activity[]> => {
    const { data } = await api.get<Activity[]>(
      `/folders/${folderId}/activities`,
    );
    return data;
  },

  getById: async (id: string): Promise<Activity> => {
    const { data } = await api.get<Activity>(`/activities/${id}`);
    return data;
  },

  create: async (
    folderId: string,
    payload: CreateActivityRequest,
  ): Promise<Activity> => {
    const { data } = await api.post<Activity>(
      `/folders/${folderId}/activities`,
      payload,
    );
    return data;
  },

  update: async (
    id: string,
    payload: UpdateActivityRequest,
  ): Promise<Activity> => {
    const { data } = await api.patch<Activity>(
      `/activities/${id}`,
      payload,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/activities/${id}`);
  },
};

export default activityService;
