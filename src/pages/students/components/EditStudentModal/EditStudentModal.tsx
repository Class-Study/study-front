import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { LevelProfile } from '@/types/levelProfile.types';
import { ClassDay, Student, UpdateStudentRequest } from '@/types/student.types';
import { DAY_FILTER_OPTIONS } from '@/utils/classDay.utils';
import formStyles from '../../CreateStudentPage.module.css';
import styles from './EditStudentModal.module.css';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  levelProfiles: LevelProfile[];
  loadingProfiles?: boolean;
  onClose: () => void;
  onSave: (payload: UpdateStudentRequest) => Promise<void>;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  startDate: string;
  classRate: string;
  classDays: ClassDay[];
  classTime: string;
  classDuration: string;
  meetPlatform: string;
  meetLink: string;
  levelProfileId: string;
}

interface FormErrors {
  [key: string]: string;
}

interface NormalizedFormData {
  name: string;
  email: string;
  phone: string;
  startDate: string;
  classRate: number;
  classDays: string[];
  classTime: string;
  classDuration: number;
  meetPlatform: string;
  meetLink: string;
  levelProfileId: string;
}

const meetPlatformOptions = [
  { label: 'Google Meet', value: 'GOOGLE_MEET', placeholder: 'https://meet.google.com/xxx-yyyy-zzz' },
  { label: 'Zoom', value: 'ZOOM', placeholder: 'https://zoom.us/j/xxxxxxxxxx' },
  { label: 'Microsoft Teams', value: 'TEAMS', placeholder: 'https://teams.microsoft.com/l/meetup-join/...' },
  { label: 'Outro', value: 'OTHER', placeholder: 'https://...' },
];

const durationOptions = [
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '60 min', value: '60' },
  { label: '90 min', value: '90' },
  { label: '120 min', value: '120' },
];

const emptyForm: FormData = {
  name: '',
  email: '',
  phone: '',
  startDate: '',
  classRate: '',
  classDays: [],
  classTime: '19:00',
  classDuration: '60',
  meetPlatform: 'GOOGLE_MEET',
  meetLink: '',
  levelProfileId: '',
};

const toInputTime = (time: string): string => {
  if (!time) return '19:00';
  return time.length >= 5 ? time.slice(0, 5) : time;
};

const toApiTime = (time: string): string => {
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  return time;
};

const toInputDate = (date: string): string => {
  if (!date) return '';
  return date.slice(0, 10);
};

const normalizeClassDays = (days: string[]): string[] => [...days].sort();

const buildFormFromStudent = (student: Student): FormData => ({
  name: student.name ?? '',
  email: student.email ?? '',
  phone: student.phone ?? '',
  startDate: toInputDate(student.startDate),
  classRate: String(student.classRate ?? ''),
  classDays: (student.classDays ?? []) as ClassDay[],
  classTime: toInputTime(student.classTime),
  classDuration: String(student.classDuration ?? 60),
  meetPlatform: student.meetPlatform ?? 'GOOGLE_MEET',
  meetLink: student.meetLink ?? '',
  levelProfileId: student.levelProfileId ?? '',
});

const normalizeForm = (form: FormData): NormalizedFormData => ({
  name: form.name.trim(),
  email: form.email.trim(),
  phone: form.phone.trim(),
  startDate: form.startDate,
  classRate: Number.parseFloat(form.classRate || '0'),
  classDays: normalizeClassDays(form.classDays),
  classTime: toApiTime(form.classTime),
  classDuration: Number.parseInt(form.classDuration || '0', 10),
  meetPlatform: form.meetPlatform.trim(),
  meetLink: form.meetLink.trim(),
  levelProfileId: form.levelProfileId,
});

const buildUpdatePayload = (
  initialData: NormalizedFormData,
  currentData: NormalizedFormData,
): UpdateStudentRequest => {
  const payload: UpdateStudentRequest = {};

  if (initialData.name !== currentData.name) payload.name = currentData.name;
  if (initialData.email !== currentData.email) payload.email = currentData.email;
  if (initialData.phone !== currentData.phone) payload.phone = currentData.phone || undefined;
  if (initialData.startDate !== currentData.startDate) payload.startDate = currentData.startDate;
  if (initialData.classRate !== currentData.classRate) payload.classRate = currentData.classRate;
  if (JSON.stringify(initialData.classDays) !== JSON.stringify(currentData.classDays)) {
    payload.classDays = currentData.classDays;
  }
  if (initialData.classTime !== currentData.classTime) payload.classTime = currentData.classTime;
  if (initialData.classDuration !== currentData.classDuration) payload.classDuration = currentData.classDuration;
  if (initialData.meetPlatform !== currentData.meetPlatform) {
    payload.meetPlatform = currentData.meetPlatform || undefined;
  }
  if (initialData.meetLink !== currentData.meetLink) payload.meetLink = currentData.meetLink || undefined;
  if (initialData.levelProfileId !== currentData.levelProfileId) {
    payload.levelProfileId = currentData.levelProfileId || undefined;
  }

  return payload;
};

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  levelProfiles,
  loadingProfiles = false,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<NormalizedFormData | null>(null);

  useEffect(() => {
    if (!isOpen || !student) return;

    const nextForm = buildFormFromStudent(student);
    setForm(nextForm);
    setInitialSnapshot(normalizeForm(nextForm));
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
  }, [isOpen, student]);

  const selectedLevelProfile = useMemo(
    () => levelProfiles.find((profile) => profile.id === form.levelProfileId),
    [form.levelProfileId, levelProfiles],
  );

  const currentSnapshot = useMemo(() => normalizeForm(form), [form]);

  const updatePayload = useMemo(() => {
    if (!initialSnapshot) return {} as UpdateStudentRequest;
    return buildUpdatePayload(initialSnapshot, currentSnapshot);
  }, [initialSnapshot, currentSnapshot]);

  const hasChanges = useMemo(
    () => Object.keys(updatePayload).length > 0,
    [updatePayload],
  );

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Nome é obrigatório';

    if (!form.email.trim()) {
      nextErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'E-mail inválido';
    }

    if (!form.startDate) nextErrors.startDate = 'Data de início é obrigatória';

    if (!form.classRate || Number.parseFloat(form.classRate) <= 0) {
      nextErrors.classRate = 'Valor/aula deve ser maior que 0';
    }

    if (form.classDays.length === 0) {
      nextErrors.classDays = 'Selecione ao menos 1 dia da semana';
    }

    if (!form.classTime) nextErrors.classTime = 'Horário é obrigatório';
    if (!form.levelProfileId) nextErrors.levelProfileId = 'Selecione um nível';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = event.currentTarget;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleDayToggle = (day: ClassDay): void => {
    setForm((prev) => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter((item) => item !== day)
        : [...prev.classDays, day],
    }));

    if (errors.classDays) {
      setErrors((prev) => ({
        ...prev,
        classDays: '',
      }));
    }
  };

  const getMeetPlatformPlaceholder = (): string => {
    const platform = meetPlatformOptions.find((item) => item.value === form.meetPlatform);
    return platform?.placeholder || 'https://...';
  };

  const handleSave = async (): Promise<void> => {
    setSubmitError('');

    if (!hasChanges) {
      return;
    }

    if (!validate()) {
      return;
    }

    const requestPayload = buildUpdatePayload(
      initialSnapshot ?? currentSnapshot,
      currentSnapshot,
    );

    if (Object.keys(requestPayload).length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSave(requestPayload);
      onClose();
    } catch {
      setSubmitError('Erro ao salvar alterações. Verifique os dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="Editar aluno">
      <div className={styles.shell}>
        <div className={styles.header}>
          <h2 className={styles.title}>Editando Perfil: {student?.name ?? 'Aluno'}</h2>
          <p className={styles.subtitle}>Atualize as informações do aluno. O botão de salvar é habilitado apenas quando houver alterações.</p>
        </div>

        {submitError && <div className={styles.submitError}>{submitError}</div>}

        <section className={formStyles.section}>
          <div className={formStyles.sectionLabel}>DADOS PESSOAIS</div>

          <div className={`${formStyles.fieldGroup} ${formStyles.fieldGroupFull}`}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Nome completo</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Maria Silva"
                className={formStyles.input}
              />
              {errors.name && <div className={formStyles.error}>{errors.name}</div>}
            </div>
          </div>

          <div className={formStyles.fieldGroup}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>E-mail de acesso</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="maria@email.com"
                className={formStyles.input}
              />
              {errors.email && <div className={formStyles.error}>{errors.email}</div>}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>WhatsApp</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
                className={formStyles.input}
              />
            </div>
          </div>

          <div className={formStyles.fieldGroup}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Data de início</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleInputChange}
                className={formStyles.input}
              />
              {errors.startDate && <div className={formStyles.error}>{errors.startDate}</div>}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>Valor/aula (R$)</label>
              <input
                type="number"
                name="classRate"
                value={form.classRate}
                onChange={handleInputChange}
                placeholder="150"
                min="0"
                className={formStyles.input}
              />
              {errors.classRate && <div className={formStyles.error}>{errors.classRate}</div>}
            </div>
          </div>
        </section>

        <section className={formStyles.section}>
          <div className={formStyles.sectionLabel}>Horário das aulas</div>

          <div className={formStyles.fieldGroup}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Dias da semana</label>
              <div className={formStyles.dayPills}>
                {DAY_FILTER_OPTIONS.map(({ label, value }) => {
                  if (value === 'ALL') return null;
                  const dayValue = value as ClassDay;
                  const isSelected = form.classDays.includes(dayValue);
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`${formStyles.dayPill} ${isSelected ? formStyles.dayPillActive : ''}`}
                      onClick={() => handleDayToggle(dayValue)}
                    >
                      {isSelected && <span className={formStyles.dayPillDot} />}
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.classDays && <div className={formStyles.error}>{errors.classDays}</div>}
            </div>
          </div>

          <div className={formStyles.fieldGroup}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Horário</label>
              <input
                type="time"
                name="classTime"
                value={form.classTime}
                onChange={handleInputChange}
                className={formStyles.input}
              />
              {errors.classTime && <div className={formStyles.error}>{errors.classTime}</div>}
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>Duração</label>
              <select
                name="classDuration"
                value={form.classDuration}
                onChange={handleInputChange}
                className={formStyles.input}
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={formStyles.section}>
          <div className={formStyles.sectionLabel}>🔗 Link da reunião</div>

          <div className={formStyles.fieldGroup}>
            <div className={formStyles.field}>
              <label className={formStyles.label}>Plataforma</label>
              <select
                name="meetPlatform"
                value={form.meetPlatform}
                onChange={handleInputChange}
                className={formStyles.input}
              >
                {meetPlatformOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>Link da sala fixa</label>
              <input
                type="url"
                name="meetLink"
                value={form.meetLink}
                onChange={handleInputChange}
                placeholder={getMeetPlatformPlaceholder()}
                className={formStyles.input}
              />
            </div>
          </div>

          <div className={formStyles.infoNote}>
            💡 O link ficará disponível no perfil do aluno para acesso rápido antes da aula.
          </div>
        </section>

        <section className={formStyles.section}>
          <div className={formStyles.sectionLabel}>NÍVEL DO ALUNO</div>

          {loadingProfiles ? (
            <div className={formStyles.loadingProfiles}>Carregando níveis...</div>
          ) : (
            <div className={formStyles.levelCards}>
              {levelProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`${formStyles.levelCard} ${form.levelProfileId === profile.id ? formStyles.levelCardActive : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, levelProfileId: profile.id }))}
                >
                  <div className={formStyles.levelCardIcon}>{profile.icon}</div>
                  <div className={formStyles.levelCardName}>{profile.name}</div>
                  <div className={formStyles.levelCardDesc}>{profile.description ?? 'Perfil Personalizado'}</div>
                </button>
              ))}
            </div>
          )}

          {errors.levelProfileId && <div className={formStyles.error}>{errors.levelProfileId}</div>}

          {selectedLevelProfile && selectedLevelProfile.folders && selectedLevelProfile.folders.length > 0 && (
            <div className={formStyles.folderPreview}>
              <div className={formStyles.folderPreviewTitle}>📁 Espaço gerado automaticamente</div>
              {[...selectedLevelProfile.folders]
                .sort((a, b) => a.position - b.position)
                .map((folder) => (
                  <div key={folder.id} className={formStyles.folderItem}>
                    <span className={formStyles.folderName}>{folder.name}</span>
                    <span className={formStyles.folderCount}>
                      {folder.initialFiles > 0 ? `${folder.initialFiles} arq.` : 'vazio'}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <div className={styles.info}>Nenhuma chamada PATCH será enviada enquanto não houver mudanças nos dados.</div>
        </section>

        <div className={formStyles.actions}>
          <button
            type="button"
            className={formStyles.buttonSecondary}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={formStyles.buttonPrimary}
            onClick={() => {
              void handleSave();
            }}
            disabled={submitting || !hasChanges}
          >
            {submitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditStudentModal;
