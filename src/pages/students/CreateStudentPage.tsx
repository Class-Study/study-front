import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header/Header';
import { useLevelProfiles } from '@/hooks/useLevelProfiles';
import studentService from '@/services/api/student.service';
import { ClassDay, CreateStudentRequest } from '@/types/student.types';
import { LevelProfile } from '@/types/levelProfile.types';
import { DAY_FILTER_OPTIONS, formatClassTime } from '@/utils/classDay.utils';
import styles from './CreateStudentPage.module.css';

interface FormData {
  name: string;
  email: string;
  phone: string;
  startDate: string;
  classRate: string;
  classDays: ClassDay[];
  classTime: string;
  classDuration: string;
  timeZone: string;
  meetPlatform: string;
  meetLink: string;
  levelProfileId: string;
  notesPrivate: string;
  notesPublic: string;
}

interface FormErrors {
  [key: string]: string;
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

const timeZoneOptions = [
  { label: 'América/São Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'América/Manaus', value: 'America/Manaus' },
  { label: 'América/Belém', value: 'America/Belem' },
  { label: 'América/Fortaleza', value: 'America/Fortaleza' },
];

export const CreateStudentPage: React.FC = () => {
  const navigate = useNavigate();
  const { levelProfiles = [], fetchLevelProfiles = () => {} } = useLevelProfiles() || {};
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Alunos', path: '/dashboard' },
    { label: 'Novo aluno' },
  ];

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    startDate: '',
    classRate: '',
    classDays: [],
    classTime: '19:00',
    classDuration: '60',
    timeZone: 'America/Sao_Paulo',
    meetPlatform: 'GOOGLE_MEET',
    meetLink: '',
    levelProfileId: '',
    notesPrivate: '',
    notesPublic: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    console.log('CreateStudentPage montado! Buscando level profiles...');
    fetchLevelProfiles();
  }, []);

  // Get selected level profile
  const selectedLevelProfile = levelProfiles.find(
    (lp) => lp.id === form.levelProfileId
  );

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!form.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!form.startDate) {
      newErrors.startDate = 'Data de início é obrigatória';
    }

    if (!form.classRate || parseInt(form.classRate) <= 0) {
      newErrors.classRate = 'Valor/aula deve ser maior que 0';
    }

    if (form.classDays.length === 0) {
      newErrors.classDays = 'Selecione ao menos 1 dia da semana';
    }

    if (!form.classTime) {
      newErrors.classTime = 'Horário é obrigatório';
    }

    if (!form.levelProfileId) {
      newErrors.levelProfileId = 'Selecione um nível';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Toggle day selection
  const handleDayToggle = (day: ClassDay) => {
    setForm((prev) => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter((d) => d !== day)
        : [...prev.classDays, day],
    }));
    if (errors.classDays) {
      setErrors((prev) => ({
        ...prev,
        classDays: '',
      }));
    }
  };

  // Handle level selection
  const handleLevelSelect = (levelId: string) => {
    setForm((prev) => ({
      ...prev,
      levelProfileId: levelId,
    }));
    if (errors.levelProfileId) {
      setErrors((prev) => ({
        ...prev,
        levelProfileId: '',
      }));
    }
  };

  // Convert time to API format (HH:mm -> HH:mm:00)
  const toApiTime = (time: string): string => {
    return time.length === 5 ? `${time}:00` : time;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmitError('');
    
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateStudentRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        startDate: form.startDate,
        classRate: parseInt(form.classRate),
        classDays: form.classDays,
        classTime: toApiTime(form.classTime),
        classDuration: parseInt(form.classDuration),
        meetPlatform: form.meetPlatform || undefined,
        meetLink: form.meetLink.trim() || undefined,
        levelProfileId: form.levelProfileId,
        notesPrivate: form.notesPrivate.trim() || undefined,
      };

      await studentService.create(payload);
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(
        'Erro ao cadastrar aluno. Verifique os dados e tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getMeetPlatformPlaceholder = (): string => {
    const platform = meetPlatformOptions.find(
      (p) => p.value === form.meetPlatform
    );
    return platform?.placeholder || 'https://...';
  };

  // Get system levels only (isSystem=true)
  const systemLevels = levelProfiles.filter((lp) => lp.isSystem !== false);

  return (
    <div className={styles.page}>
      <Header
        breadcrumbItems={breadcrumbItems}
      />
      <div className={styles.scrollContainer}>
        <div className={styles.narrowContainer}>
          <h1 className={styles.title}>Cadastrar novo aluno</h1>
          <p className={styles.subtitle}>
            O espaço de estudo é gerado automaticamente conforme o nível escolhido.
          </p>

          {submitError && <div className={styles.submitError}>{submitError}</div>}

          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>DADOS PESSOAIS</div>

            <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
              <div className={styles.field}>
                <label className={styles.label}>Nome completo</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Maria Silva"
                  className={styles.input}
                />
                {errors.name && <div className={styles.error}>{errors.name}</div>}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>E-mail de acesso</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="maria@email.com"
                  className={styles.input}
                />
                {errors.email && <div className={styles.error}>{errors.email}</div>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>WhatsApp</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="(11) 99999-9999"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Data de início</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                {errors.startDate && (
                  <div className={styles.error}>{errors.startDate}</div>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Valor/aula (R$)</label>
                <input
                  type="number"
                  name="classRate"
                  value={form.classRate}
                  onChange={handleInputChange}
                  placeholder="150"
                  min="0"
                  className={styles.input}
                />
                {errors.classRate && (
                  <div className={styles.error}>{errors.classRate}</div>
                )}
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: HORÁRIO DAS AULAS */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Horário das aulas</div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Dias da semana</label>
                <div className={styles.dayPills}>
                  {DAY_FILTER_OPTIONS.map(({ label, value }) => {
                    // Skip 'ALL' option and only show actual days
                    if (value === 'ALL') return null;
                    const dayValue = value as ClassDay;
                    const isSelected = form.classDays.includes(dayValue);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.dayPill} ${
                          isSelected ? styles.dayPillActive : ''
                        }`}
                        onClick={() => handleDayToggle(dayValue)}
                      >
                        {isSelected && <span className={styles.dayPillDot} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.classDays && (
                  <div className={styles.error}>{errors.classDays}</div>
                )}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Horário</label>
                <input
                  type="time"
                  name="classTime"
                  value={form.classTime}
                  onChange={handleInputChange}
                  className={styles.input}
                />
                {errors.classTime && (
                  <div className={styles.error}>{errors.classTime}</div>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Duração</label>
                <select
                  name="classDuration"
                  value={form.classDuration}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Fuso horário</label>
                <select
                  name="timeZone"
                  value={form.timeZone}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  {timeZoneOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: LINK DA REUNIÃO */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>🔗 Link da reunião</div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>Plataforma</label>
                <select
                  name="meetPlatform"
                  value={form.meetPlatform}
                  onChange={handleInputChange}
                  className={styles.input}
                >
                  {meetPlatformOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Link da sala fixa</label>
                <input
                  type="url"
                  name="meetLink"
                  value={form.meetLink}
                  onChange={handleInputChange}
                  placeholder={getMeetPlatformPlaceholder()}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.infoNote}>
              💡 O link ficará disponível no perfil do aluno para acesso rápido
              antes da aula.
            </div>
          </section>

          {/* SEÇÃO 4: NÍVEL DO ALUNO */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>NÍVEL DO ALUNO</div>

            <div className={styles.levelCards}>
              {systemLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className={`${styles.levelCard} ${
                    form.levelProfileId === level.id
                      ? styles.levelCardActive
                      : ''
                  }`}
                  onClick={() => handleLevelSelect(level.id)}
                >
                  <div className={styles.levelCardIcon}>{level.icon}</div>
                  <div className={styles.levelCardName}>{level.name}</div>
                  <div className={styles.levelCardDesc}>{level.description}</div>
                </button>
              ))}
            </div>

            {errors.levelProfileId && (
              <div className={styles.error}>{errors.levelProfileId}</div>
            )}

            {selectedLevelProfile && selectedLevelProfile.folders && (
              <div className={styles.folderPreview}>
                <div className={styles.folderPreviewTitle}>
                  📁 Espaço gerado automaticamente
                </div>
                {selectedLevelProfile.folders.map((folder, idx) => (
                  <div key={idx} className={styles.folderItem}>
                    <span className={styles.folderName}>{folder.name}</span>
                    <span className={styles.folderCount}>
                      {folder.initialFiles > 0
                        ? `${folder.initialFiles} arq.`
                        : 'vazio'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SEÇÃO 5: OBSERVAÇÕES INICIAIS */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>OBSERVAÇÕES INICIAIS</div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>
                  🔒 Nota privada (só professora)
                </label>
                <textarea
                  name="notesPrivate"
                  value={form.notesPrivate}
                  onChange={handleInputChange}
                  placeholder="Ex: Aluna tímida, objetivo viagem à Europa em dezembro..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.label}>
                  👁 Nota pública (visível ao aluno)
                </label>
                <textarea
                  name="notesPublic"
                  value={form.notesPublic}
                  onChange={handleInputChange}
                  placeholder="Ex: Bem-vinda! Comece pelos exercícios na pasta 1."
                  className={styles.textarea}
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* BOTÕES DE AÇÃO */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Cadastrando...' : 'Cadastrar aluno'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStudentPage;
