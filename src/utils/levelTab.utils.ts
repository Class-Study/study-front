import type { LevelFolder, LevelProfile } from '@/types/levelProfile.types.ts';
import type { MaterialType, NewFolderRow, NewLevelForm, TemplateType } from '../types/levelTab.types.ts';
import styles from '../pages/dashboard/tabs/Level/LevelTab.module.css';

export const createTempId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const DEFAULT_FOLDERS = (): NewFolderRow[] => [
  { tempId: createTempId(), name: '1 — TO DO' },
  { tempId: createTempId(), name: '2 — IN PROGRESS' },
  { tempId: createTempId(), name: '3 — DONE' },
];

export const createInitialForm = (): NewLevelForm => ({
  name: '',
  icon: '⭐',
  code: '',
  description: '',
  folders: DEFAULT_FOLDERS(),
});

export const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export const getFolderName = (folder: LevelFolder, index: number): string => {
  return folder.name || `Pasta ${index + 1}`;
};

export const getTemplateTypeLabel = (type: TemplateType): string =>
  type === 'EXERCISE' ? 'Exercício' : 'Workspace';

export const getMaterialTypeLabel = (type: MaterialType): string => {
  switch (type) {
    case 'VIDEO': return 'Vídeo';
    case 'DOCUMENT': return 'Documento';
    case 'LINK': return 'Link Externo';
    default: return 'Material';
  }
};

export const convertMaterialType = (backendType: string): MaterialType => {
  switch (backendType.toUpperCase()) {
    case 'VIDEO': return 'VIDEO';
    case 'DOCUMENT': return 'DOCUMENT';
    case 'LINK': return 'LINK';
    default: return 'LINK';
  }
};

export const getLevelTone = (code: string): 'basic' | 'intermediate' | 'advanced' | 'custom' => {
  if (code === 'basic') return 'basic';
  if (code === 'intermediate') return 'intermediate';
  if (code === 'advanced') return 'advanced';
  return 'custom';
};

export const getLevelToneClass = (tone: 'basic' | 'intermediate' | 'advanced' | 'custom'): string => {
  switch (tone) {
    case 'basic':
      return styles.levelDotBasic;
    case 'intermediate':
      return styles.levelDotIntermediate;
    case 'advanced':
      return styles.levelDotAdvanced;
    default:
      return styles.levelDotCustom;
  }
};

export const isDocxFile = (file: File): boolean => file.name.toLowerCase().endsWith('.docx');

export const createEditForm = (level: LevelProfile): NewLevelForm => ({
  name: level.name,
  icon: level.icon,
  code: level.code,
  description: level.description ?? '',
  folders: (level.folders ?? []).map((folder) => ({
    tempId: folder.id,
    name: folder.name,
  })),
});

export const EMPTY_PREVIEW = {
  isOpen: false,
  html: '',
  fileName: '',
  folderId: '',
  subfolderId: '',
  title: '',
  type: 'EXERCISE' as TemplateType,
  propagateToStudents: false,
  mode: 'upload_exercise' as const,
};

