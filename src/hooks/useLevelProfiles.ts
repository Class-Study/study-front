import { useState, useCallback } from 'react';
import { LevelProfile } from '@/types/levelProfile.types';
import levelProfileService from '@/services/api/levelProfile.service';

interface UseLevelProfilesReturn {
  levelProfiles: LevelProfile[];
  loading: boolean;
  error: string | null;
  fetchLevelProfiles: () => Promise<void>;
}

export const useLevelProfiles = (): UseLevelProfilesReturn => {
  const [levelProfiles, setLevelProfiles] = useState<LevelProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLevelProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await levelProfileService.listAll();
      setLevelProfiles(data);
    } catch {
      setError('Erro ao carregar níveis de proficiência');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    levelProfiles,
    loading,
    error,
    fetchLevelProfiles,
  };
};
