import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {CalendarEvent, EventType, EventTypeMeta, CreateExtraClassRequest} from '@/types/schedule.types.ts';
import {Student} from '@/types/student.types.ts';
import {toDateStr} from '@/hooks/useCalendarEvents.ts';
import studentService from '@/services/api/student.service.ts';
import scheduleService from '@/services/api/schedule.service.ts';
import Swal from 'sweetalert2';
import styles from '../CalendarTab.module.css';

const DURATION_OPTS = [30, 45, 60, 90, 120];

interface Props {
    onClose: () => void;
    onCreated: (ev: CalendarEvent) => void;
}

export const CreateClassModal: React.FC<Props> = ({onClose, onCreated}) => {
    const [form, setForm] = useState({studentId: '', date: toDateStr(new Date()), time: '09:00', duration: 60, type: 'EXTRA' as EventType});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudent, ] = useState<Student | null>(null);
    const [basicStudent, setBasicStudent] = useState<{ id: string; name: string } | null>(null);

    const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) => setForm(p => ({...p, [key]: val}));

    const handleSubmit = async () => {
        if (!form.studentId || !form.date || !form.time) { 
            setError('Preencha todos os campos.'); 
            return; 
        }
        setSubmitting(true);
        try {
            const payload: CreateExtraClassRequest = {
                studentId: form.studentId, 
                type: form.type, 
                date: form.date, 
                startTime: form.time + ':00', 
                durationMin: form.duration, 
                title: form.type.toString()
            };
            
            await scheduleService.createExtraClass(payload);
            onCreated({
                id: `extra-${Date.now()}`, 
                studentId: form.studentId, 
                studentName: basicStudent?.name, 
                date: form.date,
                startTime: form.time + ':00', 
                durationMin: form.duration, 
                type: form.type,
                meetLink: selectedStudent?.meetLink, 
                meetPlatform: selectedStudent?.meetPlatform,
                studentStatus: selectedStudent?.status ?? 'ACTIVE',
                levelCode: selectedStudent?.levelProfileCode ?? selectedStudent?.levelProfile?.code,
                title: EventTypeMeta[form.type].label,
            });
            Swal.fire({
                icon: 'success', 
                title: 'Aula criada!', 
                text: 'Agendamento realizado com sucesso.', 
                confirmButtonText: 'OK'
            });
        } catch (err: unknown) {
            const status = (err as any)?.response?.status;
            const message = (err as any)?.response?.data?.message || (err as any)?.response?.data?.error || (err as any)?.message;
            if (status === 400 || status === 409) Swal.fire({icon: 'warning', title: 'Atenção', text: message || 'Dados inválidos ou conflito de horário.'});
            else Swal.fire({icon: 'error', title: 'Erro', text: 'Não foi possível criar um novo agendamento.'});
        } finally { setSubmitting(false); }
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (!query || query.length < 2) { setSearchResults([]); setSearching(false); return; }
            setSearching(true);
            studentService.searchByNameOrEmail(query).then(r => setSearchResults(r)).catch(() => setSearchResults([])).finally(() => setSearching(false));
        }, 350);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.createHeader}>
                    <h3 className={styles.createTitle}>Nova Aula</h3>
                    <button type="button" className={styles.modalCloseBtn} onClick={onClose}><X size={15}/></button>
                </div>
                <div className={styles.createBody}>
                    <label className={styles.label}>Aluno</label>
                    <div className={styles.searchWrapper}>
                        <input type="text" className={styles.input} placeholder="Pesquisar por nome ou email..."
                               value={basicStudent ? basicStudent.name : query} onChange={e => { setBasicStudent(null); set('studentId', ''); setQuery(e.target.value); }}/>
                        {!selectedStudent && query.length >= 2 && (
                            <div className={styles.searchResults}>
                                {searching && <div className={styles.searching}>Buscando...</div>}
                                {!searching && searchResults.length === 0 && <div className={styles.noResults}>Nenhum resultado</div>}
                                {!searching && searchResults.map(r => (
                                    <button key={r.id} type="button" className={styles.searchItem}
                                            onClick={() => { setBasicStudent(r); set('studentId', r.id); setQuery(''); }}>{r.name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={styles.row2}>
                        <div className={styles.col}><label className={styles.label}>Data</label><input type="date" className={styles.input} value={form.date} onChange={e => set('date', e.target.value)}/></div>
                        <div className={styles.col}><label className={styles.label}>Horário</label><input type="time" className={styles.input} value={form.time} onChange={e => set('time', e.target.value)}/></div>
                    </div>
                    <label className={styles.label}>Duração</label>
                    <div className={styles.pills}>
                        {DURATION_OPTS.map(d => (
                            <button key={d} type="button" className={`${styles.pill} ${form.duration === d ? styles.pillActive : ''}`} onClick={() => set('duration', d)}>{d} min</button>
                        ))}
                    </div>
                    <label className={styles.label}>Tipo da aula</label>
                    <select className={styles.input} value={form.type} onChange={e => set('type', e.target.value as EventType)}>
                        {Object.entries(EventTypeMeta).filter(([k]) => k !== 'RECURRING').map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                    </select>
                    {selectedStudent?.meetLink && <p className={styles.infoNote}>🔗 {selectedStudent.meetPlatform === 'GOOGLE_MEET' ? 'Google Meet' : selectedStudent.meetPlatform} será usado.</p>}
                    {error && <p className={styles.formError}>{error}</p>}
                </div>
                <div className={styles.modalFooter}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                    <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>{submitting ? 'Criando...' : 'Criar aula'}</button>
                </div>
            </div>
        </div>
    );
};

