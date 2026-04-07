import api from './client';

// Interfaces que correspondem ao backend implementado
export interface StudyMaterialResponse {
  id: string;
  levelFolderId: string;
  subfolderId?: string;
  subfolderType?: string; // legado
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

export interface CreateStudyMaterialRequest {
  title: string;
  type: 'VIDEO' | 'DOCUMENT' | 'LINK';
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  propagateToStudents: boolean;
}

export interface UpdateStudyMaterialRequest {
  title?: string;
  type?: 'VIDEO' | 'DOCUMENT' | 'LINK';
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
}

const studyMaterialService = {
  // Listar materiais de uma subpasta (subfolderId = UUID real)
  listBySubfolder: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
  ): Promise<StudyMaterialResponse[]> => {
    const { data } = await api.get<StudyMaterialResponse[]>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/materials`,
    );
    return data;
  },

  // Criar material de estudo
  create: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    payload: CreateStudyMaterialRequest,
  ): Promise<StudyMaterialResponse> => {
    const { data } = await api.post<StudyMaterialResponse>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/materials`,
      payload,
    );
    return data;
  },

  // Atualizar material de estudo
  update: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    materialId: string,
    payload: UpdateStudyMaterialRequest,
  ): Promise<StudyMaterialResponse> => {
    const { data } = await api.patch<StudyMaterialResponse>(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/materials/${materialId}`,
      payload,
    );
    return data;
  },

  // Deletar material de estudo
  delete: async (
    profileId: string,
    folderId: string,
    subfolderId: string,
    materialId: string,
  ): Promise<void> => {
    await api.delete(
      `/level-profiles/${profileId}/folders/${folderId}/subfolders/${subfolderId}/materials/${materialId}`,
    );
  },
};

export default studyMaterialService;
