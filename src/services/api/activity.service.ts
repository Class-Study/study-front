import api from './client';
import {
  Activity,
  CreateActivityRequest,
  MoveActivityRequest,
  UpdateActivityRequest,
} from '@/types/activity.types';

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

  move: async (
    id: string,
    payload: MoveActivityRequest,
  ): Promise<Activity> => {
    const { data } = await api.patch<Activity>(
      `/folders/activities/${id}/move`,
      payload,
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/activities/${id}`);
  },
};

export default activityService;
