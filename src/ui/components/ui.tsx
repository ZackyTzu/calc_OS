import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { Compat } from '../../lib/library/compat';
import { Octicon } from './Octicon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'md' | 'sm';

function btnClass(variant: Variant, size: Size, className: string) {
  const v = variant === 'secondary' || variant === 'outline' ? '' : `btn-${variant}`;
  return `btn ${v} ${size === 'sm' ? 'btn-sm' : ''} ${className}`;
}

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`card ${className}`}>{children}</div>;
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} {...props} className={btnClass(variant, size, className)} />;
}

/** A router link styled as a button. Use instead of nesting a Button inside a Link. */
export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={btnClass(variant, size, className)} />;
}

/** A blue link with a trailing chevron. */
export function MoreLink({ className = '', children, ...props }: LinkProps) {
  return (
    <Link {...props} className={`inline-flex items-center gap-1 text-blue hover:underline ${className}`}>
      {children}
      <Octicon name="ChevronRight" size={12} />
    </Link>
  );
}

const TONES = { slate: '', green: 'Label--success', amber: 'Label--attention', red: 'Label--danger', blue: 'Label--accent' } as const;

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`Label ${TONES[tone]}`}>{children}</span>;
}

export function CompatBadge({ compat }: { compat: Compat }) {
  const tone = { ok: 'green', warn: 'amber', blocked: 'red', unknown: 'blue' }[compat.level] as keyof typeof TONES;
  return <Badge tone={tone}>{compat.title}</Badge>;
}

export function ErrorBox({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div role="alert" className="enter flash flash-error flex gap-3">
      <Octicon name="Alert" className="mt-0.5 text-red" />
      <span className="flex-1 break-words">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="text-muted hover:text-ink">
          <Octicon name="X" />
        </button>
      )}
    </div>
  );
}

/** A short confirmation that appears after an action completed. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="enter flash flash-success flex gap-2">
      <Octicon name="Check" className="mt-0.5 text-green" />
      <span>{children}</span>
    </p>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin [animation-duration:600ms] motion-reduce:animate-none ${className}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Progress({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className={`h-2 rounded-md bg-neutral-muted overflow-hidden ${className}`}
    >
      <div className="h-full bg-green-button origin-left transition-transform duration-200 ease-linear" style={{ transform: `scaleX(${fraction})` }} />
    </div>
  );
}

/**
 * Two-step destructive button: the first click arms it, the second confirms.
 * It disarms on Cancel or after a few seconds, so a stray click never deletes anything.
 */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled, className = '' }: { label: string; confirmLabel: string; onConfirm: () => void; disabled?: boolean; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed) {
    return (
      <button type="button" className={`text-red hover:underline disabled:opacity-40 disabled:no-underline ${className}`} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="enter inline-flex items-center gap-2">
      <Button variant="danger" size="sm" onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</Button>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>Cancel</Button>
    </span>
  );
}
