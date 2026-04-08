export type TemplateType = 'EXERCISE' | 'WORKSPACE';
export type MaterialType = 'VIDEO' | 'DOCUMENT' | 'LINK';
export type ModalTab = 'activities' | 'edit';

export interface NewFolderRow {
  tempId: string;
  name: string;
}

export interface NewLevelForm {
  name: string;
  icon: string;
  code: string;
  description: string;
  folders: NewFolderRow[];
}

export interface PendingSubfolder {
  tempId: string;      // usado como chave em pendingTemplates/pendingMaterials
  folderId: string;    // id da pasta pai
  name: string;
  propagateToStudents: boolean;
}

export interface PendingMaterial {
  tempId: string;
  subfolderId: string;
  title: string;
  type: MaterialType;
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
}

export interface PendingTemplateExtended {
  tempId: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: string;
  fileName: string;
  convertedHtml: string;
}

export interface PreviewState {
  isOpen: boolean;
  html: string;
  fileName: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: string;
  materialType?: MaterialType;
  url?: string;
  description?: string;
  mode: 'upload_exercise' | 'upload_material' | 'view' | 'freetext_exercise' | 'link_material';
}

