import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { Compat } from '../../lib/library/compat';
import { CloseIcon } from './Icon';

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>{children}</div>;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100',
    danger: 'bg-rose-700/80 hover:bg-rose-600 text-white',
    ghost: 'hover:bg-slate-800 text-slate-300',
  }[variant];
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const t = {
    slate: 'bg-slate-800 text-slate-300',
    green: 'bg-emerald-900/60 text-emerald-300',
    amber: 'bg-amber-900/50 text-amber-200',
    red: 'bg-rose-900/60 text-rose-200',
    blue: 'bg-sky-900/60 text-sky-200',
  }[tone];
  return <span className={`inline-block text-xs px-2 py-0.5 rounded ${t}`}>{children}</span>;
}

export function CompatBadge({ compat }: { compat: Compat }) {
  const tone = { ok: 'green', warn: 'amber', blocked: 'red', unknown: 'blue' }[compat.level] as 'green' | 'amber' | 'red' | 'blue';
  return <Badge tone={tone}>{compat.title}</Badge>;
}

export function ErrorBox({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="rounded-lg border border-rose-800 bg-rose-950/50 text-rose-100 text-sm p-3 flex gap-3">
      <span className="flex-1 break-words">{message}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="text-rose-300 hover:text-white">
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
