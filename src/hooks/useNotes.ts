import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import studentService from '@/services/api/student.service';
import { NoteType } from '@/types/student.types';

interface UseNotesResult {
  saving: boolean;
  submitNote: (type: NoteType, content: string) => Promise<boolean>;
}

export const useNotes = (studentId: string): UseNotesResult => {
  const { user } = useAuth();
  const isStudentView = user?.role === 'STUDENT';
  const [saving, setSaving] = useState(false);

  const submitNote = useCallback(async (type: NoteType, content: string): Promise<boolean> => {
    if (!content.trim()) return false;
    if (!isStudentView && !studentId) return false;

    setSaving(true);
    try {
      if (isStudentView) {
        await studentService.saveMyNote({ type, content });
      } else {
        await studentService.saveNote(studentId, { type, content });
      }
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [isStudentView, studentId]);

  return { saving, submitNote };
};
