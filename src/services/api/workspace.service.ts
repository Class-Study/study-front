import api from './client';
import {
  WorkspaceData,
  WorkspaceActivity,
  WorkspaceFolder,
  WorkspaceSubfolder,
  MaterialType,
  WorkspaceFoldersApiResponse,
  CreateActivityRequest,
  CreateFolderRequest,
  AssignLevelFoldersRequest,
} from '@/types/workspace.types';

// ─── Tipos legados (mantidos para getWorkspace do professor) ──────────────────

interface WorkspaceResponse {
  studentId: string;
  folders: WorkspaceFolder[];
}

interface AssignFoldersResponse {
  created: WorkspaceFolder[];
}

// ─── Mapper: resposta raw do backend → WorkspaceFolder[] ─────────────────────

const mapApiToWorkspaceFolders = (response: WorkspaceFoldersApiResponse): WorkspaceFolder[] =>
  [...response.folders]
    .sort((a, b) => a.position - b.position)
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      position: folder.position,
      subfolders: [...(folder.subfolders ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((sf): WorkspaceSubfolder => ({
          id: sf.id,
          name: sf.name,
          folderId: folder.id,
          position: sf.position,
          activities: [
            // exercises → EXERCISE
            ...(sf.exercises ?? []).map((e): WorkspaceActivity => ({
              id: e.id,
              title: e.title,
              type: 'EXERCISE',
              convertedHtml: e.convertedHtml ?? undefined,
              folderId: folder.id,
              subfolderId: sf.id,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
            })),
            // studyMaterials → MATERIAL (VIDEO | LINK | DOC)
            ...(sf.studyMaterials ?? []).map((m): WorkspaceActivity => ({
              id: m.id,
              title: m.title,
              type: 'MATERIAL',
              materialType: m.type as MaterialType,
              externalUrl: m.url ?? undefined,
              convertedHtml: m.convertedHtml ?? undefined,
              folderId: folder.id,
              subfolderId: sf.id,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt,
            })),
          ],
        })),
    }));

// ─── Service ──────────────────────────────────────────────────────────────────

const workspaceService = {
  /** Workspace de um aluno específico (visão do professor) */
  getWorkspace: async (studentId: string): Promise<WorkspaceData> => {
    const { data } = await api.get<WorkspaceResponse>(
      `/students/${studentId}/workspace`,
    );
    return data;
  },

  /** Workspace do aluno logado — usa o novo endpoint com subpastas */
  getMyWorkspace: async (): Promise<WorkspaceData> => {
    const { data } = await api.get<WorkspaceFoldersApiResponse>(
      '/students/me/workspace/folders',
    );
    return {
      studentId: '', // preenchido pelo hook a partir de studentService.getMe()
      folders: mapApiToWorkspaceFolders(data),
    };
  },

  getActivity: async (id: string): Promise<WorkspaceActivity> => {
    const { data } = await api.get<WorkspaceActivity>(`/activities/${id}`);
    return data;
  },

  updateContent: async (id: string, convertedHtml: string): Promise<void> => {
    await api.patch(`/folders/activities/${id}/content`, { convertedHtml });
  },

  createActivity: async (
    studentId: string,
    folderId: string,
    payload: CreateActivityRequest,
  ): Promise<WorkspaceActivity> => {
    const { data } = await api.post<WorkspaceActivity>(
      `/students/${studentId}/folders/${folderId}/activities`,
      payload,
    );
    return data;
  },

  createFolder: async (
    studentId: string,
    payload: CreateFolderRequest,
  ): Promise<WorkspaceFolder> => {
    const { data } = await api.post<WorkspaceFolder>(
      `/students/${studentId}/folders`,
      payload,
    );
    return data;
  },

  assignLevelFolders: async (
    studentId: string,
    payload: AssignLevelFoldersRequest,
  ): Promise<WorkspaceFolder[]> => {
    const { data } = await api.post<AssignFoldersResponse>(
      `/students/${studentId}/folders/from-level-profile`,
      payload,
    );
    return data.created;
  },
};

export default workspaceService;