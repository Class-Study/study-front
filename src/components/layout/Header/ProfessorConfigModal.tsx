import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  Clock, 
  Palette,
  Save,
  Edit3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import teacherService from '@/services/api/teacher.service';
import styles from './ProfessorConfigModal.module.css';

interface ProfessorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfessorInfo {
  name: string;
  email: string;
  phone: string;
  pixKey: string;
  pixKeyType: 'phone' | 'email' | 'random' | '';
  workingHours: {
    morning: { start: string; end: string };
    afternoon: { start: string; end: string };
  };
}

export const ProfessorConfigModal: React.FC<ProfessorConfigModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para as informações do professor
  const [professorInfo, setProfessorInfo] = useState<ProfessorInfo>({
    name: user?.name || '',
    email: user?.email || '',
    phone: (() => {
      const phone = user?.phone || '';
      if (!phone) return '';
      // If phone is already formatted, return as is
      if (phone.includes('(') && phone.includes(')') && phone.includes('-')) {
        return phone;
      }
      // Otherwise, format it (simple format for initialization)
      const digits = phone.replace(/\D/g, '').substring(0, 11);
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    })(),
    pixKey: '',
    pixKeyType: '',
    workingHours: {
      morning: { start: '08:00', end: '12:00' },
      afternoon: { start: '13:00', end: '18:00' }
    }
  });

  // Estado para controlar quais seções estão em modo de edição
  const [editingSections, setEditingSections] = useState<{
    basic: boolean;
    payment: boolean;
    schedule: boolean;
  }>({
    basic: false,
    payment: false,
    schedule: false
  });

  // Load teacher configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeacherConfig();
    }
  }, [isOpen]);

  const loadTeacherConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await teacherService.getConfig();
      
      // Detect PIX key type from existing key
      const detectPixKeyType = (key: string): 'phone' | 'email' | 'random' | '' => {
        if (!key) return '';
        if (key.includes('@')) return 'email';
        if (key.startsWith('+55')) {
          // If it's a +55 phone, format it for display
          const phoneDigits = key.replace(/^\+55/, '').replace(/\D/g, '');
          if (phoneDigits.length === 11) {
            return 'phone';
          }
        }
        if (/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(key)) return 'phone';
        return 'random';
      };

      const existingPixKey = config.pixKey || '';
      let displayPixKey = existingPixKey;
      
      // Use pixKeyType from backend if available, otherwise detect from key
      const pixKeyTypeFromBackend = config.pixKeyType;
      let finalPixKeyType: 'phone' | 'email' | 'random' | '' = '';
      
      if (pixKeyTypeFromBackend) {
        // Map backend type to frontend type if needed
        switch (pixKeyTypeFromBackend.toLowerCase()) {
          case 'phone':
          case 'telefone':
            finalPixKeyType = 'phone';
            break;
          case 'email':
          case 'e-mail':
            finalPixKeyType = 'email';
            break;
          case 'random':
          case 'aleatoria':
          case 'aleatorio':
            finalPixKeyType = 'random';
            break;
          default:
            finalPixKeyType = detectPixKeyType(existingPixKey);
        }
      } else {
        // Fallback to detection logic
        finalPixKeyType = detectPixKeyType(existingPixKey);
      }
      
      // Format phone for display if it comes from backend as +55XXXXXXXXXXX
      if (existingPixKey.startsWith('+55') && finalPixKeyType === 'phone') {
        const phoneDigits = existingPixKey.replace(/^\+55/, '').replace(/\D/g, '');
        if (phoneDigits.length === 11) {
          displayPixKey = `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, 7)}-${phoneDigits.slice(7)}`;
        }
      }
      
      // Convert backend format to frontend format
      setProfessorInfo(prev => ({
        ...prev,
        pixKey: displayPixKey,
        pixKeyType: finalPixKeyType,
        workingHours: {
          morning: {
            start: config.workHour.startTimeMorning.substring(0, 5), // Remove seconds
            end: config.workHour.endTimeMorning.substring(0, 5)
          },
          afternoon: {
            start: config.workHour.startTimeAfternoon.substring(0, 5),
            end: config.workHour.endTimeAfternoon.substring(0, 5)
          }
        }
      }));
    } catch (err) {
      console.error('Erro ao carregar configurações do professor:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (section: keyof typeof editingSections) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (section === 'basic') {
        // Save basic info (name, email, phone)
        const phoneForSubmission = getPhoneForSubmission();
        await teacherService.update({
          name: professorInfo.name,
          email: professorInfo.email,
          phone: phoneForSubmission || undefined
        });
      } else if (section === 'payment') {
        // Save PIX key with proper formatting and type
        const formattedPixKey = getPixKeyForSubmission();
        await teacherService.update({
          pixKey: formattedPixKey || undefined,
          pixKeyType: professorInfo.pixKeyType || undefined
        });
      } else if (section === 'schedule') {
        // Save working hours
        await teacherService.update({
          workHour: {
            startTimeMorning: professorInfo.workingHours.morning.start + ':00',
            endTimeMorning: professorInfo.workingHours.morning.end + ':00',
            startTimeAfternoon: professorInfo.workingHours.afternoon.start + ':00',
            endTimeAfternoon: professorInfo.workingHours.afternoon.end + ':00'
          }
        });
      }
      
      setEditingSections(prev => ({ ...prev, [section]: false }));
    } catch (err) {
      console.error(`Erro ao salvar seção ${section}:`, err);
      setError('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEditing = (section: keyof typeof editingSections) => {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateProfessorInfo = (updates: Partial<ProfessorInfo>) => {
    setProfessorInfo(prev => ({ ...prev, ...updates }));
  };

  // Phone formatting utilities
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 11 digits (DDD + 9 digits)
    const limitedDigits = digits.substring(0, 11);
    
    // Format as (XX) XXXXX-XXXX for 11 digits
    if (limitedDigits.length <= 2) return `(${limitedDigits}`;
    if (limitedDigits.length <= 7) return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`;
    return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 7)}-${limitedDigits.slice(7)}`;
  };

  const handlePixKeyTypeChange = (type: 'phone' | 'email' | 'random' | '') => {
    setProfessorInfo(prev => ({
      ...prev,
      pixKeyType: type,
      pixKey: type === 'email' ? professorInfo.email : '' // Pre-fill with email if email type selected
    }));
  };

  const handlePixKeyChange = (value: string) => {
    let formattedValue = value;
    
    if (professorInfo.pixKeyType === 'phone') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setProfessorInfo(prev => ({ ...prev, pixKey: formattedValue }));
  };

  const getPixKeyForSubmission = (): string => {
    if (professorInfo.pixKeyType === 'phone') {
      // Extract only digits and add +55
      const digits = professorInfo.pixKey.replace(/\D/g, '');
      if (digits.length === 11) {
        return `+55${digits}`;
      } else {
        // Return as is if not valid format, backend can handle validation
        return professorInfo.pixKey;
      }
    }
    return professorInfo.pixKey;
  };

  const getPhoneForSubmission = (): string => {
    // Extract only digits from formatted phone
    return professorInfo.phone.replace(/\D/g, '');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.avatar}>
              {user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.title}>Configurações do Professor</h2>
              <p className={styles.subtitle}>Gerencie suas preferências e informações</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          
          {/* Loading State */}
          {isLoading && (
            <div className={styles.loadingWrapper}>
              <p className={styles.loadingText}>Carregando configurações...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={styles.errorWrapper}>
              <p className={styles.errorText}>{error}</p>
              <button 
                type="button" 
                className={styles.retryBtn}
                onClick={loadTeacherConfig}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Content - only show if not loading and no error */}
          {!isLoading && !error && (
            <>
              {/* Informações Básicas */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <User size={18} />
                <span>Informações Básicas</span>
              </div>
              <button 
                type="button" 
                className={styles.editBtn}
                onClick={() => toggleEditing('basic')}
              >
                <Edit3 size={14} />
                {editingSections.basic ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className={styles.sectionContent}>
              <div className={styles.field}>
                <label className={styles.label}>
                  <User size={14} />
                  Nome
                </label>
                {editingSections.basic ? (
                  <input
                    type="text"
                    className={styles.input}
                    value={professorInfo.name}
                    onChange={e => updateProfessorInfo({ name: e.target.value })}
                  />
                ) : (
                  <span className={styles.value}>{professorInfo.name}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <Mail size={14} />
                  E-mail
                </label>
                {editingSections.basic ? (
                  <input
                    type="email"
                    className={styles.input}
                    value={professorInfo.email}
                    onChange={e => updateProfessorInfo({ email: e.target.value })}
                  />
                ) : (
                  <span className={styles.value}>{professorInfo.email}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  <Phone size={14} />
                  Telefone
                </label>
                {editingSections.basic ? (
                  <input
                    type="tel"
                    className={styles.input}
                    value={professorInfo.phone}
                    onChange={e => updateProfessorInfo({ phone: formatPhoneNumber(e.target.value) })}
                    placeholder="(11) 99999-9999"
                  />
                ) : (
                  <span className={styles.value}>
                    {professorInfo.phone || 'Não informado'}
                  </span>
                )}
              </div>

              {editingSections.basic && (
                <button 
                  type="button" 
                  className={styles.saveBtn}
                  onClick={() => handleSave('basic')}
                  disabled={isLoading}
                >
                  <Save size={14} />
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
            </div>
          </section>

          {/* Configuração de Pagamento */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <CreditCard size={18} />
                <span>Configuração de Pagamento</span>
              </div>
              <button 
                type="button" 
                className={styles.editBtn}
                onClick={() => toggleEditing('payment')}
              >
                <Edit3 size={14} />
                {editingSections.payment ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className={styles.sectionContent}>
              
              {/* PIX Key Type Selector - only show when editing */}
              {editingSections.payment && (
                <div className={styles.field}>
                  <label className={styles.label}>
                    <CreditCard size={14} />
                    Tipo da Chave PIX
                  </label>
                  <div className={styles.pixTypeSelector}>
                    <button
                      type="button"
                      className={`${styles.pixTypeBtn} ${professorInfo.pixKeyType === 'email' ? styles.active : ''}`}
                      onClick={() => handlePixKeyTypeChange('email')}
                    >
                      📧 E-mail
                    </button>
                    <button
                      type="button"
                      className={`${styles.pixTypeBtn} ${professorInfo.pixKeyType === 'phone' ? styles.active : ''}`}
                      onClick={() => handlePixKeyTypeChange('phone')}
                    >
                      📱 Telefone
                    </button>
                    <button
                      type="button"
                      className={`${styles.pixTypeBtn} ${professorInfo.pixKeyType === 'random' ? styles.active : ''}`}
                      onClick={() => handlePixKeyTypeChange('random')}
                    >
                      🔑 Aleatória
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>
                  <CreditCard size={14} />
                  Chave PIX
                  {professorInfo.pixKeyType === 'phone' && ' (+55)'}
                </label>
                {editingSections.payment ? (
                  <div className={styles.pixInputWrapper}>
                    {professorInfo.pixKeyType === 'phone' && (
                      <span className={styles.phonePrefix}>+55</span>
                    )}
                    <input
                      type={professorInfo.pixKeyType === 'email' ? 'email' : 'text'}
                      className={`${styles.input} ${professorInfo.pixKeyType === 'phone' ? styles.phoneInput : ''}`}
                      value={professorInfo.pixKey}
                      onChange={e => handlePixKeyChange(e.target.value)}
                      disabled={!professorInfo.pixKeyType}
                      placeholder={
                        professorInfo.pixKeyType === 'email' ? 'seu@email.com' :
                        professorInfo.pixKeyType === 'phone' ? '(11) 99999-9999' :
                        professorInfo.pixKeyType === 'random' ? 'Chave aleatória PIX' :
                        'Selecione um tipo de chave acima'
                      }
                    />
                  </div>
                ) : (
                  <span className={styles.value}>
                    {professorInfo.pixKey || 'Não configurado'}
                    {professorInfo.pixKey && professorInfo.pixKeyType && (
                      <span className={styles.pixTypeLabel}>
                        {professorInfo.pixKeyType === 'email' ? ' (E-mail)' :
                         professorInfo.pixKeyType === 'phone' ? ' (Telefone)' :
                         ' (Chave Aleatória)'}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {editingSections.payment && (
                <div className={styles.pixInfo}>
                  <p className={styles.pixInfoText}>
                    💡 Esta chave PIX será usada para gerar QR codes de pagamento para seus alunos.
                  </p>
                  {professorInfo.pixKeyType === 'phone' && (
                    <p className={styles.pixInfoText}>
                      📱 Para telefone, use o formato com DDD: (11) 99999-9999
                    </p>
                  )}
                </div>
              )}

              {editingSections.payment && (
                <button 
                  type="button" 
                  className={styles.saveBtn}
                  onClick={() => handleSave('payment')}
                  disabled={isLoading || !professorInfo.pixKeyType || !professorInfo.pixKey}
                >
                  <Save size={14} />
                  {isLoading ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              )}
            </div>
          </section>

          {/* Horário de Trabalho */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Clock size={18} />
                <span>Horário de Trabalho</span>
              </div>
              <button 
                type="button" 
                className={styles.editBtn}
                onClick={() => toggleEditing('schedule')}
              >
                <Edit3 size={14} />
                {editingSections.schedule ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className={styles.sectionContent}>
              <div className={styles.timeGroup}>
                <h4 className={styles.timeGroupTitle}>🌅 Manhã</h4>
                <div className={styles.timeRow}>
                  <div className={styles.timeField}>
                    <label className={styles.label}>Início</label>
                    {editingSections.schedule ? (
                      <input
                        type="time"
                        className={styles.input}
                        value={professorInfo.workingHours.morning.start}
                        onChange={e => updateProfessorInfo({
                          workingHours: {
                            ...professorInfo.workingHours,
                            morning: {
                              ...professorInfo.workingHours.morning,
                              start: e.target.value
                            }
                          }
                        })}
                      />
                    ) : (
                      <span className={styles.value}>
                        {professorInfo.workingHours.morning.start}
                      </span>
                    )}
                  </div>
                  <div className={styles.timeField}>
                    <label className={styles.label}>Fim</label>
                    {editingSections.schedule ? (
                      <input
                        type="time"
                        className={styles.input}
                        value={professorInfo.workingHours.morning.end}
                        onChange={e => updateProfessorInfo({
                          workingHours: {
                            ...professorInfo.workingHours,
                            morning: {
                              ...professorInfo.workingHours.morning,
                              end: e.target.value
                            }
                          }
                        })}
                      />
                    ) : (
                      <span className={styles.value}>
                        {professorInfo.workingHours.morning.end}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.timeGroup}>
                <h4 className={styles.timeGroupTitle}>🌇 Tarde</h4>
                <div className={styles.timeRow}>
                  <div className={styles.timeField}>
                    <label className={styles.label}>Início</label>
                    {editingSections.schedule ? (
                      <input
                        type="time"
                        className={styles.input}
                        value={professorInfo.workingHours.afternoon.start}
                        onChange={e => updateProfessorInfo({
                          workingHours: {
                            ...professorInfo.workingHours,
                            afternoon: {
                              ...professorInfo.workingHours.afternoon,
                              start: e.target.value
                            }
                          }
                        })}
                      />
                    ) : (
                      <span className={styles.value}>
                        {professorInfo.workingHours.afternoon.start}
                      </span>
                    )}
                  </div>
                  <div className={styles.timeField}>
                    <label className={styles.label}>Fim</label>
                    {editingSections.schedule ? (
                      <input
                        type="time"
                        className={styles.input}
                        value={professorInfo.workingHours.afternoon.end}
                        onChange={e => updateProfessorInfo({
                          workingHours: {
                            ...professorInfo.workingHours,
                            afternoon: {
                              ...professorInfo.workingHours.afternoon,
                              end: e.target.value
                            }
                          }
                        })}
                      />
                    ) : (
                      <span className={styles.value}>
                        {professorInfo.workingHours.afternoon.end}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {editingSections.schedule && (
                <button 
                  type="button" 
                  className={styles.saveBtn}
                  onClick={() => handleSave('schedule')}
                  disabled={isLoading}
                >
                  <Save size={14} />
                  {isLoading ? 'Salvando...' : 'Salvar Horários'}
                </button>
              )}
            </div>
          </section>

          {/* Preferências */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Palette size={18} />
                <span>Preferências</span>
              </div>
            </div>

            <div className={styles.sectionContent}>
              <div className={styles.field}>
                <label className={styles.label}>
                  <Palette size={14} />
                  Tema da Interface
                </label>
                <div className={styles.themeToggleWrapper}>
                  <ThemeToggle />
                  <span className={styles.themeLabel}>
                    Tema {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                </div>
              </div>
            </div>
          </section>

        </>
        )}
        </div>
      </div>
    </div>
  );
};
