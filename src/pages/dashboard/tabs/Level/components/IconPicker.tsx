import React, {useState, useRef, useEffect} from 'react';
import styles from '../LevelTab.module.css';

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

// Ícones/emojis padrão relacionados a estudos e educação
const DEFAULT_ICONS = [
    // Educação e livros
    '🎓', '📚', '📖', '📝', '✍️', '📕', '📗', '📘', '📙', '📓', '📔',
    // Ideias e conhecimento
    '💡', '🧠', '🤓', '📖', '📚', '🔬', '🔭', '🧪', '⚗️', '🧬',
    // Metas e sucesso
    '🎯', '✅', '☑️', '✔️', '👍', '💪', '🙌', '👏', '🏆', '🥇', '🥈', '🥉',
    // Troféus e reconhecimento
    '🎖️', '🏅', '👑', '✨', '💫',
    // Progresso e crescimento
    '📈', '📊', '⬆️', '🚀', '🌱', '🌿', '🌾', '🌳',
    // Atividades acadêmicas
    '🎨', '🎭', '🎬', '🎵', '🎸', '🎹', '🎤', '📝', '✏️', '🖊️', '🖍️', '🖌️',
    // Números e matemática
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '➕', '➖', '✖️', '➗',
    // Confirmação e sucesso
    '✅', '☑️', '✔️', '❌', '❓', '❗', '💯', '🎯',
    // Energia e entusiasmo
    '⚡', '🔥', '💥', '💫', '✨', '🌟', '⭐', '🌠',
    // Personagens positivos
    '😊', '😃', '😄', '😁', '🤗', '🥳', '😎', '🧑‍🎓', '👨‍🎓', '👩‍🎓',
    // Coração e motivação
    '❤️', '💚', '💙', '💛', '💜', '🧡', '💖', '💝',
    // Bônus relacionado a estudo
    '🔔', '📣', '📢', '🎁', '🎀', '🎉', '🎊', '🏃', '💼',
];


export const IconPicker: React.FC<IconPickerProps> = ({value, onChange}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Fecha o picker quando clica fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelectIcon = (icon: string) => {
        onChange(icon);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;

        if (newValue) {
            // Filtra para aceitar apenas emojis/símbolos válidos
            // Rejeita letras (a-z, A-Z), números (0-9) e caracteres especiais ASCII comuns
            let filteredValue = '';

            for (const char of newValue) {
                // Rejeita letras e números
                if (/[a-zA-Z0-9]/.test(char)) {
                    continue;
                }

                // Rejeita caracteres ASCII especiais comuns (mas mantém emojis)
                const charCode = char.charCodeAt(0);
                if (charCode < 128) {
                    continue;
                }

                filteredValue += char;
            }

            // Limita a 4 caracteres
            if (filteredValue.length <= 4) {
                onChange(filteredValue);
            }
        } else {
            onChange('');
        }
    };

    return (
        <div ref={pickerRef} style={{position: 'relative'}}>
            <div style={{position: 'relative'}}>
                <input
                    className={styles.formInput}
                    type="text"
                    placeholder="⭐"
                    maxLength={4}
                    value={value}
                    onChange={handleInputChange}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{paddingRight: '36px'}}
                />
                {/* Botão que abre o picker */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Abrir carteira de ícones"
                >
                    🎨
                </button>
            </div>

            {/* Carteira de ícones */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        marginTop: '8px',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px',
                        zIndex: 1000,
                        minWidth: '280px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 1fr)',
                            gap: '8px',
                        }}
                    >
                        {DEFAULT_ICONS.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => handleSelectIcon(icon)}
                                style={{
                                    background: value === icon ? 'var(--color-accent)' : 'var(--color-bg-input)',
                                    border: value === icon ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '8px',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '40px',
                                }}
                                title={icon}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};




