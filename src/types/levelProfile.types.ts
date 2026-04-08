export type LevelName = string;

export interface StudyMaterial {
    id: string;
    levelFolderId: string;
    subfolderId?: string;
    subfolderType?: string;
    title: string;
    type: 'VIDEO' | 'DOCUMENT' | 'LINK';
    url?: string;
    convertedHtml?: string;
    originalFilename?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface LevelFolderTemplate {
    id: string;
    levelFolderId: string;
    subfolderId?: string;
    title: string;
    type: string;
    originalFilename?: string;
    convertedHtml?: string;
    createdAt: string;
}

export interface CreateLevelFolderTemplateRequest {
    title: string;
    type: string;
    originalFilename?: string;
    convertedHtml: string;
}

// Subpasta real persistida no banco
export interface LevelSubfolder {
    id: string;
    levelFolderId: string;
    name: string;
    position: number;
    templates: LevelFolderTemplate[];
    studyMaterials: StudyMaterial[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateLevelSubfolderRequest {
    name: string;
    position?: number;
}

export interface UpdateLevelSubfolderRequest {
    name?: string;
    position?: number;
}

// ─── PUT subfolder com conteúdo completo (upsert) ─────────────────────────
export interface UpdateSubfolderExercisePayload {
    id?: string;           // com id = atualiza; sem id = cria
    title: string;
    type: string;
    originalFilename?: string | null;
    convertedHtml?: string | null;
}

export interface UpdateSubfolderMaterialPayload {
    id?: string;           // com id = atualiza; sem id = cria
    title: string;
    type: 'VIDEO' | 'DOCUMENT' | 'LINK';
    url?: string | null;
    convertedHtml?: string | null;
    originalFilename?: string | null;
    description?: string | null;
}

export interface UpdateSubfolderWithContentsRequest {
    name: string;
    propagateToStudents: boolean;
    exercises: UpdateSubfolderExercisePayload[];
    materials: UpdateSubfolderMaterialPayload[];
    deletedExerciseIds: string[];
    deletedMaterialIds: string[];
}

// ─── Novo: payloads para criação em lote de subpastas com conteúdos ───
export interface CreateExercisePayload {
    title: string;
    type: string;
    originalFilename?: string | null;
    convertedHtml?: string | null;
}

export interface CreateMaterialPayload {
    title: string;
    type: 'VIDEO' | 'DOCUMENT' | 'LINK';
    url?: string | null;
    convertedHtml?: string | null;
    originalFilename?: string | null;
    description?: string | null;
}

export interface CreateSubfolderWithContents {
    name: string;
    position?: number;
    propagateToStudents?: boolean;
    exercises?: CreateExercisePayload[];
    materials?: CreateMaterialPayload[];
}

export interface CreateSubfoldersBatchRequest {
    subfolders: CreateSubfolderWithContents[];
}


export interface LevelFolder {
    id: string;
    name: string;
    position: number;
    initialFiles: number;
    subfolders: LevelSubfolder[];
    // Legado — templates sem subfolder
    templates: LevelFolderTemplate[];
}

export interface LevelProfile {
    id: string;
    name: LevelName;
    code: string;
    icon: string;
    description?: string;
    isSystem: boolean;
    createdBy: string | null;
    minScore?: number;
    maxScore?: number;
    folders: LevelFolder[];
    createdAt: string;
}

export interface CreateLevelProfileRequest {
    name: LevelName;
    code: string;
    icon: string;
    description?: string;
    folders: {
        name: string;
        position: number;
    }[];
    minScore?: number;
    maxScore?: number;
}

export interface UpdateLevelProfileRequest {
    name?: LevelName;
    icon?: string;
    description?: string;
    folders?: {
        name: string;
        position: number;
    }[];
}

export interface ListLevelProfilesResponse {
    levelProfiles: LevelProfile[];
}
