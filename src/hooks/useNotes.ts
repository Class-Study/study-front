import { useCallback, useState } from 'react';
import studentService from '@/services/api/student.service';
import { NoteType } from '@/types/student.types';

interface UseNotesResult {
  saving: boolean;
  submitNote: (type: NoteType, content: string) => Promise<boolean>;
}

export const useNotes = (studentId: string): UseNotesResult => {
  const [saving, setSaving] = useState(false);

  const submitNote = useCallback(async (type: NoteType, content: string): Promise<boolean> => {
    if (!studentId || !content.trim()) return false;
    setSaving(true);
    try {
      await studentService.saveNote(studentId, { type, content });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [studentId]);

  return { saving, submitNote };
};
