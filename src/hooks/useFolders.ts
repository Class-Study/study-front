import { useState, useCallback } from 'react';
import { Folder } from '@/types/folder.types';
import folderService from '@/services/api/folder.service';

interface UseFoldersReturn {
  folders: Folder[];
  loading: boolean;
  error: string | null;
  fetchFolders: () => Promise<void>;
  fetchFoldersByLevelProfile: (levelProfileId: string) => Promise<void>;
}

export const useFolders = (): UseFoldersReturn => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await folderService.listAll();
      setFolders(data);
    } catch {
      setError('Erro ao carregar pastas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFoldersByLevelProfile = useCallback(
    async (levelProfileId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await folderService.listByLevelProfile(levelProfileId);
        setFolders(data);
      } catch {
        setError('Erro ao carregar pastas do nível');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    folders,
    loading,
    error,
    fetchFolders,
    fetchFoldersByLevelProfile,
  };
};
