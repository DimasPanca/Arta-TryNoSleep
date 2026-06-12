'use client';

import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

const FIELD_BASE =
  'w-full rounded-xl border bg-[var(--color-surface-card)] px-4 py-3 text-[15px] ' +
  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] ' +
  'border-[var(--color-border)] outline-none transition-colors duration-200 ' +
  'focus:border-[var(--color-brand-400)] focus:ring-4 focus:ring-[var(--color-brand-100)] ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

/* ── PhoneField ─────────────────────────────────────────────── */

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function PhoneField({
  value,
  onChange,
  disabled = false,
  id = 'phone',
}: PhoneFieldProps): ReactNode {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
      >
        Nomor WhatsApp
      </label>
      <div
        className={
          'flex items-stretch overflow-hidden rounded-xl border bg-[var(--color-surface-card)] ' +
          'border-[var(--color-border)] transition-colors duration-200 ' +
          'focus-within:border-[var(--color-brand-400)] focus-within:ring-4 focus-within:ring-[var(--color-brand-100)]'
        }
      >
        <span className="flex select-none items-center gap-1.5 border-r border-[var(--color-border)] bg-[var(--color-brand-50)] px-3.5 text-[15px] font-medium text-[var(--color-brand-800)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z"
              fill="currentColor"
            />
          </svg>
          +62
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="812 3456 7890"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          className="w-full bg-transparent px-3.5 py-3 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none disabled:opacity-60"
        />
      </div>
    </div>
  );
}

/* ── TextField ──────────────────────────────────────────────── */

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  autoComplete,
  autoFocus = false,
}: TextFieldProps): ReactNode {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={FIELD_BASE}
        {...(placeholder !== undefined && { placeholder })}
        {...(autoComplete !== undefined && { autoComplete })}
      />
    </div>
  );
}

/* ── PasswordField ──────────────────────────────────────────── */

interface PasswordFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function PasswordField({
  id = 'password',
  label = 'Kata sandi',
  value,
  onChange,
  placeholder = '••••••••',
  disabled = false,
  autoComplete = 'current-password',
  autoFocus = false,
}: PasswordFieldProps): ReactNode {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${FIELD_BASE} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-brand-50)] hover:text-[var(--color-text-secondary)] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            {show ? (
              <path
                d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.4 5.2A9.4 9.4 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.4 2.5-2.9 3.8M6.1 7.1C4 8.5 2.6 10.6 2 12c1 2.5 5 7 10 7 1.2 0 2.3-.2 3.3-.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <>
                <path
                  d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── OtpInput ───────────────────────────────────────────────── */

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
}: OtpInputProps): ReactNode {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function focusAt(index: number): void {
    const el = inputs.current[index];
    if (el) el.focus();
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    const next = value.split('');
    let cursor = index;
    for (const ch of raw) {
      if (cursor >= length) break;
      next[cursor] = ch;
      cursor += 1;
    }
    onChange(next.join('').slice(0, length));
    focusAt(Math.min(cursor, length - 1));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = value.split('');
      if (next[index]) {
        next[index] = '';
        onChange(next.join(''));
      } else if (index > 0) {
        const prev = value.split('');
        prev[index - 1] = '';
        onChange(prev.join(''));
        focusAt(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusAt(Math.min(pasted.length, length - 1));
    }
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-2.5" role="group" aria-label="Kode verifikasi 6 digit">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ke-${i + 1}`}
          className={
            'h-[3.25rem] w-full min-w-0 rounded-xl border bg-[var(--color-surface-card)] py-3 text-center ' +
            'font-[var(--font-mono)] text-xl font-semibold text-[var(--color-text-primary)] ' +
            'border-[var(--color-border)] outline-none transition-all duration-200 ' +
            'focus:border-[var(--color-brand-400)] focus:ring-4 focus:ring-[var(--color-brand-100)] ' +
            'disabled:opacity-60'
          }
        />
      ))}
    </div>
  );
}

/* ── SubmitButton ───────────────────────────────────────────── */

interface SubmitButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export function SubmitButton({
  children,
  loading = false,
  disabled = false,
}: SubmitButtonProps): ReactNode {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={
        'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3.5 ' +
        'text-[15px] font-semibold text-white transition-all duration-200 ' +
        'bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] ' +
        'shadow-[0_4px_14px_-3px_rgba(58,122,58,0.5)] hover:shadow-[0_8px_24px_-5px_rgba(58,122,58,0.6)] ' +
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-brand-200)] ' +
        'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none ' +
        'cursor-pointer'
      }
    >
      {/* Kilau menyapu saat hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-arta-spin"
          />
        )}
        {children}
      </span>
    </button>
  );
}

/* ── FormAlert ──────────────────────────────────────────────── */

interface FormAlertProps {
  tone: 'error' | 'info' | 'success';
  children: ReactNode;
}

export function FormAlert({ tone, children }: FormAlertProps): ReactNode {
  const styles: Record<FormAlertProps['tone'], string> = {
    error: 'bg-[var(--color-danger-100)] text-[var(--color-danger-400)]',
    info: 'bg-[var(--color-brand-50)] text-[var(--color-brand-800)]',
    success: 'bg-[#dcfce7] text-[var(--color-grade-a)]',
  };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${styles[tone]}`}
    >
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" aria-hidden>
        {tone === 'error' ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9 7a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V7Zm1 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
            clipRule="evenodd"
          />
        ) : tone === 'success' ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM11 7a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-1 2a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0v-3a1 1 0 0 0-1-1Z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}
