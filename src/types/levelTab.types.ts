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

export interface PendingMaterial {
  tempId: string;
  subfolderId: string;
  title: string;
  type: MaterialType;
  url?: string;
  convertedHtml?: string;
  originalFilename?: string;
  description?: string;
  propagateToStudents: boolean;
}

export interface PendingTemplateExtended {
  tempId: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: TemplateType;
  fileName: string;
  convertedHtml: string;
  propagateToStudents: boolean;
}

export interface PreviewState {
  isOpen: boolean;
  html: string;
  fileName: string;
  folderId: string;
  subfolderId: string;
  title: string;
  type: TemplateType;
  materialType?: MaterialType;
  url?: string;
  description?: string;
  propagateToStudents: boolean;
  mode: 'upload_exercise' | 'upload_material' | 'view' | 'freetext_exercise' | 'link_material';
}

