import api from './client';
import { UserTheme } from '@/types/auth.types';

const preferenceService = {
  updateTheme: async (theme: UserTheme): Promise<void> => {
    await api.patch('/preferences/theme', { preferenceTheme: theme });
  },
};

export default preferenceService;

