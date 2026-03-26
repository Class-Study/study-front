import React, { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import styles from './StudentCredentialsModal.module.css';

interface StudentCredentialsModalProps {
  email: string;
  password: string;
  onClose: () => void;
}

export const StudentCredentialsModal: React.FC<StudentCredentialsModalProps> = ({
  email,
  password,
  onClose,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copyToClipboard = async (text: string, type: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  const copyBoth = async () => {
    await copyToClipboard(`E-mail: ${email}\nSenha: ${password}`, 'password');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <KeyRound size={28} />
        </div>

        <h2 className={styles.title}>Aluno cadastrado!</h2>
        <p className={styles.subtitle}>
          Compartilhe as credenciais de acesso com o aluno.<br />
          A senha é <strong>provisória</strong> e deve ser trocada no primeiro acesso.
        </p>

        <div className={styles.credentialBlock}>
          <label className={styles.credLabel}>E-mail</label>
          <div className={styles.credRow}>
            <span className={styles.credValue}>{email}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyToClipboard(email, 'email')}
              title="Copiar e-mail"
            >
              {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className={styles.credentialBlock}>
          <label className={styles.credLabel}>Senha provisória</label>
          <div className={styles.credRow}>
            <span className={`${styles.credValue} ${styles.password}`}>{password}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyToClipboard(password, 'password')}
              title="Copiar senha"
            >
              {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <button type="button" className={styles.copyAllBtn} onClick={copyBoth}>
          {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
          Copiar e-mail e senha
        </button>

        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Concluir
        </button>
      </div>
    </div>
  );
};

