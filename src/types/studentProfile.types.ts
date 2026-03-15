export type NoteType = 'PRIVATE' | 'PUBLIC';
export type ActivityType = 'EXERCISE' | 'WORKSPACE';

export interface StudentNote {
  id: string;
  type: NoteType;
  content: string;
  createdAt: string;
}

export interface CreateStudentNoteRequest {
  type: NoteType;
  content: string;
}

export interface StudentActivity {
  id: string;
  title: string;
  type: ActivityType;
  folderName: string;
  folderId: string;
  convertedHtml?: string;
  createdAt: string;
}

export interface StudentExerciseFolder {
  id: string;
  name: string;
  position: number;
}

export interface CreateStudentExerciseRequest {
  title: string;
  type: 'EXERCISE';
  convertedHtml: string;
  originalFilename: string;
}

export interface StudentStats {
  activitiesCompleted: number;
  activitiesTotal: number;
  classesThisMonth: number;
  classesTotal: number;
  overallProgress: number;
}
