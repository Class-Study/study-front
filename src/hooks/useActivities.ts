import { useState, useCallback } from 'react';
import { Activity } from '@/types/activity.types';
import activityService from '@/services/api/activity.service';

interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  fetchActivities: () => Promise<void>;
  fetchActivitiesByFolder: (folderId: string) => Promise<void>;
}

export const useActivities = (): UseActivitiesReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityService.listAll();
      setActivities(data);
    } catch {
      setError('Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivitiesByFolder = useCallback(
    async (folderId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await activityService.listByFolder(folderId);
        setActivities(data);
      } catch {
        setError('Erro ao carregar atividades da pasta');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    activities,
    loading,
    error,
    fetchActivities,
    fetchActivitiesByFolder,
  };
};
